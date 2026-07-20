import Phaser from 'phaser'

const TILE = 32
const TILES_ON_SHORT_SIDE = 12 // 768/(12*32)=2 → tablet landscape = zoom 2

/**
 * Zoom responsivo: scala sul lato corto del viewport, clampato tra il
 * valore telefono (~1.5) e quello tablet (2), che resta la reference.
 *
 * @param {Phaser.Scale.ScaleManager} scale
 * @returns {number}
 */
export function computeZoom(scale) {
  const shortSide = Math.min(scale.width, scale.height)
  return Phaser.Math.Clamp(shortSide / (TILES_ON_SHORT_SIDE * TILE), 1.5, 2)
}
