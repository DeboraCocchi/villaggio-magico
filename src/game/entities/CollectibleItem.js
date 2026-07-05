import Phaser from 'phaser';

/**
 * @file CollectibleItem.js
 * Oggetto collezionabile (fiore, conchiglia, frutto, fungo) piazzato da
 * ItemManager su uno slot dell'Object Layer di Tiled.
 * - Frutti: usano sprite da mission_fruits.png (16×16, 4 frutti diversi)
 * - Altri (fiori, conchiglie, funghi): usano emoji su Text
 *
 * @module entities/CollectibleItem
 */

/** Emoji mostrata per ogni tipo di collezionabile (non-frutto). */
const TYPE_EMOJI = {
  flower:   '🌸',
  shell:    '🐚',
  mushroom: '🍄',
};

/** Mappa nome frutto → frame in mission_fruits.png */
const FRUIT_FRAME = {
  arancia: 0,
  mela:    1,
  pesca:   2,
  pera:    3,
};

const DEPTH = 10;
const TWEEN_DURATION = 300;

/**
 * Factory function: crea il collezionabile giusto (Sprite o Text).
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} type - 'flower'|'shell'|'mushroom'|'arancia'|'mela'|'pesca'|'pera'|'fruit'
 * @param {number} slotId
 * @returns {CollectibleFruit|CollectibleEmoji}
 */
export function createCollectible(scene, x, y, type, slotId) {
  return type in FRUIT_FRAME || type === 'fruit'
    ? new CollectibleFruit(scene, x, y, type, slotId)
    : new CollectibleEmoji(scene, x, y, type, slotId);
}

/**
 * @extends {Phaser.GameObjects.Sprite}
 */
class CollectibleFruit extends Phaser.GameObjects.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} type - 'arancia'|'mela'|'pesca'|'pera'|'fruit' (casuale)
   * @param {number} slotId
   */
  constructor(scene, x, y, type, slotId) {
    // Se type è un nome specifico di frutto, usa il frame associato.
    // Altrimenti scegli un frame casuale tra i 4 disponibili.
    const frameIndex = type in FRUIT_FRAME
      ? FRUIT_FRAME[type]
      : Math.floor(Math.random() * 4);

    super(scene, x, y, 'mission_fruits', frameIndex);

    /** @type {string} */
    this.type = type;

    /** @type {number} */
    this.slotId = slotId;

    this.setOrigin(0.5)
      .setDepth(DEPTH)
      .setScale(2); // Ingrandisci il frutto piccolo (14×27)

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
      scale:    2,
      duration: TWEEN_DURATION,
      ease:     'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}

/**
 * @extends {Phaser.GameObjects.Text}
 */
class CollectibleEmoji extends Phaser.GameObjects.Text {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} type - 'flower'|'shell'|'mushroom'
   * @param {number} slotId
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
      duration: TWEEN_DURATION,
      ease:     'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
