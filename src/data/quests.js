/**
 * @file quests.js
 * Definizioni statiche delle missioni del villaggio, assegnate dai
 * cinque NPC di famiglia (vedi villageConfig.js): Nonno Daniele,
 * Nonna Anna, Zia Debora, Mamma Chiara e Babbo Ale.
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
    title:       'La crostata di Nonna Anna 🥧',
    description: 'La nonna vuole preparare la sua famosa crostata di frutta, '
               + 'ma le servono frutti freschi!',
    steps: [
      {
        type:   'collect',
        target: 'fruit',
        amount: 6,
        hint:   'Raccogli 6 frutti 🍎🍊​🍐​🍑​​ vicino agli alberi!',
      },
      {
        type:   'talk',
        target: 'nonna_anna',
        hint:   'Porta i frutti a Nonna Anna!',
      },
    ],
    offerDialog: [
      'Cecilia tesoro, mi aiuti? 🥧',
      'Voglio fare la crostata di frutta...',
      'Mi porti 6 frutti belli maturi?',
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
        amount: 10,
        hint:   'Raccogli 10 fiori 🌸 nei prati del villaggio!',
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
      'Mi raccogli 10 fiori colorati?',
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
    giverNpc:    'nonna_anna',
    title:       'Funghetti per il risotto 🍄',
    description: 'La nonna ha voglia del risotto ai funghi! '
               + 'Raccogli i funghetti e portali a Nonna Anna.',
    steps: [
      {
        type:   'collect',
        target: 'mushroom',
        amount: 5,
        hint:   'Cerca 5 funghetti 🍄 all\u2019ombra degli alberi!',
      },
      {
        type:   'talk',
        target: 'nonna_anna',
        hint:   'Porta i funghetti a Nonna Anna per il risotto!',
      },
    ],
    offerDialog: [
      'Psst, Cecilia mia... 🍄',
      'Ho una voglia matta del risotto ai funghi!',
      'Trovi 5 funghetti e me li porti?',
    ],
    completionDialog: [
      'Funghetti freschi! Che bello! 🍄',
      'Stasera risotto per tutti, babbo compreso.',
      'Sei un tesoro, tieni le tue campane! 🔔',
    ],
    reward:  { coins: 80 },
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
        amount: 8,
        hint:   'Cerca 8 conchiglie 🐚 sulla spiaggia a sud!',
      },
      {
        type:   'talk',
        target: 'zia_debora',
        hint:   'Porta le conchiglie a Zia Debora!',
      },
    ],
    offerDialog: [
      'Ehi Cece, offerta speciale! 🐚',
      '8 conchiglie in cambio di campane sonanti.',
      'E ti faccio pure una collana. Affare fatto?',
    ],
    completionDialog: [
      'Conchiglie perfette! 🐚',
      'La collana sarà bellissima, come te!',
      'Campane per la mia socia. Affare fatto! 🔔',
    ],
    reward:  { coins: 120, item: 'collana_di_conchiglie' },
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
    reward:  { coins: 100 },
    seasons: [],
  },

  // ── Mamma Chiara — giro delle parole (solo 'talk') ────────────
  {
    id:          'q06_la_canzone_di_famiglia',
    giverNpc:    'mamma_chiara',
    title:       'La canzone di famiglia 🎶',
    description: 'La mamma vuole scrivere una canzone tutta per Cecilia, '
               + 'ma le serve una parola speciale da ogni componente della famiglia!',
    steps: [
      {
        type:   'talk',
        target: 'nonno_daniele',
        hint:   'Chiedi al nonno una parola per la canzone! 👴',
      },
      {
        type:   'talk',
        target: 'nonna_anna',
        hint:   'Ora chiedi una parola alla nonna! 👵',
      },
      {
        type:   'talk',
        target: 'zia_debora',
        hint:   'La zia avrà di sicuro un\u2019idea originale! 💡',
      },
      {
        type:   'talk',
        target: 'babbo_ale',
        hint:   'Chiedi al babbo di aiutarti con la musica! 🎸',
      },
      {
        type:   'talk',
        target: 'mamma_chiara',
        hint:   'Torna dalla mamma con tutte le parole raccolte!',
      },
    ],
    offerDialog: [
      'Cece, ho un\u2019idea fantastica! 🎵',
      'Voglio scrivere una canzone tutta per te...',
      'Mi porti una parola speciale da ognuno di famiglia?',
    ],
    completionDialog: [
      'Che parole bellissime, amore mio! 🎶',
      'Adesso la nostra canzone è perfetta.',
      'Ecco le tue campane, meritatissime! 🔔',
    ],
    reward:  { coins: 120 },
    seasons: [],
  },

  // ── Babbo Ale ─────────────────────────────────────────────────
  {
    id:          'q07_conchiglie_in_musica',
    giverNpc:    'babbo_ale',
    title:       'Conchiglie in musica 🎸',
    description: 'Il babbo vuole costruire un campanellino di conchiglie '
               + 'da appendere in veranda, che suoni con il vento!',
    steps: [
      {
        type:   'collect',
        target: 'shell',
        amount: 6,
        hint:   'Raccogli 6 conchiglie 🐚 sulla spiaggia!',
      },
      {
        type:   'talk',
        target: 'babbo_ale',
        hint:   'Porta le conchiglie al babbo!',
      },
    ],
    offerDialog: [
      'Cece, tesoro, senti questa idea! 🎸',
      'Voglio costruire un campanellino che suona col vento...',
      'Mi porti 6 conchiglie belle sonore?',
    ],
    completionDialog: [
      'Perfette, tesoro! 🐚',
      'Sentirai che musica quando appenderemo tutto in veranda!',
      'Ecco le tue campane, ben suonate! 🔔',
    ],
    reward:  { coins: 90 },
    seasons: ['estate'],
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