import { NPC } from '../entities/NPC.js';
import { VILLAGE_CONFIG } from '@data/villageConfig.js';

/**
 * @file NPCManager.js
 * Crea un NPC umano per ogni abitante di villageConfig.js che ha un
 * blocco `npc` (la casa della player, senza `npc`, viene saltata) nella
 * posizione corrispondente dell'Object Layer "npcs" del TMJ.
 *
 * Gestisce anche il tasto di interazione (E): alla pressione, avvia il
 * dialogo con l'NPC più vicino in raggio, se presente.
 *
 * @module managers/NPCManager
 */

/** Tasto per avviare/avanzare un dialogo con l'NPC vicino. */
const INTERACT_KEY = 'E';

export class NPCManager {
  /**
   * @param {Phaser.Scene}            scene
   * @param {Phaser.Tilemaps.Tilemap} map
   */
  constructor(scene, map) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {NPC[]} */
    this._npcs = [];

    /** @type {NPC|null} NPC più vicino attualmente in raggio di interazione. */
    this._nearestInRange = null;

    const npcsLayer = map.getObjectLayer('npcs');
    if (!npcsLayer) {
      console.warn('[NPCManager] Object Layer "npcs" non trovato nel TMJ: nessun NPC umano verrà creato.');
    }

    for (const inhabitant of VILLAGE_CONFIG.inhabitants) {
      if (!inhabitant.npc) continue; // case senza NPC dialogante (es. quella della player)

      const point = npcsLayer?.objects.find((o) => o.name === inhabitant.id);
      if (!point) {
        console.warn(`[NPCManager] Nessun punto "${inhabitant.id}" nel layer "npcs" — NPC non creato.`);
        continue;
      }

      this._npcs.push(new NPC(scene, point.x, point.y, inhabitant));
    }

    this._handleInteractKey = this._handleInteractKey.bind(this);
    scene.input.keyboard.on(`keydown-${INTERACT_KEY}`, this._handleInteractKey);
  }

  /**
   * Aggiorna movimento, prossimità e animazione di ogni NPC. Chiamare da
   * `scene.update()` ogni frame.
   * @param {number} playerX
   * @param {number} playerY
   * @param {number} delta ms dall'ultimo frame
   * @returns {void}
   */
  update(playerX, playerY, delta) {
    this._nearestInRange = null;
    for (const npc of this._npcs) {
      npc.update(delta);
      if (npc.updateProximity(playerX, playerY)) {
        this._nearestInRange = npc;
      }
    }
  }

  /**
   * Rimuove il listener tastiera e distrugge tutti gli NPC.
   * Chiamare da `scene.shutdown()`.
   * @returns {void}
   */
  destroy() {
    this.scene.input.keyboard.off(`keydown-${INTERACT_KEY}`, this._handleInteractKey);
    for (const npc of this._npcs) npc.destroy();
    this._npcs = [];
  }

  /** @private */
  _handleInteractKey() {
    this._nearestInRange?.interact();
  }
}
