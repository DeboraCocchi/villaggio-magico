/**
 * @file characterSpriteLayout.js
 * Layout frame condiviso da tutti gli spritesheet "a personaggio" (player,
 * NPC umani, pet): 96×128px, 3 colonne × 4 righe, frame 32×32, righe nella
 * sequenza down/left/right/up.
 *
 * Alcuni file pet hanno le righe sinistra/destra invertite rispetto alla
 * convenzione (es. npc_bunny.png): questo modulo centralizza la mappa
 * frame-per-direzione così PreloadScene (creazione animazioni) e Pet
 * (frame idle diretto) restano coerenti tra loro.
 *
 * @module utils/characterSpriteLayout
 */

/** Chiavi sprite il cui foglio ha le righe sinistra/destra scambiate. */
const LR_SWAPPED_SPRITE_KEYS = new Set(['npc_bunny']);

/**
 * @param {string} spriteKey
 * @returns {{down:number[], left:number[], right:number[], up:number[]}}
 */
export function getDirectionFrames(spriteKey) {
  const swapped = LR_SWAPPED_SPRITE_KEYS.has(spriteKey);
  return {
    down:  [0, 1, 2],
    left:  swapped ? [6, 7, 8] : [3, 4, 5],
    right: swapped ? [3, 4, 5] : [6, 7, 8],
    up:    [9, 10, 11],
  };
}

/**
 * Frame statico (posa centrale della riga) da mostrare quando il
 * personaggio è fermo e rivolto in una direzione.
 * @param {string} spriteKey
 * @param {'down'|'left'|'right'|'up'} facing
 * @returns {number}
 */
export function getIdleFrame(spriteKey, facing) {
  const frames = getDirectionFrames(spriteKey);
  const row = frames[facing] ?? frames.down;
  return row[1];
}
