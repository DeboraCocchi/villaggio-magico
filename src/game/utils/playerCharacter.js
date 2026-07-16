/**
 * @file playerCharacter.js
 * Personaggi giocabili e helper condivisi per la scelta iniziale.
 *
 * Le scene (VillageScene, InteriorScene) NON conoscono la scelta:
 * leggono `registry.get('playerSpriteKey')` con fallback a
 * `getSavedPlayerKey()` (localStorage). Le animazioni globali
 * walk_down/left/right/up + idle vengono rigenerate sulla texture
 * scelta da `createPlayerAnimations`, quindi il resto del codice
 * continua a usare le stesse chiavi di sempre.
 *
 * @module utils/playerCharacter
 */

/** Chiave localStorage della scelta personaggio. */
export const PLAYER_SPRITE_STORAGE_KEY = 'villaggio-player-sprite';

/** Chiave nel Phaser Registry (condivisa tra le scene). */
export const PLAYER_SPRITE_REGISTRY_KEY = 'playerSpriteKey';

/**
 * Personaggi selezionabili nella AvatarScene.
 * `key` = chiave texture Phaser E nome file in public/assets/sprites/<key>.png
 * (stesso formato del player attuale: 96×128px, 3 col × 4 righe, frame 32×32).
 * Cambia liberamente le `label` mostrate sotto gli sprite.
 * @type {{ key: string, label: string }[]}
 */
export const PLAYER_CHARACTERS = [
  { key: 'player',  label: '🌸​'  },
  { key: 'player1', label: '⭐' },
  { key: 'player3', label: '​♥️​'   },
];

/**
 * Chiave sprite salvata, con fallback al primo personaggio.
 * @returns {string}
 */
export function getSavedPlayerKey() {
  try {
    const saved = window.localStorage.getItem(PLAYER_SPRITE_STORAGE_KEY);
    if (saved && PLAYER_CHARACTERS.some((c) => c.key === saved)) return saved;
  } catch { /* localStorage non disponibile: ignora */ }
  return PLAYER_CHARACTERS[0].key;
}

/**
 * Salva la scelta in localStorage.
 * @param {string} key
 */
export function savePlayerKey(key) {
  try {
    window.localStorage.setItem(PLAYER_SPRITE_STORAGE_KEY, key);
  } catch { /* ignora */ }
}

/**
 * (Ri)crea le animazioni globali del player sulla texture scelta.
 * Rimuove le eventuali walk_* e idle esistenti (magari create su un'altra
 * texture) e le ricrea: le chiavi restano identiche, quindi VillageScene
 * e InteriorScene non cambiano.
 *
 * Layout frame (96×128, 3 col × 4 righe):
 *   riga 0 (0–2):  walk_down · riga 1 (3–5):  walk_left
 *   riga 2 (6–8):  walk_right · riga 3 (9–11): walk_up
 *
 * @param {Phaser.Animations.AnimationManager} anims - `scene.anims` (globale).
 * @param {string} spriteKey - Texture scelta ('player'|'player1'|'player3').
 */
export function createPlayerAnimations(anims, spriteKey) {
  const directions = [
    { key: 'walk_down',  start: 0, end: 2  },
    { key: 'walk_left',  start: 3, end: 5  },
    { key: 'walk_right', start: 6, end: 8  },
    { key: 'walk_up',    start: 9, end: 11 },
  ];

  for (const { key, start, end } of directions) {
    if (anims.exists(key)) anims.remove(key);
    anims.create({
      key,
      frames: anims.generateFrameNumbers(spriteKey, { start, end }),
      frameRate: 8,
      repeat: -1,
    });
  }

  if (anims.exists('idle')) anims.remove('idle');
  anims.create({
    key: 'idle',
    frames: [{ key: spriteKey, frame: 1 }],
    frameRate: 1,
    repeat: -1,
  });
}