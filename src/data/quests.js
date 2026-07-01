/**
 * @file quests.js
 * Definizioni statiche delle missioni disponibili nel villaggio.
 *
 * Ogni quest è assegnata da un NPC specifico e richiede
 * di raccogliere oggetti, parlare con personaggi o esplorare aree.
 *
 * @module quests
 */

/**
 * @typedef {Object} QuestStep
 * @property {string} type     - Tipo step: 'collect'|'talk'|'explore'|'deliver'.
 * @property {string} target   - Chiave oggetto/NPC/area.
 * @property {number} [amount] - Quantità richiesta (solo per 'collect'|'deliver').
 * @property {string} hint     - Testo suggerimento mostrato all'utente.
 */

/**
 * @typedef {Object} Quest
 * @property {string}      id          - Identificatore univoco.
 * @property {string}      giverNpc    - Chiave NPC che assegna la missione.
 * @property {string}      title       - Titolo breve.
 * @property {string}      description - Descrizione narrativa (tono bambini 6-10 anni).
 * @property {QuestStep[]} steps       - Passi in sequenza.
 * @property {Object}      reward      - Ricompensa al completamento.
 * @property {number}      reward.coins - Campane guadagnate.
 * @property {string}      [reward.item] - Oggetto speciale (opzionale).
 * @property {string[]}    seasons     - Stagioni in cui è disponibile ([] = sempre).
 */

/** @type {Quest[]} */
export const QUESTS = [
  // ── Fiocco il Coniglietto ──────────────────────────────────────
  {
    id:          'q01_flowers_for_fiocco',
    giverNpc:    'bunny',
    title:       'Un mazzo per Fiocco 🌸',
    description: 'Fiocco vorrebbe decorare la sua casetta con dei fiori profumati. '
                + 'Potresti raccoglierne un po\' per lei?',
    steps: [
      {
        type:   'collect',
        target: 'flower_pink',
        amount: 5,
        hint:   'Cerca i fiori rosa nei prati vicino al fiume!',
      },
    ],
    reward: { coins: 80, item: 'fiocco_hairpin' },
    seasons: ['primavera'],
  },

  // ── Rame la Volpe ─────────────────────────────────────────────
  {
    id:          'q02_explore_forest',
    giverNpc:    'fox',
    title:       'Esploratori del Bosco 🦊',
    description: 'Rame ha sentito dire che nel bosco a nord si nasconde una grotta '
                + 'segreta. Ti va di scoprirla insieme?',
    steps: [
      {
        type:   'explore',
        target: 'area_north_forest',
        hint:   'Cammina verso nord finché non vedi gli alberi alti!',
      },
      {
        type:   'explore',
        target: 'area_hidden_cave',
        hint:   'La grotta è dietro la cascata... guarda bene!',
      },
    ],
    reward: { coins: 120 },
    seasons: [],
  },

  // ── Biscotto l'Orso ───────────────────────────────────────────
  {
    id:          'q03_mushroom_stew',
    giverNpc:    'bear',
    title:       'La Zuppa di Biscotto 🍄',
    description: 'Biscotto vuole preparare una zuppa di funghi speciale '
                + 'ma ha bisogno del tuo aiuto per trovare gli ingredienti giusti!',
    steps: [
      {
        type:   'collect',
        target: 'mushroom',
        amount: 3,
        hint:   'I funghetti crescono all\'ombra degli alberi in autunno.',
      },
      {
        type:   'deliver',
        target: 'bear',
        amount: 3,
        hint:   'Porta i funghi a Biscotto nella sua casetta!',
      },
    ],
    reward: { coins: 100 },
    seasons: ['autunno'],
  },

  // ── Luna la Gattina ───────────────────────────────────────────
  {
    id:          'q04_star_watching',
    giverNpc:    'cat',
    title:       'Notte di Stelle con Luna 🌙',
    description: 'Luna ama guardare le stelle di notte. '
                + 'Trova tre frammenti di stella caduta per costruire un telescopio!',
    steps: [
      {
        type:   'collect',
        target: 'star_fragment',
        amount: 3,
        hint:   'I frammenti di stella cadono di notte in tutto il villaggio!',
      },
      {
        type:   'talk',
        target: 'cat',
        hint:   'Torna da Luna con le stelle!',
      },
    ],
    reward: { coins: 200, item: 'mini_telescope' },
    seasons: [],
  },

  // ── Pallina l'Anatroccolo ─────────────────────────────────────
  {
    id:          'q05_shell_collection',
    giverNpc:    'duck',
    title:       'La Collezione di Pallina 🐚',
    description: 'Pallina vuole fare una collana di conchiglie per l\'estate! '
                + 'Aiutala a trovarne alcune sulla spiaggia.',
    steps: [
      {
        type:   'collect',
        target: 'shell',
        amount: 5,
        hint:   'Le conchiglie si trovano sulla riva del lago in estate!',
      },
    ],
    reward: { coins: 90, item: 'shell_necklace' },
    seasons: ['estate'],
  },
];

// ─────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────

/**
 * Restituisce le quest disponibili per una stagione e un NPC specifico.
 *
 * @param {string} season  - Stagione corrente (es. 'primavera').
 * @param {string} npcKey  - Chiave NPC (es. 'bunny').
 * @returns {Quest[]}
 */
export function getAvailableQuests(season, npcKey) {
  return QUESTS.filter((q) => {
    const seasonOk = q.seasons.length === 0 || q.seasons.includes(season);
    const npcOk    = q.giverNpc === npcKey;
    return seasonOk && npcOk;
  });
}
