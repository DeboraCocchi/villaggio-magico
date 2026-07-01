# 🌸 Animal Village — Gioco personalizzato per bambine

Un gioco 2D stile Animal Crossing costruito con **Vite + React 18 + Phaser 3 + Zustand**.

## Stack

| Layer        | Tecnologia              |
|-------------|-------------------------|
| Build tool  | Vite 5                  |
| UI overlay  | React 18                |
| Game engine | Phaser 3.60+            |
| State mgmt  | Zustand 4.5             |
| Dialoghi AI | Claude API (Anthropic)  |
| Linguaggio  | JavaScript (JSDoc)      |

## Struttura cartelle

```
src/
├── game/
│   ├── scenes/        ← PreloadScene, AvatarScene, VillageScene
│   ├── entities/      ← Player, NPC, CollectibleItem
│   ├── generators/    ← MapGenerator, PRNG
│   ├── managers/      ← ItemManager, NPCManager
│   ├── systems/       ← DayNightSystem, AudioManager
│   └── utils/         ← phaserBridge.js + helpers
├── components/        ← HUD.jsx, DialogBox.jsx (overlay React)
├── store/             ← useDialogStore.js, usePlayerStore.js
├── hooks/             ← usePhaserEvent.js
├── data/              ← villageConfig.js, quests.js
└── api/               ← claude.js (dialoghi NPC AI)
```

## Setup rapido

```bash
# 1. Installa dipendenze
npm install

# 2. Crea il file .env
cp .env.example .env
# → Inserisci la tua VITE_ANTHROPIC_API_KEY

# 3. Avvia in sviluppo
npm run dev

# 4. Build produzione
npm run build
```

## Asset richiesti

Crea la cartella `public/assets/` con:
```
public/assets/
├── tilemaps/
│   ├── village_tileset.png     ← tileset 16×16 px
│   └── village_map.json        ← mappa Tiled JSON
├── sprites/
│   ├── player.png              ← spritesheet 4dir × 3frame @ 16×16
│   ├── npc_bunny.png
│   ├── npc_fox.png
│   ├── npc_bear.png
│   ├── npc_cat.png
│   └── npc_duck.png
├── particles/
│   ├── leaf.png
│   ├── star.png
│   └── petal.png
├── ui/
│   ├── coin.png
│   ├── heart.png
│   └── bell.png
└── audio/
    ├── village_theme.ogg
    ├── footstep.ogg
    ├── collect.ogg
    └── dialog.ogg
```

## Bridge Phaser ↔ React

La comunicazione usa `CustomEvent` su `window` — zero accoppiamento.

**Phaser → React** (da qualsiasi scena/entità):
```js
import { emitToReact } from '@game/utils/phaserBridge.js';
emitToReact('dialog:open', { npcKey: 'bunny', messages: ['Ciao! 🐰'] });
```

**React → ascolta** (in qualsiasi componente):
```js
import { usePhaserEvent } from '../hooks/usePhaserEvent.js';
usePhaserEvent('dialog:open', ({ npcKey, messages }) => { /* ... */ });
```

## Fasi di sviluppo

| Fase | Contenuto                                          |
|------|----------------------------------------------------|
| P00  | ✅ Scaffolding completo (questo commit)             |
| P01  | AvatarScene UI + MapGenerator + tilemap            |
| P02  | Player + NPC + camera + input                      |
| P03  | ItemManager + collezionabili + DayNightSystem       |
| P04  | Quest system + dialoghi AI Claude                  |
| P05  | Audio, polish, effetti particelle                  |
