/**
 * @file usePlayerStore.js
 * Store Zustand per i dati del giocatore mostrati nell'HUD.
 *
 * Phaser aggiorna questi valori via bridge window (CustomEvent),
 * React li legge per visualizzarli nell'interfaccia.
 *
 * @module usePlayerStore
 */

import { create } from 'zustand';

/**
 * @typedef {Object} PlayerState
 * @property {string}   name        - Nome della giocatrice.
 * @property {number}   coins       - Numero di monete campana correnti.
 * @property {number}   hearts      - Cuori vita/amicizia (0–5).
 * @property {string}   currentTime - Ora nel gioco (es. '14:30').
 * @property {string}   season      - Stagione corrente ('primavera'|'estate'|'autunno'|'inverno').
 * @property {Function} setCoins    - Imposta le monete.
 * @property {Function} setHearts   - Imposta i cuori.
 * @property {Function} setTime     - Imposta l'ora di gioco.
 * @property {Function} setSeason   - Imposta la stagione.
 * @property {Function} setName     - Imposta il nome della giocatrice.
 */

/**
 * Store per i dati del giocatore visibili nell'HUD React.
 *
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<PlayerState>>}
 */
export const usePlayerStore = create((set) => ({
  name:        'Giocatrice',
  coins:       0,
  hearts:      3,
  currentTime: '08:00',
  season:      'primavera',

  /** @param {string} name */
  setName:   (name)   => set({ name }),

  /** @param {number} coins */
  setCoins:  (coins)  => set({ coins }),

  /** @param {number} hearts */
  setHearts: (hearts) => set({ hearts }),

  /** @param {string} time - Formato 'HH:MM'. */
  setTime:   (time)   => set({ currentTime: time }),

  /** @param {string} season */
  setSeason: (season) => set({ season }),
}));
