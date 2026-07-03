/**
 * @file quests.js
 * Definizioni statiche delle missioni del villaggio, assegnate dai
 * tre NPC di famiglia (vedi villageConfig.js): Nonno Daniele,
 * Nonna Anna e Zia Debora.
 *
 * I target degli step 'collect' usano ESATTAMENTE i tipi spawmati da
 * ItemManager dagli Object Layer di Tiled: 'flower'|'shell'|'fruit'|'mushroom'.
 * I target degli step 'talk' usano gli id NPC di villageConfig.js.
 *
 * ✏️ MODIFICA QUESTO FILE per aggiungere o cambiare missioni.
 *
 * @module data/quests
 */

/**
 * @typedef {Object} QuestStep
 * @property {'collect'|'talk'} type - Tipo step.
 * @property {string} target   - Tipo oggetto ('flower'…) o id NPC ('nonna_anna'…).
 * @property {number} [amount] - Quantità richiesta (solo 'collect').
 * @property {string} hint     - Suggerimento mostrato nel pannello missioni.
 */

/**
 * @typedef {Object} Quest
 * @property {string}      id               - Identificatore univoco.
 * @property {string}      giverNpc         - Id NPC che assegna la missione.
 * @property {string}      title            - Titolo breve (con emoji).
 * @property {string}      description      - Descrizione narrativa (tono 6-10 anni).
 * @property {QuestStep[]} steps            - Passi in sequenza.
 * @property {string[]}    offerDialog      - Pagine di dialogo quando l'NPC propone la quest.
 * @property {string[]}    completionDialog - Pagine di dialogo al completamento.
 * @property {Object}      reward           - Ricompensa.
 * @property {number}      reward.coins     - Campane guadagnate.
 * @property {string}      [reward.item]    - Oggetto speciale (opzionale).
 * @property {string[]}    seasons          - Stagioni disponibili ([] = sempre).
 */

/** @type {Quest[]} */
export const QUESTS = [

  // ── Nonna Anna ────────────────────────────────────────────────
  {
    id:          'q01_torta_nonna_anna',
    giverNpc:    'nonna_anna',
    title:       'La torta di Nonna Anna 🥧',
    description: 'La nonna vuole preparare la sua famosa torta di mele, '
               + 'ma le servono frutti freschi!',
    steps: [
      {
        type:   'collect',
        target: 'fruit',
        amount: 3,
        hint:   'Raccogli 3 frutti 🍎 vicino agli alberi!',
      },
      {
        type:   'talk',
        target: 'nonna_anna',
        hint:   'Porta i frutti a Nonna Anna!',
      },
    ],
    offerDialog: [
      'Cecilia tesoro, mi aiuti? 🥧',
      'Voglio fare la torta di mele...',
      'Mi porti 3 frutti belli maturi?',
    ],
    completionDialog: [
      'Che frutti meravigliosi! 🍎',
      'La torta sarà buonissima, grazie tesoro!',
      'Tieni, queste campane sono per te. 🔔',
    ],
    reward:  { coins: 80 },
    seasons: [],
  },

  // ── Nonno Daniele ─────────────────────────────────────────────
  {
    id:          'q02_fiori_per_la_panchina',
    giverNpc:    'nonno_daniele',
    title:       'Fiori per la panchina 🌸',
    description: 'Il nonno vuole decorare la panchina del giardino '
               + 'con i fiori più belli del villaggio.',
    steps: [
      {
        type:   'collect',
        target: 'flower',
        amount: 5,
        hint:   'Raccogli 5 fiori 🌸 nei prati del villaggio!',
      },
      {
        type:   'talk',
        target: 'nonno_daniele',
        hint:   'Porta i fiori al Nonno Daniele!',
      },
    ],
    offerDialog: [
      'Cecilia mia, ho un\u2019idea! 👴',
      'Rendiamo bella la panchina del giardino.',
      'Mi raccogli 5 fiori colorati?',
    ],
    completionDialog: [
      'Ma che meraviglia, Cecilia mia! 🌸',
      'La panchina ora è la più bella del villaggio.',
      'Ecco le tue campane, te le sei meritate! 🔔',
    ],
    reward:  { coins: 100 },
    seasons: [],
  },

  // ── Nonno Daniele → consegna a Nonna Anna ─────────────────────
  {
    id:          'q03_funghetti_per_il_risotto',
    giverNpc:    'nonno_daniele',
    title:       'Funghetti per il risotto 🍄',
    description: 'Il nonno ha voglia del risotto ai funghi della nonna! '
               + 'Raccogli i funghetti e portali a Nonna Anna.',
    steps: [
      {
        type:   'collect',
        target: 'mushroom',
        amount: 3,
        hint:   'Cerca 3 funghetti 🍄 all\u2019ombra degli alberi!',
      },
      {
        type:   'talk',
        target: 'nonna_anna',
        hint:   'Porta i funghetti a Nonna Anna per il risotto!',
      },
    ],
    offerDialog: [
      'Psst, Cecilia mia... 🍄',
      'Ho una voglia matta del risotto della nonna!',
      'Trovi 3 funghetti e glieli porti tu?',
    ],
    completionDialog: [
      'Funghetti freschi! Che bello! 🍄',
      'Stasera risotto per tutti, nonno compreso.',
      'Sei un tesoro, tieni le tue campane! 🔔',
    ],
    reward:  { coins: 120 },
    seasons: [],
  },

  // ── Zia Debora ────────────────────────────────────────────────
  {
    id:          'q04_affare_delle_conchiglie',
    giverNpc:    'zia_debora',
    title:       'L\u2019affare delle conchiglie 🐚',
    description: 'La zia vuole fare una collana di conchiglie per Cecilia. '
               + 'Conchiglie in cambio di campane: affare fatto!',
    steps: [
      {
        type:   'collect',
        target: 'shell',
        amount: 4,
        hint:   'Cerca 4 conchiglie 🐚 sulla spiaggia a sud!',
      },
      {
        type:   'talk',
        target: 'zia_debora',
        hint:   'Porta le conchiglie a Zia Debora!',
      },
    ],
    offerDialog: [
      'Ehi Cece, offerta speciale! 🐚',
      '4 conchiglie in cambio di campane sonanti.',
      'E ti faccio pure una collana. Affare fatto?',
    ],
    completionDialog: [
      'Conchiglie perfette! 🐚',
      'La collana sarà bellissima, come te!',
      'Campane per la mia socia. Affare fatto! 🔔',
    ],
    reward:  { coins: 90, item: 'collana_di_conchiglie' },
    seasons: ['estate'],
  },

  // ── Zia Debora — giro di saluti (solo 'talk') ─────────────────
  {
    id:          'q05_il_giro_dei_saluti',
    giverNpc:    'zia_debora',
    title:       'Il giro dei saluti 🗺️',
    description: 'La zia ha lanciato una sfida: salutare tutta la famiglia '
               + 'facendo il giro del villaggio!',
    steps: [
      {
        type:   'talk',
        target: 'nonno_daniele',
        hint:   'Vai a salutare il Nonno Daniele! 👴',
      },
      {
        type:   'talk',
        target: 'nonna_anna',
        hint:   'Ora un saluto a Nonna Anna! 👵',
      },
      {
        type:   'talk',
        target: 'zia_debora',
        hint:   'Torna dalla zia a raccontare tutto!',
      },
    ],
    offerDialog: [
      'Cece, sfida esploratrice! 🗺️',
      'Fai il giro: saluta il nonno, poi la nonna...',
      'E torna qui a raccontarmi tutto. Via!',
    ],
    completionDialog: [
      'Giro completato, che velocità! 🏅',
      'Sei l\u2019esploratrice più brava del villaggio.',
      'Premio speciale per te: campane! 🔔',
    ],
    reward:  { coins: 150 },
    seasons: [],
  },
];

// ─────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────

/**
 * Mappa id → quest, per lookup veloce.
 * @type {Map<string, Quest>}
 */
export const QUEST_BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

/**
 * Restituisce le quest di un NPC disponibili nella stagione corrente.
 *
 * @param {string} season - Stagione corrente (es. 'estate').
 * @param {string} npcId  - Id NPC (es. 'nonna_anna').
 * @returns {Quest[]}
 */
export function getAvailableQuests(season, npcId) {
  return QUESTS.filter((q) => {
    const seasonOk = q.seasons.length === 0 || q.seasons.includes(season);
    return seasonOk && q.giverNpc === npcId;
  });
}
