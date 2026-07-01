/**
 * @file HouseLayouts.js
 * Layout tile per ogni tipo di casa.
 *
 * TILE ID PLACEHOLDER — sostituisci con gli id reali del tuo tileset:
 *   0 = vuoto / trasparente
 *   1 = pavimento interno
 *   2 = muro
 *   3 = porta (lato sud, centro, riga base)
 *   4 = finestra
 *   5 = tetto (layer "above", depth > player)
 *
 * Ogni layout ha:
 *   ground[][]      — layer pavimento/erba sotto la casa
 *   walls[][]       — layer buildings (collisioni attive dove tile > 0)
 *   roof[][]        — layer above (depth > player, stessa dimensione di walls)
 *   doorOffset      — { x, y } offset in tile rispetto al centro del layout
 *                     indica dove compare il nome dell'abitante
 *
 * Convenzione coordinate:
 *   layout[row][col] → row 0 = riga più in ALTO (nord), col 0 = colonna più a SINISTRA (ovest)
 */

/** @typedef {{ ground: number[][], walls: number[][], roof: number[][], doorOffset: {x:number, y:number} }} HouseLayout */

/**
 * Mappa houseType → HouseLayout.
 * @type {Record<string, HouseLayout>}
 */
export const HOUSE_LAYOUTS = {

  // ─────────────────────────────────────────────────────────────
  // player  4×3 tile
  // Casetta della protagonista — tetto spiovente, colori tenui
  // ─────────────────────────────────────────────────────────────
  player: {
    // ground: pavimento interno visibile attraverso le porte/finestre
    ground: [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ],
    // walls: muri perimetrali, porta al centro della riga base
    walls: [
      [2, 4, 4, 2],   // riga nord: muri angolo + finestre
      [2, 1, 1, 2],   // riga centro: muri laterali, interno vuoto
      [2, 2, 3, 2],   // riga sud: muro + porta (col 2)
    ],
    // roof: tetto, si sovrappone alla riga nord e spunta sopra
    roof: [
      [5, 5, 5, 5],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    doorOffset: { x: 2, y: 2 },   // porta a col 2, riga 2 → offset da (0,0) del layout
  },

  // ─────────────────────────────────────────────────────────────
  // elder  4×3 tile
  // Casa del nonno — più solida, finestra grande
  // ─────────────────────────────────────────────────────────────
  elder: {
    ground: [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ],
    walls: [
      [2, 2, 2, 2],   // riga nord: muro pieno (più robusto)
      [2, 4, 4, 2],   // riga centro: finestre ampie
      [2, 2, 3, 2],   // riga sud: porta
    ],
    roof: [
      [5, 5, 5, 5],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    doorOffset: { x: 2, y: 2 },
  },

  // ─────────────────────────────────────────────────────────────
  // cozy  3×3 tile
  // Casetta accogliente — quadrata, porta centrale
  // ─────────────────────────────────────────────────────────────
  cozy: {
    ground: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    walls: [
      [2, 4, 2],
      [2, 1, 2],
      [2, 3, 2],
    ],
    roof: [
      [5, 5, 5],
      [0, 0, 0],
      [0, 0, 0],
    ],
    doorOffset: { x: 1, y: 2 },
  },

  // ─────────────────────────────────────────────────────────────
  // garden  5×4 tile
  // Casa con giardino — più larga, staccionata sui lati
  // ─────────────────────────────────────────────────────────────
  garden: {
    ground: [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ],
    walls: [
      [0, 2, 2, 2, 0],   // riga nord: casa centrata, lati aperti (giardino)
      [0, 2, 4, 2, 0],   // riga 1: finestra centrale
      [0, 2, 1, 2, 0],   // riga 2: interno
      [0, 2, 3, 2, 0],   // riga sud: porta
    ],
    roof: [
      [0, 5, 5, 5, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    doorOffset: { x: 2, y: 3 },
  },

  // ─────────────────────────────────────────────────────────────
  // shop  5×3 tile
  // Negozio — insegna sopra, doppia porta
  // ─────────────────────────────────────────────────────────────
  shop: {
    ground: [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ],
    walls: [
      [2, 4, 4, 4, 2],   // riga nord: tre finestre (vetrine)
      [2, 1, 1, 1, 2],   // riga centro: spazio interno
      [2, 2, 3, 2, 2],   // riga sud: porta centrale singola
    ],
    roof: [
      [5, 5, 5, 5, 5],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    doorOffset: { x: 2, y: 2 },
  },

  // ─────────────────────────────────────────────────────────────
  // treehouse  3×4 tile  (layout verticale)
  // Casa sull'albero — piattaforma alta, scala sotto
  // ─────────────────────────────────────────────────────────────
  treehouse: {
    ground: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
    walls: [
      [5, 5, 5],   // riga 0: tetto (in walls perché la casa inizia in alto)
      [2, 4, 2],   // riga 1: finestra
      [2, 1, 2],   // riga 2: interno
      [2, 3, 2],   // riga 3: porta/uscita (scala sotto)
    ],
    roof: [
      [5, 5, 5],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    doorOffset: { x: 1, y: 3 },
  },
}