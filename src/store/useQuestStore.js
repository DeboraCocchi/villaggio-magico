/**
 * @file useQuestStore.js
 * Store Zustand (persistito in localStorage) con TUTTA la logica di
 * stato delle missioni: avvio, avanzamento step, completamento e premi.
 *
 * Il lato Phaser (QuestManager, ItemManager, NPC) chiama le azioni con
 * `useQuestStore.getState()` — stesso pattern già usato con usePlayerStore.
 * Il lato React (QuestPanel) si sottoscrive normalmente con l'hook.
 *
 * Al completamento di una quest:
 *  - le campane della ricompensa vengono aggiunte a usePlayerStore
 *    (che emette l'aggiornamento all'HUD);
 *  - viene emesso l'evento 'quest:completed' per il toast in QuestPanel.
 *
 * @module store/useQuestStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QUEST_BY_ID } from '@data/quests.js';
import { usePlayerStore } from '@store/usePlayerStore.js';
import { useMagazzinoStore } from '@store/useMagazzinoStore.js';
import { emitToReact } from '@game/utils/phaserBridge.js';

/**
 * @typedef {Object} ActiveQuestState
 * @property {number} stepIndex - Indice dello step corrente.
 * @property {number} count     - Progresso dello step corrente (solo 'collect').
 */

/**
 * @typedef {Object} TalkResult
 * @property {string} questId
 * @property {'advanced'|'completed'} kind
 */

export const useQuestStore = create(
  persist(
    (set, get) => ({
      /** @type {Record<string, ActiveQuestState>} Quest attive per id. */
      active: {},

      /** @type {string[]} Id delle quest completate. */
      completed: [],

      /** @type {string[]} Oggetti speciali guadagnati (inventario semplice). */
      items: [],

      /**
       * Avvia una quest (se non già attiva o completata).
       * @param {string} questId
       * @returns {boolean} true se avviata.
       */
      startQuest(questId) {
        const { active, completed } = get();
        if (active[questId] || completed.includes(questId)) return false;
        if (!QUEST_BY_ID.has(questId)) return false;

        set((s) => ({
          active: { ...s.active, [questId]: { stepIndex: 0, count: 0 } },
        }));
        get()._seedCollectFromMagazzino(questId);
        return true;
      },

      /**
       * Registra la raccolta di un oggetto: fa avanzare tutte le quest
       * attive il cui step corrente è 'collect' di quel tipo.
       * Chiamato da QuestManager quando ItemManager emette 'item:collected'.
       *
       * @param {string} type - 'flower'|'shell'|'fruit'|'mushroom'.
       */
      recordCollect(type) {
        for (const [questId, state] of Object.entries(get().active)) {
          const quest = QUEST_BY_ID.get(questId);
          const step  = quest?.steps[state.stepIndex];
          if (!step || step.type !== 'collect' || step.target !== type) continue;

          const count = state.count + 1;
          if (count >= (step.amount ?? 1)) {
            get()._advanceStep(questId);          // step completato
          } else {
            set((s) => ({
              active: { ...s.active, [questId]: { ...state, count } },
            }));
          }
        }
      },

      /**
       * Registra un dialogo con un NPC: fa avanzare le quest attive il cui
       * step corrente è 'talk' verso quell'NPC.
       *
       * @param {string} npcId
       * @returns {TalkResult[]} Cosa è successo (per costruire il dialogo).
       */
      recordTalk(npcId) {
        /** @type {TalkResult[]} */
        const results = [];

        for (const [questId, state] of Object.entries(get().active)) {
          const quest = QUEST_BY_ID.get(questId);
          const step  = quest?.steps[state.stepIndex];
          if (!step || step.type !== 'talk' || step.target !== npcId) continue;

          const completedNow = get()._advanceStep(questId);
          results.push({ questId, kind: completedNow ? 'completed' : 'advanced' });
        }
        return results;
      },

      /**
       * Accredita subito, per lo step 'collect' corrente di una quest
       * appena attivato, quanto già presente nel magazzino (cap al
       * fabbisogno dello step). "Il possesso conta, non si consuma":
       * il magazzino non viene scalato, quindi gli stessi oggetti
       * possono soddisfare più quest.
       *
       * @param {string} questId
       * @private (per convenzione: usato solo internamente)
       */
      _seedCollectFromMagazzino(questId) {
        const quest = QUEST_BY_ID.get(questId);
        const state = get().active[questId];
        if (!quest || !state) return;

        const step = quest.steps[state.stepIndex];
        if (!step || step.type !== 'collect') return;

        const totals = useMagazzinoStore.getState().totals;
        const amount = step.amount ?? 1;
        const count  = Math.min(totals[step.target] ?? 0, amount);

        set((s) => ({
          active: { ...s.active, [questId]: { ...s.active[questId], count } },
        }));

        if (count >= amount) {
          get()._advanceStep(questId);
        }
      },

      /**
       * Fa avanzare lo step corrente di una quest; se era l'ultimo,
       * completa la quest e assegna la ricompensa.
       *
       * @param {string} questId
       * @returns {boolean} true se la quest si è completata.
       * @private (per convenzione: usato solo internamente)
       */
      _advanceStep(questId) {
        const quest = QUEST_BY_ID.get(questId);
        const state = get().active[questId];
        if (!quest || !state) return false;

        const nextIndex = state.stepIndex + 1;

        if (nextIndex < quest.steps.length) {
          set((s) => ({
            active: { ...s.active, [questId]: { stepIndex: nextIndex, count: 0 } },
          }));
          get()._seedCollectFromMagazzino(questId);
          return false;
        }

        // ── Quest completata: rimuovi da attive, premia ──────────────
        set((s) => {
          const { [questId]: _done, ...rest } = s.active;
          return {
            active:    rest,
            completed: [...s.completed, questId],
            items:     quest.reward.item ? [...s.items, quest.reward.item] : s.items,
          };
        });

        // Campane → usePlayerStore (l'HUD legge direttamente lo store)
        const player = usePlayerStore.getState();
        player.setCoins(player.coins + quest.reward.coins);

        // Toast in QuestPanel + eventuali suoni/effetti futuri
        emitToReact('quest:completed', {
          questId,
          title: quest.title,
          coins: quest.reward.coins,
          item:  quest.reward.item ?? null,
        });
        return true;
      },

      /**
       * Dettagli delle quest attive per il pannello HUD.
       * @returns {Array<{id:string, title:string, hint:string, progress:string|null}>}
       */
      getActiveDetailed() {
        return Object.entries(get().active).map(([questId, state]) => {
          const quest = QUEST_BY_ID.get(questId);
          const step  = quest.steps[state.stepIndex];
          const progress = step.type === 'collect'
            ? `${state.count}/${step.amount ?? 1}`
            : null;
          return { id: questId, title: quest.title, hint: step.hint, progress };
        });
      },

      /** Azzera tutto (nuova partita). */
      resetAll() {
        set({ active: {}, completed: [], items: [] });
      },
    }),
    { name: 'villaggio-quests' }, // chiave localStorage
  ),
);
