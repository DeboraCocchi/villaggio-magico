/**
 * @file useDialogStore.js
 * Store Zustand per lo stato della DialogBox.
 *
 * Usato da:
 *  - DialogBox.jsx  → legge e chiude il dialogo
 *  - VillageScene   → apre il dialogo via bridge window (non importa questo file)
 *
 * @module useDialogStore
 */

import { create } from 'zustand';

/**
 * @typedef {Object} DialogState
 * @property {boolean}       isOpen   - Se la finestra di dialogo è visibile.
 * @property {string}        npcKey   - Chiave NPC parlante (es. 'bunny').
 * @property {string}        text     - Testo corrente mostrato.
 * @property {string[]}      queue    - Righe di testo in attesa.
 * @property {Function}      open     - Apre il dialogo con una sequenza di testi.
 * @property {Function}      advance  - Avanza alla riga successiva o chiude.
 * @property {Function}      close    - Chiude immediatamente il dialogo.
 */

/**
 * Store per la gestione del dialogo NPC.
 *
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<DialogState>>}
 */
export const useDialogStore = create((set, get) => ({
  isOpen: false,
  npcKey: '',
  text:   '',
  queue:  [],

  /**
   * Apre il dialogo con l'NPC specificato e una sequenza di messaggi.
   *
   * @param {string}   npcKey   - Chiave NPC (es. 'bunny').
   * @param {string[]} messages - Array di stringhe: ogni stringa è una "pagina" di dialogo.
   */
  open(npcKey, messages) {
    if (!messages?.length) return;
    const [first, ...rest] = messages;
    set({ isOpen: true, npcKey, text: first, queue: rest });
  },

  /**
   * Avanza alla prossima riga del dialogo.
   * Se non ci sono altre righe, chiude il dialogo.
   */
  advance() {
    const { queue } = get();
    if (queue.length === 0) {
      get().close();
      return;
    }
    const [next, ...rest] = queue;
    set({ text: next, queue: rest });
  },

  /**
   * Chiude il dialogo e resetta lo stato.
   */
  close() {
    set({ isOpen: false, npcKey: '', text: '', queue: [] });
  },
}));
