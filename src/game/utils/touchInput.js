/**
 * @file touchInput.js
 * Stato condiviso dei controlli touch (pad virtuale + tasti A/B).
 *
 * Scritto da:  TouchControls.jsx (lato React, pointer events)
 * Letto da:    VillageScene / InteriorScene (movimento, in update())
 *              NPCManager / InteriorScene (azione A → interact)
 *
 * È un semplice singleton importato da entrambi i lati: nessun evento
 * per-frame sul bridge window, le scene leggono i boolean direttamente
 * in update() esattamente come fanno con this.cursors / this.wasd.
 *
 * Convenzione direzioni: identica a CursorKeys → left/right/up/down
 * boolean, così le scene possono fare:
 *   const left = this.cursors.left.isDown || this.wasd.left.isDown || touchInput.left
 *
 * @module utils/touchInput
 */

/** Sotto questa distanza normalizzata dal centro il pad è "a riposo". */
const DEADZONE = 0.2

/** Soglia per asse oltre la quale la direzione digitale si attiva
 *  (0.35 permette le diagonali naturali senza sfarfallio). */
const AXIS_THRESHOLD = 0.35

/** Validità massima di una pressione di A in coda (ms). Evita che una
 *  pressione avvenuta durante un dialogo/fade venga consumata dopo. */
const A_MAX_AGE_MS = 300

export const touchInput = {
  /** @type {boolean} */ left:  false,
  /** @type {boolean} */ right: false,
  /** @type {boolean} */ up:    false,
  /** @type {boolean} */ down:  false,

  /** Timestamp (performance.now) dell'ultima pressione di A non consumata. */
  _aQueuedAt: 0,

  /**
   * Aggiorna le direzioni digitali a partire dal vettore normalizzato
   * della levetta ([-1, 1] su entrambi gli assi).
   *
   * @param {number} nx - Componente X normalizzata (-1 sinistra, +1 destra).
   * @param {number} ny - Componente Y normalizzata (-1 su, +1 giù).
   * @returns {void}
   */
  setDirection(nx, ny) {
    const magnitude = Math.hypot(nx, ny)
    if (magnitude < DEADZONE) {
      this.left = this.right = this.up = this.down = false
      return
    }
    this.left  = nx < -AXIS_THRESHOLD
    this.right = nx >  AXIS_THRESHOLD
    this.up    = ny < -AXIS_THRESHOLD
    this.down  = ny >  AXIS_THRESHOLD
  },

  /**
   * Mette in coda una pressione del tasto A (interagisci).
   * Verrà consumata dalla scena attiva al frame successivo via consumeA().
   * @returns {void}
   */
  queueA() {
    this._aQueuedAt = performance.now()
  },

  /**
   * Consuma la pressione di A in coda, se presente e recente.
   * Edge-triggered: ritorna true una sola volta per pressione
   * (equivalente di Phaser.Input.Keyboard.JustDown).
   *
   * @returns {boolean} true se c'era una pressione valida da consumare.
   */
  consumeA() {
    if (!this._aQueuedAt) return false
    const fresh = performance.now() - this._aQueuedAt <= A_MAX_AGE_MS
    this._aQueuedAt = 0
    return fresh
  },

  /**
   * Azzera tutto lo stato (chiamare quando il pad viene rilasciato
   * o il componente TouchControls viene smontato).
   * @returns {void}
   */
  reset() {
    this.left = this.right = this.up = this.down = false
    this._aQueuedAt = 0
  },
}