/**
 * @file dialogueAI.js
 * Dialoghi NPC con AI **gratuita** (Google Gemini, free tier).
 *
 * STRATEGIA A 3 LIVELLI (in ordine):
 *  1. POOL   → i 10 dialoghi pre-scritti di npcDialogues.js, pescati a caso
 *              senza ripetizioni (memoria in useNpcMemoryStore, localStorage).
 *  2. AI     → esauriti i 10, chiama Gemini 2.5 Flash-Lite (free tier:
 *              nessuna carta di credito; chiave gratuita da
 *              https://aistudio.google.com/apikey → .env: VITE_GEMINI_API_KEY).
 *              Il prompt include personalità, argomenti, stile e la cronologia
 *              degli ultimi dialoghi → coerenza col personaggio garantita.
 *  3. RIUSO  → se l'AI non è raggiungibile (offline, niente chiave, limite
 *              raggiunto), riusa un dialogo del pool a caso: il gioco
 *              funziona SEMPRE, anche senza internet.
 *
 * Perché Gemini free tier: 15 richieste/minuto e ~1000 al giorno gratis,
 * più che sufficienti per un gioco famigliare su tablet. Nessun costo.
 *
 * @module api/dialogueAI
 */

import { NPC_DIALOGUES, GENERIC_DIALOG } from '@data/npcDialogues.js';
import { useNpcMemoryStore } from '@store/useNpcMemoryStore.js';

/** Modello gratuito con i limiti più generosi del free tier. */
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

/** Endpoint REST Gemini (supporta chiamate dal browser). */
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * @typedef {Object} NpcDialogRequest
 * @property {string} npcId      - Id NPC (chiave in NPC_DIALOGUES, es. 'nonno_daniele').
 * @property {string} npcName    - Nome visualizzato (es. 'Nonno Daniele').
 * @property {string} playerName - Nome della giocatrice (es. 'Cecilia').
 * @property {string} season     - Stagione corrente.
 * @property {string} [context]  - Contesto extra (quest attiva, ora del giorno…).
 */

/**
 * Restituisce il prossimo dialogo per un NPC:
 * pool pre-scritto finché disponibile, poi AI, con riuso come rete di sicurezza.
 *
 * @param {NpcDialogRequest} req
 * @returns {Promise<string[]>} Pagine di dialogo per la DialogBox.
 */
export async function getNextNpcDialog(req) {
  const profile = NPC_DIALOGUES[req.npcId];
  if (!profile) return GENERIC_DIALOG;

  const store = useNpcMemoryStore.getState();
  const memory = store.getMemory(req.npcId);

  // ── 1. POOL: dialoghi pre-scritti non ancora usati ──────────────
  const unused = profile.initialDialogs
    .map((lines, index) => ({ lines, index }))
    .filter(({ index }) => !memory.usedIndices.includes(index));

  if (unused.length > 0) {
    const pick = unused[Math.floor(Math.random() * unused.length)];
    store.markDialogUsed(req.npcId, pick.index, pick.lines);
    return pick.lines;
  }

  // ── 2. AI: genera un dialogo nuovo coerente col personaggio ─────
  const aiLines = await _generateWithGemini(req, profile, memory.history);
  if (aiLines) {
    store.addAiDialog(req.npcId, aiLines);
    return aiLines;
  }

  // ── 3. RIUSO: pool esaurito e AI non disponibile ────────────────
  const all = profile.initialDialogs;
  return all[Math.floor(Math.random() * all.length)];
}

// ─────────────────────────────────────────────────────────────────
// Helpers privati
// ─────────────────────────────────────────────────────────────────

/**
 * Chiama Gemini (free tier) e restituisce le pagine di dialogo,
 * o null in caso di errore/chiave mancante.
 *
 * @param {NpcDialogRequest} req
 * @param {import('@data/npcDialogues.js').NpcDialogueProfile} profile
 * @param {string[]} history - Ultimi dialoghi già detti dall'NPC.
 * @returns {Promise<string[]|null>}
 * @private
 */
async function _generateWithGemini(req, profile, history) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[dialogueAI] VITE_GEMINI_API_KEY non impostata: riuso il pool.');
    return null;
  }

  const historyBlock = history.length
    ? `DIALOGHI GIÀ DETTI (non ripeterli, ma puoi riprenderne gli argomenti):\n- ${history.join('\n- ')}`
    : '';

  const prompt = `
Sei ${req.npcName}, un personaggio di un videogioco cozy stile Animal Crossing.

PERSONALITÀ: ${profile.personality}
ARGOMENTI PREFERITI: ${profile.topics.join(', ')}
STILE DI PARLATO: ${profile.speechStyle}

REGOLE FERREE:
- Parli in italiano a ${req.playerName}, una bambina di 8 anni.
- Tono dolce, allegro, MAI paura, MAI violenza, MAI sesso o argomenti adulti.
- Resta SEMPRE nel personaggio: parla solo dei tuoi argomenti preferiti
  o di cose coerenti con la tua personalità.
- Massimo 1 emoji semplice per frase.
- Ogni frase massimo 55 caratteri.

CONTESTO: stagione ${req.season}. ${req.context ?? ''}
${historyBlock}

Genera UN nuovo breve dialogo di esattamente 3 frasi.
Rispondi SOLO con un array JSON di 3 stringhe, nessun altro testo.
Esempio: ["Ciao! 😊", "Che bella giornata!", "A presto!"]
`.trim();

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,          // varietà tra un dialogo e l'altro
          maxOutputTokens: 200,
          responseMimeType: 'application/json', // forza output JSON puro
        },
      }),
    });

    if (!response.ok) {
      // 429 = limite free tier raggiunto → il chiamante riusa il pool
      console.warn(`[dialogueAI] Gemini HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const clean = raw.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.slice(0, 3).map(String);

  } catch (error) {
    console.error('[dialogueAI] Errore Gemini:', error);
    return null;
  }
}
