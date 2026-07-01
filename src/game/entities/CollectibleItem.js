import Phaser from 'phaser';

/**
 * @file CollectibleItem.js
 * Oggetto collezionabile (fiore, conchiglia, frutto, fungo) piazzato da
 * ItemManager su uno slot dell'Object Layer di Tiled. Renderizzato come
 * emoji (nessuno sprite dedicato disponibile) su un Text di Phaser.
 *
 * @module entities/CollectibleItem
 */

/** Emoji mostrata per ogni tipo di collezionabile. */
const TYPE_EMOJI = {
  flower:   '🌸',
  shell:    '🐚',
  fruit:    '🍎',
  mushroom: '🍄',
};

const DEPTH = 5;

/**
 * @extends {Phaser.GameObjects.Text}
 */
export class CollectibleItem extends Phaser.GameObjects.Text {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} type  - 'flower'|'shell'|'fruit'|'mushroom'.
   * @param {number} slotId - id dell'oggetto Tiled di origine (per il salvataggio del progresso).
   */
  constructor(scene, x, y, type, slotId) {
    super(scene, x, y, TYPE_EMOJI[type] ?? '❔', { fontSize: '18px' });

    /** @type {string} */
    this.type = type;

    /** @type {number} */
    this.slotId = slotId;

    this.setOrigin(0.5)
      .setDepth(DEPTH);

    scene.add.existing(this);
  }

  /**
   * Anima la raccolta (salto + fade) e distrugge lo sprite al termine.
   * @returns {void}
   */
  collect() {
    this.scene.tweens.add({
      targets:  this,
      y:        this.y - 14,
      alpha:    0,
      scale:    1.4,
      duration: 300,
      ease:     'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
