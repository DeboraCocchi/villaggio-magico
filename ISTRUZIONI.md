# 🗨️ Dialoghi NPC con AI gratuita — istruzioni di integrazione

## File nuovi / modificati

| File | Azione |
|------|--------|
| `src/data/npcDialogues.js` | **NUOVO** — dizionario: 10 dialoghi + personalità + argomenti per NPC |
| `src/store/useNpcMemoryStore.js` | **NUOVO** — memoria per-NPC (localStorage): dialoghi usati + cronologia |
| `src/api/dialogueAI.js` | **NUOVO** — AI gratuita (Gemini free tier) + logica pool→AI→riuso |
| `src/game/entities/NPC.js` | **SOSTITUISCI** — `interact()` usa `getNextNpcDialog()` |
| `src/api/claude.js` | può restare (non più usato) o essere eliminato |

## Setup della chiave gratuita (2 minuti)

1. Vai su https://aistudio.google.com/apikey (account Google, nessuna carta)
2. "Create API key" → copia la chiave
3. Nel file `.env` del progetto:
   ```
   VITE_GEMINI_API_KEY=la-tua-chiave
   ```
4. Riavvia `npm run dev`

Modello usato: `gemini-2.5-flash-lite` — free tier ~15 richieste/min e ~1000/giorno,
abbondante per il gioco. **Senza chiave o senza internet il gioco funziona lo stesso**:
usa i 10 dialoghi pre-scritti e poi li ricicla.

⚠️ Nota: i termini del free tier Gemini consentono a Google di usare i prompt per
migliorare i prodotti; per un gioco privato in famiglia va benissimo, ma non
distribuirlo pubblicamente con la chiave inclusa.

## Come funziona il flusso

```
Cecilia preme E vicino a un NPC
        │
        ▼
getNextNpcDialog(npcId, ...)
        │
   ci sono dialoghi pre-scritti non usati? ──sì──► pesca a caso, segna come usato
        │ no
        ▼
   chiama Gemini con: personalità + argomenti + stile
   + cronologia ultimi 6 dialoghi ("non ripeterli, riprendi gli argomenti")
        │
   errore / offline / limite? ──sì──► ricicla un dialogo del pool
        │ no
        ▼
   salva in cronologia → DialogBox
```

La memoria è in `localStorage` (chiave `villaggio-npc-memory`): sopravvive alla
chiusura del browser. Per azzerarla (nuova partita):
`useNpcMemoryStore.getState().resetAll()` dalla console.

## Personalizzare

Tutto in `src/data/npcDialogues.js`: cambia `personality`, `topics`,
`speechStyle` e le battute. Per aggiungere un NPC basta aggiungere la sua
chiave (uguale all'`id` in `villageConfig.js`) con lo stesso schema.

---

# 📜 Quest System (P04) — istruzioni di integrazione

## File nuovi / modificati (in aggiunta ai dialoghi AI)

| File | Azione |
|------|--------|
| `src/data/quests.js` | **RISCRITTO** — 5 missioni per i 3 NPC di famiglia (via bunny/fox/bear) |
| `src/store/useQuestStore.js` | **NUOVO** — tutta la logica di stato quest, persistita in localStorage |
| `src/game/managers/QuestManager.js` | **NUOVO** — glue Phaser: eventi raccolta + dialoghi offerta/completamento |
| `src/game/managers/ItemManager.js` | **PATCH** — `_collect()` ora emette `item:collected` per ogni oggetto |
| `src/game/entities/NPC.js` | **PATCH** — `interact()` prova prima il QuestManager, poi il dialogo normale |
| `src/components/QuestPanel.jsx` | **NUOVO** — pannello missioni HUD (alto a destra) + toast completamento |
| `src/App.jsx` | **PATCH** — monta `<QuestPanel />` |

## ⚠️ Unico intervento manuale: VillageScene.js (2 righe)

```js
// 1. In cima, con gli altri import dei manager:
import { QuestManager } from '../managers/QuestManager.js'

// 2. In create(), DOPO `this.npcManager = new NPCManager(this, map)` (riga ~351):
this.questManager = new QuestManager(this)

// 3. In shutdown(), con gli altri destroy (riga ~460):
this.questManager?.destroy()
```

(E in create()/constructor puoi aggiungere `this.questManager = null` per coerenza con gli altri.)

## Come funziona

```
Cecilia preme E vicino a un NPC
        │
        ▼
QuestManager.onNpcTalk(npcId)
   ├─ una quest attiva ha uno step 'talk' verso questo NPC?
   │     └─ ultimo step → COMPLETATA: dialogo di completamento,
   │        campane 🔔 aggiunte all'HUD, toast "🎉", item nell'inventario
   │     └─ step intermedio → "Evviva!" + suggerimento del prossimo passo
   ├─ l'NPC ha una quest nuova disponibile (stagione ok)?
   │     └─ la AVVIA e mostra il dialogo di offerta
   └─ niente di tutto ciò → null → dialogo normale (pool 10 + AI)
              └─ ma il contesto AI include la quest in corso,
                 così l'NPC può ricordarla a Cecilia spontaneamente!

Cecilia raccoglie un oggetto (🌸🐚🍎🍄)
        │
ItemManager emette 'item:collected' → QuestManager → useQuestStore
        │
QuestPanel aggiorna il contatore (es. "2/3") in tempo reale
```

Il pannello mostra anche la **missione del giorno** di ItemManager
(che era già emessa via `quest:dailyProgress` ma nessuno la mostrava).

## Bonus sistemato

Prima di questa patch **nessuno assegnava mai le campane** (l'HUD ascoltava
`player:coinCollected` ma l'evento non veniva emesso da nessuno). Ora le
quest completate accreditano le campane direttamente in `usePlayerStore`.

## Le 5 missioni

1. **La torta di Nonna Anna 🥧** — 3 frutti → consegna alla nonna (80 🔔)
2. **Fiori per la panchina 🌸** — 5 fiori → al nonno (100 🔔)
3. **Funghetti per il risotto 🍄** — il nonno chiede, si consegna alla NONNA (120 🔔)
4. **L'affare delle conchiglie 🐚** — 4 conchiglie → alla zia (90 🔔 + collana) — solo d'estate
5. **Il giro dei saluti 🗺️** — saluta nonno → nonna → zia in ordine (150 🔔)

Per aggiungerne altre basta un nuovo oggetto in `quests.js`: i target
'collect' devono essere `flower|shell|fruit|mushroom`, i target 'talk'
gli id NPC di `villageConfig.js`.

## Testato

La logica completa (avvio, progressi, step in sequenza, completamento,
campane, item, persistenza) è verificata con test automatici inclusi
in `test/quest-flow.test.mjs`.
