import { createCollectible } from '../entities/CollectibleItem.js';
import { SeededRandom } from '../generators/PRNG.js';
import { emitToReact } from '../utils/phaserBridge.js';

/**
 * @file ItemManager.js
 * Missione giornaliera + spawn dei collezionabili (fiori, conchiglie,
 * frutti, funghi) sugli slot definiti negli Object Layer di Tiled
 * ('flowers', 'shells', 'fruits', 'mushrooms').
 *
 * Ogni nuovo giorno (data del dispositivo):
 * - viene scelta una missione (tipo oggetto + quantità) in modo
 *   deterministico dalla data, così resta identica per tutto il giorno
 *   anche ricaricando la pagina;
 * - ogni slot spawna con probabilità SPAWN_CHANCE, garantendo comunque
 *   un minimo di oggetti del tipo missione sufficiente a completarla;
 * - il progresso (oggetti già raccolti oggi) è salvato in localStorage
 *   per data, quindi un oggetto raccolto resta raccolto per il resto
 *   della giornata anche dopo un refresh.
 *
 * @module managers/ItemManager
 */

/** Nomi degli Object Layer Tiled usati come slot di spawn. */
const SLOT_LAYER_NAMES = ['flowers', 'shells', 'fruits', 'mushrooms'];

/** Tipo di fallback per oggetto Tiled senza `type` valorizzato. */
const SINGULAR_TYPE = {
  flowers:   'flower',
  shells:    'shell',
  fruits:    'fruit',
  mushrooms: 'mushroom',
};

/** Probabilità che un singolo slot spawni oggi. */
const SPAWN_CHANCE = 0.8;

/** Quantità minima/massima richiesta dalla missione del giorno. */
const MIN_MISSION_AMOUNT = 3;
const MAX_MISSION_AMOUNT = 6;

/** Raggio di raccolta (px mappa) attorno al player. */
const PICKUP_RADIUS = 18;

/**
 * Chiave data locale (YYYY-MM-DD) del dispositivo — non UTC, per evitare
 * che la missione cambi a mezzanotte UTC invece che a mezzanotte locale.
 * @returns {string}
 */
function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Hash semplice stringa → intero uint32, usato come seed del PRNG
 * giornaliero (stessa data = stesso seed = stessa missione/spawn).
 * @param {string} str
 * @returns {number}
 */
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export class ItemManager {
  /**
   * @param {Phaser.Scene}             scene
   * @param {Phaser.Tilemaps.Tilemap}  map
   */
  constructor(scene, map) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {string} */
    this.dateKey = todayKey();

    /** @type {string} */
    this.storageKey = `villaggio_magico_items_${this.dateKey}`;

    /** @type {Map<number, (CollectibleFruit|CollectibleEmoji)>} */
    this._active = new Map();

    const saved = this._loadSavedState();

    /** @type {string|null} Tipo oggetto richiesto dalla missione di oggi. */
    this.missionType = saved?.missionType ?? null;

    /** @type {number|null} Quantità richiesta dalla missione di oggi. */
    this.missionAmount = saved?.missionAmount ?? null;

    /** @type {Set<number>} Id (Tiled) degli oggetti già raccolti oggi. */
    this.collectedIds = new Set(saved?.collectedIds ?? []);

    /** @type {Array<{id:number, type:string, x:number, y:number}>} */
    this._slots = this._collectSlots(map);

    /** @type {Map<number, {id:number, type:string, x:number, y:number}>} */
    this._slotById = new Map(this._slots.map((s) => [s.id, s]));

    this._rollMissionAndSpawn();
    this._emitProgress();
  }

  // ─────────────────────────────────────────────────────────────────
  // API pubblica
  // ─────────────────────────────────────────────────────────────────

  /**
   * Controlla se il player è abbastanza vicino a un collezionabile attivo
   * e, in caso, lo raccoglie. Chiamare da `scene.update()` ogni frame.
   *
   * @param {number} playerX
   * @param {number} playerY
   * @returns {void}
   */
  update(playerX, playerY) {
    if (this._active.size === 0) return;

    for (const [id, item] of this._active) {
      const dx = item.x - playerX;
      const dy = item.y - playerY;
      if (dx * dx + dy * dy <= PICKUP_RADIUS * PICKUP_RADIUS) {
        this._collect(id, item);
      }
    }
  }

  /**
   * Distrugge tutti i collezionabili ancora attivi (senza raccoglierli).
   * Chiamare da `scene.shutdown()`.
   * @returns {void}
   */
  destroy() {
    for (const item of this._active.values()) item.destroy();
    this._active.clear();
  }

  // ─────────────────────────────────────────────────────────────────
  // Privato — missione + spawn
  // ─────────────────────────────────────────────────────────────────

  /**
   * Legge gli Object Layer di Tiled e appiattisce tutti gli slot in un
   * unico array ordinato per id (ordine stabile, necessario perché il
   * PRNG giornaliero venga consumato sempre nello stesso modo).
   *
   * @param {Phaser.Tilemaps.Tilemap} map
   * @returns {Array<{id:number, type:string, x:number, y:number}>}
   * @private
   */
  _collectSlots(map) {
    const slots = [];

    for (const layerName of SLOT_LAYER_NAMES) {
      const layer = map.getObjectLayer(layerName);
      if (!layer) continue;

      for (const obj of layer.objects) {
        slots.push({
          id:   obj.id,
          type: obj.type || SINGULAR_TYPE[layerName],
          x:    obj.x + (obj.width  ?? 0) / 2,
          y:    obj.y + (obj.height ?? 0) / 2,
        });
      }
    }

    slots.sort((a, b) => a.id - b.id);
    return slots;
  }

  /**
   * Determina (o ricarica) la missione del giorno e decide quali slot
   * spawnano, garantendo il minimo necessario per completarla. Crea un
   * collezionabile (Sprite per frutti, Text per emoji) per ogni slot
   * attivo non ancora raccolto oggi.
   * @private
   */
  _rollMissionAndSpawn() {
    if (this._slots.length === 0) return;

    const types = [...new Set(this._slots.map((s) => s.type))].sort();
    const rng   = new SeededRandom(hashSeed(this.dateKey));

    // NB: consumiamo sempre gli stessi valori dal PRNG, anche se la
    // missione è già salvata, per mantenere l'ordine deterministico
    // dei tiri successivi (spawn degli slot) identico tra un reload e l'altro.
    const rolledType   = rng.nextFrom(types);
    const rolledAmount = rng.nextInt(MIN_MISSION_AMOUNT, MAX_MISSION_AMOUNT);

    if (this.missionType == null) this.missionType = rolledType;

    const availableOfType = this._slots.filter((s) => s.type === this.missionType).length;
    if (this.missionAmount == null) {
      this.missionAmount = Math.min(rolledAmount, Math.max(1, availableOfType));
    }

    const activeSlots = this._slots.filter(() => rng.next() < SPAWN_CHANCE);

    // Garantisce il minimo di oggetti missione anche se il tiro all'80% non basta.
    const missionActiveCount = activeSlots.filter((s) => s.type === this.missionType).length;
    if (missionActiveCount < this.missionAmount) {
      const activeIds = new Set(activeSlots.map((s) => s.id));
      const reserve = this._slots.filter((s) => s.type === this.missionType && !activeIds.has(s.id));
      activeSlots.push(...reserve.slice(0, this.missionAmount - missionActiveCount));
    }

    for (const slot of activeSlots) {
      if (this.collectedIds.has(slot.id)) continue; // già raccolto oggi
      const item = createCollectible(this.scene, slot.x, slot.y, slot.type, slot.id);
      this._active.set(slot.id, item);
    }

    this._saveState();
  }

  /**
   * @param {number} id
   * @param {CollectibleItem} item
   * @private
   */
  _collect(id, item) {
    item.collect();
    this._active.delete(id);
    this.collectedIds.add(id);
    this._saveState();
    this._emitProgress();

    // Notifica il sistema quest (QuestManager) della raccolta.
    // Evento generico sul bridge: nessun accoppiamento diretto.
    emitToReact('item:collected', { type: item.type });
  }

  // ─────────────────────────────────────────────────────────────────
  // Privato — persistenza + bridge React
  // ─────────────────────────────────────────────────────────────────

  /**
   * @returns {{missionType: string, missionAmount: number, collectedIds: number[]}|null}
   * @private
   */
  _loadSavedState() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[ItemManager] Stato non leggibile, riparto da zero.', e);
      return null;
    }
  }

  /** @private */
  _saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        missionType:   this.missionType,
        missionAmount: this.missionAmount,
        collectedIds:  [...this.collectedIds],
      }));
    } catch (e) {
      console.warn('[ItemManager] Impossibile salvare il progresso.', e);
    }
  }

  /**
   * Emette il progresso della missione del giorno verso React
   * (es. per un futuro contatore in HUD).
   * @private
   */
  _emitProgress() {
    const collected = [...this.collectedIds]
      .filter((id) => this._slotById.get(id)?.type === this.missionType)
      .length;

    emitToReact('quest:dailyProgress', {
      type:      this.missionType,
      collected,
      target:    this.missionAmount,
      complete:  this.missionType != null && collected >= this.missionAmount,
    });
  }
}
