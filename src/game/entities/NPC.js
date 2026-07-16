import Phaser from 'phaser';
import { getNextNpcDialog } from '@api/dialogueAI.js';
import { emitToReact } from '../utils/phaserBridge.js';
import { usePlayerStore } from '@store/usePlayerStore.js';
import { getIdleFrame } from '../utils/characterSpriteLayout.js';
import { moveWithCollision } from '../utils/mapCollision.js';

/**
 * @file NPC.js
 * NPC umano presso una casa del villaggio. Nessuno sprite dedicato è
 * disponibile: viene riusato lo spritesheet del player (frame idle) con
 * un tint colorato (da villageConfig.inhabitants[].color) per distinguere
 * ogni abitante, più un'etichetta col nome sopra la testa.
 *
 * Il movimento è cinematico (this.x/this.y, velocità in px/s scalate col
 * delta) — nessun corpo dinamico Matter: i corpi dinamici col frictionAir
 * alto lasciavano gli NPC praticamente immobili e li facevano rimbalzare a
 * ogni contatto. I muri del layer "collision" sono rispettati tramite
 * mapCollision.js.
 *
 * Quando la giocatrice si avvicina, mostra un fumetto "premi E per
 * parlare"; alla pressione del tasto genera un breve dialogo in italiano
 * tramite Claude (src/api/claude.js) e lo inoltra a React via il bridge
 * window ('dialog:open'), che DialogBox.jsx già ascolta.
 *
 * @module entities/NPC
 */

/** Mappa nome colore (villageConfig) → tint esadecimale. */
const COLOR_TINT = {
  pink:   0xf48fb1,
  blue:   0x64b5f6,
  yellow: 0xffd54f,
  green:  0x81c784,
  purple: 0xba68c8,
  orange: 0xffb74d,
};

/** Raggio (px mappa) entro cui compare il fumetto "premi E". */
const INTERACT_RADIUS = 40;

/** Raggio (px mappa) entro cui un NPC umano vagabonda dalla sua posizione di spawn. */
const NPC_WANDER_RADIUS = 120;
/** Velocità (px/s) durante il vagabondare. */
const NPC_WANDER_SPEED = 45;
/** Distanza (px) sotto cui l'NPC considera raggiunta la meta. */
const NPC_ARRIVE_DIST = 8;
/** Intervallo min/max (ms) tra una meta di vagabondaggio e la successiva. */
const NPC_WANDER_PAUSE_MS = [2000, 5000];

/** Semi-larghezza/semi-altezza della box di collisione dell'NPC (px). */
const NPC_HALF_W = 7;
const NPC_HALF_H = 5;
/** Offset verticale della box rispetto al centro dello sprite (i piedi). */
const NPC_FOOT_OFFSET_Y = 8;

export class NPC extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {import('@data/villageConfig.js').VILLAGE_CONFIG['inhabitants'][number]} inhabitant
   */
  constructor(scene, x, y, inhabitant) {
    super(scene, x, y);

    /** @type {string} */
    this.id = inhabitant.id;
    /** @type {string} */
    this.residentName = inhabitant.residentName;
    /** @type {string} */
    this.personality = inhabitant.npc?.personality ?? 'gentile e cordiale';
    /** @type {string} */
    this.catchphrase = inhabitant.npc?.catchphrase ?? '';

    /** true mentre è in corso una richiesta di dialogo (evita doppie chiamate). */
    this._busy = false;

    /**
     * true dopo destroy() o dopo che Phaser ha distrutto questo Container
     * (es. shutdown della scena). Ogni metodo di update esce subito se true.
     * @type {boolean}
     */
    this._destroyed = false;

    // Posizione di spawn: punto attorno cui l'NPC vagabonderà
    this._homeX = x;
    this._homeY = y;
    this._facing = 'down';
    this._wanderTarget = null;
    this._wanderWaitUntil = 0;

    // Usa lo spritesheet dedicato (villageConfig.spriteKey) se presente;
    // altrimenti ricade sullo spritesheet del player tinto col colore
    // dell'abitante, e in ultima istanza su un rettangolo grigio.
    const spriteKey = inhabitant.spriteKey;
    const hasOwnSprite = spriteKey && scene.textures.exists(spriteKey);
    this._animKey = hasOwnSprite ? spriteKey : null;
    this._usesPlayerFallback = !hasOwnSprite && scene.textures.exists('player');

    let sprite;
    if (hasOwnSprite) {
      sprite = scene.add.sprite(0, 0, spriteKey, 1);
      const idleKey = `${spriteKey}_idle`;
      if (scene.anims.exists(idleKey)) sprite.play(idleKey);
    } else if (scene.textures.exists('player')) {
      sprite = scene.add.sprite(0, 0, 'player', 1);
      sprite.setTint(COLOR_TINT[inhabitant.color] ?? 0xffffff);
    } else {
      sprite = scene.add.rectangle(0, 0, 20, 24, 0xcccccc);
    }
    /** @type {Phaser.GameObjects.Sprite|Phaser.GameObjects.Rectangle} */
    this._sprite = sprite;

    const nameTag = scene.add.text(0, -22, inhabitant.residentName, {
      fontSize:   '10px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      color:      '#4a3728',
      backgroundColor: 'rgba(255,255,255,0.75)',
      padding:    { x: 4, y: 1 },
    }).setOrigin(0.5);

    /** @type {Phaser.GameObjects.Text} Fumetto interazione, nascosto finché non si è vicini. */
    this._prompt = scene.add.text(0, -36, 'premi E 💬', {
      fontSize:   '9px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      color:      '#ffffff',
      backgroundColor: '#4a3728',
      padding:    { x: 4, y: 2 },
    }).setOrigin(0.5).setVisible(false);

    this.add([sprite, nameTag, this._prompt]);
    this.setDepth(161);

    scene.add.existing(this);

    // Se la scena viene chiusa/riavviata, Phaser distrugge il Container e i
    // figli: marchiamo l'NPC come morto così update()/updateProximity()
    // smettono di toccare sprite già distrutti (anims === undefined).
    this.once(Phaser.GameObjects.Events.DESTROY, () => { this._destroyed = true; });
  }

  /**
   * true se questo NPC (o il suo sprite) è stato distrutto da Phaser.
   * @returns {boolean}
   */
  get isDestroyed() {
    return this._destroyed || !this.scene || !this._sprite || !this._sprite.scene;
  }

  /**
   * Aggiorna vagabondaggio, profondità e animazione.
   * Va chiamato da NPCManager ogni frame.
   * @param {number} delta ms dall'ultimo frame
   */
  update(delta) {
    if (this.isDestroyed) return;

    this.setDepth(this.y + 161);

    // Se sta parlando, resta fermo
    if (this._busy) {
      this._playIdle();
      return;
    }

    this._updateWander(delta);
  }

  /** @private */
  _updateWander(delta) {
    if (this.isDestroyed || !this.scene?.time) return;

    const now = this.scene.time.now;

    if (!this._wanderTarget && now >= this._wanderWaitUntil) {
      this._pickNewWanderTarget();
    }

    if (!this._wanderTarget) {
      this._playIdle();
      return;
    }

    const dx = this._wanderTarget.x - this.x;
    const dy = this._wanderTarget.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= NPC_ARRIVE_DIST) {
      this._wanderTarget = null;
      this._wanderWaitUntil = now + Phaser.Math.Between(NPC_WANDER_PAUSE_MS[0], NPC_WANDER_PAUSE_MS[1]);
      this._playIdle();
      return;
    }

    const step = NPC_WANDER_SPEED * (delta / 1000);
    const ratio = Math.min(step / dist, 1);
    const blocked = moveWithCollision(
      this.scene,
      this,
      dx * ratio,
      dy * ratio,
      NPC_HALF_W,
      NPC_HALF_H,
      NPC_FOOT_OFFSET_Y,
    );

    // Muro sulla strada: meta irraggiungibile, se ne sceglie un'altra dopo
    // una breve pausa invece di restare incastrato contro il muro.
    if (blocked) {
      this._wanderTarget = null;
      this._wanderWaitUntil = now + Phaser.Math.Between(400, 1200);
      this._playIdle();
      return;
    }

    const facing = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');
    this._playWalk(facing);
  }

  /** @private */
  _pickNewWanderTarget() {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.FloatBetween(NPC_WANDER_RADIUS * 0.3, NPC_WANDER_RADIUS);
    this._wanderTarget = {
      x: this._homeX + Math.cos(angle) * radius,
      y: this._homeY + Math.sin(angle) * radius,
    };
  }

  /**
   * @private
   * @returns {boolean} true se _sprite è uno Sprite vivo con il component anims.
   */
  _canAnimate() {
    return !this.isDestroyed && !!this._sprite?.anims && !!this.scene?.anims;
  }

  /** @private */
  _playWalk(facing) {
    this._facing = facing;
    if (!this._canAnimate()) return;

    if (this._animKey) {
      const key = `${this._animKey}_walk_${facing}`;
      if (this.scene.anims.exists(key)) this._sprite.play(key, true);
    } else if (this._usesPlayerFallback) {
      const key = `walk_${facing}`;
      if (this.scene.anims.exists(key)) this._sprite.play(key, true);
    }
  }

  /** @private */
  _playIdle(facing = this._facing) {
    this._facing = facing;
    if (!this._canAnimate()) return;

    if (this._animKey) {
      this._sprite.anims.stop();
      this._sprite.setFrame(getIdleFrame(this._animKey, facing));
    } else if (this._usesPlayerFallback) {
      const idleFrameByFacing = { down: 1, left: 4, right: 7, up: 10 };
      this._sprite.anims.stop();
      this._sprite.setFrame(idleFrameByFacing[facing] ?? 1);
    }
  }

  /**
   * Aggiorna la visibilità del fumetto "premi E" in base alla distanza
   * dalla giocatrice. Va chiamato da NPCManager ogni frame.
   *
   * @param {number} playerX
   * @param {number} playerY
   * @returns {boolean} true se la giocatrice è in raggio di interazione.
   */
  updateProximity(playerX, playerY) {
    if (this.isDestroyed || !this._prompt?.scene) return false;

    const dx = this.x - playerX;
    const dy = this.y - playerY;
    const inRange = (dx * dx + dy * dy) <= INTERACT_RADIUS * INTERACT_RADIUS;
    this._prompt.setVisible(inRange && !this._busy);
    return inRange;
  }

  /**
   * Genera un dialogo (Claude, con fallback offline) e lo apre in DialogBox
   * tramite il bridge Phaser → React. Non fa nulla se una richiesta è già
   * in corso.
   * @returns {Promise<void>}
   */
  async interact() {
    if (this._busy || this.isDestroyed) return;
    this._busy = true;
    this._prompt?.setVisible(false);

    try {
      // ── 1. Sistema quest: completamenti, avanzamenti o nuove offerte ──
      // Se il QuestManager ha qualcosa da dire (offerta/completamento),
      // il suo dialogo ha priorità sul dialogo normale.
      const questLines = this.scene?.questManager?.onNpcTalk(this.id) ?? null;
      if (questLines) {
        emitToReact('dialog:open', { npcKey: this.id, npcName: this.residentName, messages: questLines });
        return;
      }

      // ── 2. Dialogo normale: pool pre-scritto, poi AI gratuita ──
      const { name: playerName, season } = usePlayerStore.getState();

      const questHint = this.scene?.questManager?.getHintForNpc(this.id) ?? '';
      const catchHint = this.catchphrase
        ? `Frase preferita di ${this.residentName}: "${this.catchphrase}". `
        : '';

      const lines = await getNextNpcDialog({
        npcId:      this.id,
        npcName:    this.residentName,
        playerName,
        season,
        context: `${catchHint}${questHint}`.trim(),
      });

      // La scena potrebbe essere cambiata durante l'await
      if (this.isDestroyed) return;

      emitToReact('dialog:open', { npcKey: this.id, npcName: this.residentName, messages: lines });
    } finally {
      this._busy = false;
    }
  }

  destroy(fromScene) {
    this._destroyed = true;
    this._wanderTarget = null;
    super.destroy(fromScene);
    this._sprite = null;
    this._prompt = null;
  }
}