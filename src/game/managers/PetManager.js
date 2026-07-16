import { Pet } from '../entities/Pet.js';
import { VILLAGE_CONFIG } from '@data/villageConfig.js';

/**
 * @file PetManager.js
 * Crea un Pet per ogni voce `pet` di villageConfig.js:
 *  - i pet degli abitanti (`inhabitants[].pet`, es. Robby/Corrado presso
 *    Nonno Daniele, Blue presso Zia Debora) vengono ancorati al punto
 *    omonimo dell'Object Layer "npcs" del TMJ e vagabondano lì intorno.
 *  - il pet della player (`player.pet`) segue invece la giocatrice ovunque
 *    si muova.
 *
 * @module managers/PetManager
 */

/** Offset (px) applicato a pet multipli ancorati allo stesso punto, per non nascerli sovrapposti. */
const SIBLING_OFFSET_PX = 18;

export class PetManager {
  /**
   * @param {Phaser.Scene}            scene
   * @param {Phaser.Tilemaps.Tilemap} map
   * @param {Phaser.GameObjects.GameObject} player Sprite/corpo della giocatrice (per lo spawn iniziale del pet al seguito).
   */
  constructor(scene, map, player) {
    /** @type {Pet[]} */
    this._pets = [];

    const npcsLayer = map.getObjectLayer('npcs');

    for (const inhabitant of VILLAGE_CONFIG.inhabitants) {
      const petConfigs = inhabitant.pet ?? [];
      if (petConfigs.length === 0) continue;

      const anchorPoint = npcsLayer?.objects.find((o) => o.name === inhabitant.id);
      if (!anchorPoint) {
        console.warn(`[PetManager] Nessun punto "${inhabitant.id}" nel layer "npcs" — pet non creati per questo abitante.`);
        continue;
      }

      petConfigs.forEach((petConfig, i) => {
        const spawnX = anchorPoint.x + (i - (petConfigs.length - 1) / 2) * SIBLING_OFFSET_PX;
        const spawnY = anchorPoint.y;
        this._pets.push(new Pet(scene, spawnX, spawnY, petConfig, { x: anchorPoint.x, y: anchorPoint.y }));
      });
    }

    // ── Pet della player: segue Cecilia ovunque ──────────────────────
    const playerPetConfig = VILLAGE_CONFIG.player.pet;
    if (playerPetConfig && player) {
      this._pets.push(new Pet(
        scene,
        player.x + SIBLING_OFFSET_PX,
        player.y,
        playerPetConfig,
        { x: player.x, y: player.y },
      ));
    }
  }

  /**
   * Aggiorna il movimento di tutti i pet. Chiamare da `scene.update()` ogni frame.
   * @param {number} playerX
   * @param {number} playerY
   * @param {number} delta ms dall'ultimo frame.
   * @param {'down'|'left'|'right'|'up'} [playerFacing]
   * @returns {void}
   */
   update(playerX, playerY, delta, playerFacing) {
    // Scarta i pet distrutti da uno shutdown/restart della scena
    if (this._pets.some((pet) => pet.isDestroyed)) {
      this._pets = this._pets.filter((pet) => !pet.isDestroyed);
    }

    for (const pet of this._pets) {
      pet.update(delta, playerX, playerY, playerFacing);
    }
  }

  /**
   * Distrugge tutti i pet. Chiamare da `scene.shutdown()`.
   * @returns {void}
   */
  destroy() {
    for (const pet of this._pets) pet.destroy();
    this._pets = [];
  }
}
