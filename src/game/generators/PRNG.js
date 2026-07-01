/**
 * @file PRNG.js
 * Implementazione Mulberry32 — PRNG deterministico con seed.
 * USA SEMPRE questa classe, MAI Math.random() (la mappa non sarebbe riproducibile).
 */

/**
 * Generatore di numeri pseudo-casuali deterministico basato su Mulberry32.
 * Con lo stesso seed produce sempre la stessa sequenza di valori.
 */
export class SeededRandom {
  /**
   * @param {number} seed - Seed iniziale (intero). Usa VILLAGE_CONFIG.seed.
   */
  constructor(seed) {
    // Mulberry32 accumulator — uint32 interno
    this._state = seed >>> 0
  }

  /**
   * Avanza lo stato e restituisce un float in [0, 1).
   * Algoritmo: Mulberry32 di Tommy Ettinger.
   * @returns {number} float in [0, 1)
   */
  next() {
    // incremento fisso 0x6D2B79F5 (primo di Marsaglia)
    let t = (this._state += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /**
   * Restituisce un intero incluso in [min, max].
   * @param {number} min - Valore minimo (incluso)
   * @param {number} max - Valore massimo (incluso)
   * @returns {number}
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /**
   * Restituisce un elemento casuale dall'array (senza modificarlo).
   * @template T
   * @param {T[]} array
   * @returns {T}
   */
  nextFrom(array) {
    if (!array || array.length === 0) return undefined
    return array[this.nextInt(0, array.length - 1)]
  }

  /**
   * Mescola una copia dell'array con Fisher-Yates e la restituisce.
   * L'array originale NON viene modificato.
   * @template T
   * @param {T[]} array
   * @returns {T[]}
   */
  shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
}