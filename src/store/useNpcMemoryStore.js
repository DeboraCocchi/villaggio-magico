/**
 * @file useNpcMemoryStore.js
 * Store Zustand (persistito in localStorage) che ricorda, per ogni NPC:
 *  - quali dialoghi pre-scritti sono già stati usati (senza ripetizioni)
 *  - una cronologia breve degli ultimi dialoghi (pre-scritti o AI)
 *
 * La cronologia viene passata all'AI (dialogueAI.js) così i dialoghi
 * generati restano coerenti con quanto l'NPC ha già detto: possono
 * riprendere argomenti, promesse ("il picnic al fiume") e battute.
 *
 * @module store/useNpcMemoryStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Numero massimo di dialoghi ricordati per NPC (i più recenti). */
const HISTORY_LIMIT = 6;

/**
 * @typedef {Object} NpcMemory
 * @property {number[]} usedIndices - Indici di initialDialogs già mostrati.
 * @property {string[]} history     - Ultimi dialoghi (una stringa per dialogo).
 */

export const useNpcMemoryStore = create(
  persist(
    (set, get) => ({
      /** @type {Record<string, NpcMemory>} */
      memories: {},

      /**
       * Restituisce la memoria di un NPC (creandola se assente).
       * @param {string} npcId
       * @returns {NpcMemory}
       */
      getMemory(npcId) {
        return get().memories[npcId] ?? { usedIndices: [], history: [] };
      },

      /**
       * Segna un dialogo pre-scritto come usato e lo aggiunge alla cronologia.
       * @param {string}   npcId
       * @param {number}   index - Indice in initialDialogs.
       * @param {string[]} lines - Le pagine del dialogo mostrato.
       */
      markDialogUsed(npcId, index, lines) {
        const mem = get().getMemory(npcId);
        set((state) => ({
          memories: {
            ...state.memories,
            [npcId]: {
              usedIndices: [...mem.usedIndices, index],
              history: [...mem.history, lines.join(' ')].slice(-HISTORY_LIMIT),
            },
          },
        }));
      },

      /**
       * Aggiunge un dialogo generato dall'AI alla cronologia.
       * @param {string}   npcId
       * @param {string[]} lines
       */
      addAiDialog(npcId, lines) {
        const mem = get().getMemory(npcId);
        set((state) => ({
          memories: {
            ...state.memories,
            [npcId]: {
              ...mem,
              history: [...mem.history, lines.join(' ')].slice(-HISTORY_LIMIT),
            },
          },
        }));
      },

      /** Azzera tutta la memoria (utile per test o "nuova partita"). */
      resetAll() {
        set({ memories: {} });
      },
    }),
    { name: 'villaggio-npc-memory' }, // chiave localStorage
  ),
);
