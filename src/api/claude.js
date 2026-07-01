/**
 * @file claude.js
 * Helper per chiamare l'API Claude (Anthropic) per generare
 * dialoghi NPC dinamici in italiano, adatti a bambini di 8 anni.
 *
 * La chiave API deve essere nell'env Vite: VITE_ANTHROPIC_API_KEY.
 * Non committare mai la chiave nel repository!
 *
 * @module api/claude
 */

/** Endpoint Anthropic Messages API. */
const API_URL = 'https://api.anthropic.com/v1/messages';

/** Modello da usare (sonnet = buon bilanciamento velocità/qualità). */
const MODEL = 'claude-sonnet-4-6';

/**
 * @typedef {Object} NpcDialogOptions
 * @property {string}   npcKey      - Chiave NPC (es. 'bunny').
 * @property {string}   npcName     - Nome NPC (es. 'Fiocco').
 * @property {string}   personality - Tratto caratteriale (es. 'timida').
 * @property {string}   playerName  - Nome della giocatrice.
 * @property {string}   season      - Stagione corrente.
 * @property {string}   [context]   - Contesto aggiuntivo (quest attiva, ora del giorno…).
 * @property {number}   [lines]     - Numero di righe di dialogo da generare (default 3).
 */

/**
 * Genera un dialogo NPC personalizzato usando Claude.
 *
 * Restituisce un array di stringhe, una per ogni "pagina" del dialogo
 * (da scorrere nella DialogBox).
 *
 * @param {NpcDialogOptions} options - Opzioni per il dialogo.
 * @returns {Promise<string[]>} Array di righe di dialogo.
 *
 * @example
 * const lines = await generateNpcDialog({
 *   npcKey:      'bunny',
 *   npcName:     'Fiocco',
 *   personality: 'timida',
 *   playerName:  'Sofia',
 *   season:      'primavera',
 *   lines:       3,
 * });
 * // → ['Eh... ciao Sofia! 😊', 'Stavo guardando i fiori rosa...', 'Sono proprio bellini!']
 */
export async function generateNpcDialog(options) {
  const {
    npcKey,
    npcName,
    personality,
    playerName,
    season,
    context = '',
    lines   = 3,
  } = options;

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[claude.js] VITE_ANTHROPIC_API_KEY non impostata. Uso dialogo di fallback.');
    return _fallbackDialog(npcName, playerName);
  }

  const systemPrompt = `
Sei ${npcName}, un personaggio animale carino in un villaggio stile Animal Crossing.
Il tuo carattere è: ${personality}.
Parli sempre in italiano, con un tono dolce e adatto a bambini di 6-10 anni.
Usi emoji semplici con moderazione (massimo 1-2 per frase).
Non menzioni mai violenza, paura o argomenti adulti.
Rispondi SOLO con un array JSON di stringhe, senza nessun testo fuori dal JSON.
Esempio: ["Ciao! 😊", "Come stai oggi?", "Il villaggio è bello!"]
`.trim();

  const userPrompt = `
Stagione: ${season}.
Nome della giocatrice: ${playerName}.
${context ? `Contesto: ${context}` : ''}
Genera esattamente ${lines} righe di dialogo brevi per ${npcName} (personaggio: ${npcKey}).
Ogni riga massimo 60 caratteri. Rispondi solo con il JSON array.
`.trim();

  try {
    const response = await fetch(API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 256,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? '[]';

    // Rimuove eventuali backtick Markdown prima di parsare
    const clean = rawText.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed)) throw new Error('Risposta non è un array');
    return parsed.map(String);

  } catch (error) {
    console.error('[claude.js] Errore generazione dialogo:', error);
    return _fallbackDialog(npcName, playerName);
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers privati
// ─────────────────────────────────────────────────────────────────

/**
 * Dialogo di fallback quando l'API non è disponibile.
 *
 * @param {string} npcName    - Nome NPC.
 * @param {string} playerName - Nome giocatrice.
 * @returns {string[]}
 * @private
 */
function _fallbackDialog(npcName, playerName) {
  return [
    `Ciao ${playerName}! 😊`,
    `Sono ${npcName}, benvenuta nel villaggio!`,
    `Spero che ti troverai bene qui! 🌸`,
  ];
}
