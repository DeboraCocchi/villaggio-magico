/**
 * @file QuestManager.js
 * Orchestratore Phaser del sistema missioni.
 *
 * Responsabilità:
 *  1. Ascolta 'item:collected' (emesso da ItemManager per ogni oggetto
 *     raccolto) e aggiorna il progresso delle quest attive nello store.
 *  2. Espone `onNpcTalk(npcId)`, chiamato da NPC.interact() PRIMA del
 *     dialogo normale: gestisce completamento, avanzamento step 'talk'
 *     e offerta di nuove quest, restituendo le pagine di dialogo adatte.
 *     Se restituisce null, l'NPC procede col dialogo normale (pool/AI).
 *  3. Espone `getHintForNpc(npcId)` per arricchire il contesto dei
 *     dialoghi AI con la quest in corso di quell'NPC.
 *
 * Tutta la logica di stato vive in useQuestStore (persistito): questo
 * manager è solo il ponte col mondo Phaser, secondo il pattern del progetto.
 *
 * WIRING in VillageScene:
 *   create():   this.questManager = new QuestManager(this)   // dopo npcManager
 *   shutdown(): this.questManager?.destroy()
 *
 * @module managers/QuestManager
 */

import { useQuestStore } from '@store/useQuestStore.js';
import { usePlayerStore } from '@store/usePlayerStore.js';
import { QUEST_BY_ID, getAvailableQuests } from '@data/quests.js';
import { listenFromReact } from '../utils/phaserBridge.js';

export class QuestManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /**
     * Cleanup del listener 'item:collected'.
     * ItemManager emette l'evento sul window-bridge; qui lo trasformiamo
     * in progresso quest. Nessun accoppiamento diretto tra i due manager.
     * @type {Function}
     */
    this._cleanupItemListener = listenFromReact('item:collected', ({ type }) => {
      useQuestStore.getState().recordCollect(type);
    });
  }

  /**
   * Gestisce l'aspetto "quest" di un dialogo con un NPC.
   * Ordine: completamenti/avanzamenti 'talk' → offerta nuova quest → null.
   *
   * @param {string} npcId - Id NPC (es. 'nonna_anna').
   * @returns {string[]|null} Pagine di dialogo quest, o null se nessuna
   *                          interazione quest (→ dialogo normale).
   */
  onNpcTalk(npcId) {
    const store = useQuestStore.getState();

    // ── 1. Avanza gli step 'talk' delle quest attive ────────────────
    const results = store.recordTalk(npcId);

    const completedResult = results.find((r) => r.kind === 'completed');
    if (completedResult) {
      const quest = QUEST_BY_ID.get(completedResult.questId);
      return quest.completionDialog;
    }

    const advancedResult = results.find((r) => r.kind === 'advanced');
    if (advancedResult) {
      // Step 'talk' intermedio superato (es. "il giro dei saluti"):
      // conferma + suggerimento per il prossimo passo.
      const quest = QUEST_BY_ID.get(advancedResult.questId);
      const state = useQuestStore.getState().active[advancedResult.questId];
      const nextHint = quest.steps[state.stepIndex]?.hint ?? '';
      return [
        'Evviva, ottimo lavoro! ⭐',
        nextHint,
      ];
    }

    // ── 2. Offri una nuova quest di questo NPC, se disponibile ──────
    const { season } = usePlayerStore.getState();
    const candidate = getAvailableQuests(season, npcId).find(
      (q) => !store.active[q.id] && !store.completed.includes(q.id),
    );

    if (candidate && store.startQuest(candidate.id)) {
      return candidate.offerDialog;
    }

    // ── 3. Nessuna interazione quest → dialogo normale ──────────────
    return null;
  }

  /**
   * Suggerimento della quest in corso assegnata da un NPC, per dare
   * contesto ai dialoghi AI ("ricorda a Cecilia la missione...").
   *
   * @param {string} npcId
   * @returns {string} Stringa di contesto, o '' se nessuna quest attiva.
   */
  getHintForNpc(npcId) {
    const { active } = useQuestStore.getState();
    const { name: playerName } = usePlayerStore.getState();

    for (const [questId, state] of Object.entries(active)) {
      const quest = QUEST_BY_ID.get(questId);
      if (quest?.giverNpc !== npcId) continue;
      const step = quest.steps[state.stepIndex];
      return `Hai già chiesto a ${playerName} questo favore: "${quest.title}". `
           + `Suggerimento in corso: ${step.hint}`;
    }
    return '';
  }

  /**
   * Rimuove il listener. Chiamare da `scene.shutdown()`.
   * @returns {void}
   */
  destroy() {
    this._cleanupItemListener?.();
  }
}
