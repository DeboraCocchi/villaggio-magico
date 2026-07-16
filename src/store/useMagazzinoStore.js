/**
 * @file useMagazzinoStore.js
 * Store Zustand (persistito in localStorage) del magazzino: totali
 * storici degli oggetti raccolti, per tipo, attraverso tutte le giornate.
 *
 * Chi scrive: ItemManager._collect() (lato Phaser) chiama
 *   useMagazzinoStore.getState().recordCollect(item.type)
 * — stesso pattern getState() già usato da useQuestStore con usePlayerStore.
 *
 * Chi legge: MagazzinoPanel.jsx (il recap che si apre avvicinandosi
 * ai bauli del layer "magazzino" in house_cece).
 *
 * @module store/useMagazzinoStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useMagazzinoStore = create(
  persist(
    (set, get) => ({
      /**
       * Totali storici per tipo: 'flower'|'shell'|'fruit'|'mushroom'.
       * @type {Record<string, number>}
       */
      totals: {},

      /**
       * Registra un oggetto raccolto nel totale storico del magazzino.
       * Chiamato da ItemManager._collect().
       * @param {string} type - 'flower'|'shell'|'fruit'|'mushroom'.
       */
      recordCollect(type) {
        set((s) => ({
          totals: { ...s.totals, [type]: (s.totals[type] ?? 0) + 1 },
        }));
      },

      /** Totale complessivo di tutti gli oggetti raccolti. */
      getGrandTotal() {
        return Object.values(get().totals).reduce((sum, n) => sum + n, 0);
      },

      /** Azzera il magazzino (nuova partita). */
      resetAll() {
        set({ totals: {} });
      },
    }),
    { name: 'villaggio-magazzino' }, // chiave localStorage
  ),
);