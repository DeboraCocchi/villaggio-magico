import Phaser from 'phaser';

/**
 * @file PreloadScene.js
 * Prima scena del gioco: carica tutti gli asset e mostra una barra
 * di caricamento. Al termine lancia 'VillageScene'.
 *
 * NOTA: tileset della mappa e player spritesheet sono caricati
 * direttamente in VillageScene.preload() — non duplicarli qui.
 */

// Costanti dimensioni frame spritesheet
const PLAYER_FRAME_W = 32;
const PLAYER_FRAME_H = 32;
const NPC_FRAME_W    = 32;
const NPC_FRAME_H    = 32;

/**
 * NPC disponibili — aggiungi una voce solo quando hai il file PNG.
 * File atteso: public/assets/sprites/npc_<key>.png
 * Lascia array vuoto finché non hai gli sprite.
 */
const NPC_KEYS = [
  // 'bunny',
  // 'cat',
  // 'dog',
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  // ─────────────────────────────────────────────────────────────────
  preload() {
    this._createLoadingUI();
    this._bindLoadingEvents();
    this._loadAssets();
  }

  // ─────────────────────────────────────────────────────────────────
  create() {
    this._createAnimations();
    this.scene.start('VillageScene'); 
  }

  // ─────────────────────────────────────────────────────────────────
  // UI di caricamento
  // ─────────────────────────────────────────────────────────────────

  /** @private */
  _createLoadingUI() {
    const { width, height } = this.scale;
    const cx = width  / 2;
    const cy = height / 2;

    this._barBg = this.add.rectangle(cx, cy, 320, 28, 0xfce4ec, 0.9)
      .setStrokeStyle(2, 0xf48fb1);

    this._bar = this.add.rectangle(cx - 158, cy, 0, 20, 0xf48fb1);
    this._bar.setOrigin(0, 0.5);

    this._loadText = this.add.text(cx, cy - 30, 'Preparando il villaggio... 🌸', {
      fontSize: '16px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      color: '#ad1457',
      align: 'center',
    }).setOrigin(0.5);

    this._percentText = this.add.text(cx, cy + 30, '0%', {
      fontSize: '13px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      color: '#c2185b',
      align: 'center',
    }).setOrigin(0.5);
  }

  /** @private */
  _bindLoadingEvents() {
    this.load.on('progress', (/** @type {number} */ value) => {
      this._bar.width = 316 * value;
      this._percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('fileprogress', (/** @type {Phaser.Loader.File} */ file) => {
      const messages = {
        image:       '🌿 Dipingendo i prati...',
        spritesheet: '🐾 Svegliando gli amici...',
        audio:       '🎵 Accordando la musica...',
        json:        '📜 Scrivendo le storie...',
        atlas:       '✨ Preparando la magia...',
      };
      this._loadText.setText(messages[file.type] ?? 'Preparando il villaggio... 🌸');
    });

    this.load.on('complete', () => {
      this._loadText.setText('Pronto! 🌸');
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Caricamento asset
  // ─────────────────────────────────────────────────────────────────

  /** @private */
  _loadAssets() {
    // NOTA: setPath qui NON viene usato perché i path sono misti
    // (alcuni con 'assets/', altri senza). Ogni load usa il path completo.

    // ── Mappa Tiled ───────────────────────────────────────────────
    // Il TMJ viene caricato qui così è disponibile prima che VillageScene
    // lo richieda. VillageScene fa make.tilemap({ key: 'villaggio' }).
    this.load.tilemapTiledJSON('villaggio', 'assets/villaggio.tmj');

    // ── Player ────────────────────────────────────────────────────
    // Female_22-2.png: 96×128px, 3 col × 4 righe, frame 32×32
    // (il caricamento è anche in VillageScene.preload per sicurezza,
    //  ma caricarlo qui evita il doppio load grazie alla cache Phaser)
    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth:  PLAYER_FRAME_W,   // 32
      frameHeight: PLAYER_FRAME_H,   // 32
    });

    // ── NPC animali ───────────────────────────────────────────────
    // Decommentare NPC_KEYS sopra quando hai i PNG
    for (const npc of NPC_KEYS) {
      this.load.spritesheet(`npc_${npc}`, `assets/sprites/npc_${npc}.png`, {
        frameWidth:  NPC_FRAME_W,
        frameHeight: NPC_FRAME_H,
      });
    }

    // ── Particelle ────────────────────────────────────────────────
    // Decommentare quando hai i file
    // this.load.image('particle_leaf',  'assets/particles/leaf.png');
    // this.load.image('particle_star',  'assets/particles/star.png');
    // this.load.image('particle_petal', 'assets/particles/petal.png');

    // ── Icone UI ──────────────────────────────────────────────────
    // Decommentare quando hai i file
    // this.load.image('icon_coin',  'assets/ui/coin.png');
    // this.load.image('icon_heart', 'assets/ui/heart.png');
    // this.load.image('icon_bell',  'assets/ui/bell.png');

    // ── Audio ─────────────────────────────────────────────────────
    // Traccia diurna (alba/giorno) — usata da AudioManager/DayNightSystem.
    this.load.audio('bgm_day', 'audio/lo_fi.mp3');

    // Traccia notturna (tramonto/notte): decommentare quando hai il file.
    // Finché manca, DayNightSystem resta sulla traccia diurna e cambia
    // solo l'overlay visivo.
    this.load.audio('bgm_night', 'audio/cozy-night.mp3');

    // Passi: decommentare quando hai il file
    this.load.audio('sfx_footstep', 'assets/audio/steps.wav');

    // Effetti: decommentare quando hai i file
    // this.load.audio('sfx_collect', 'assets/audio/collect.ogg');
    // this.load.audio('sfx_dialog',  'assets/audio/dialog.ogg');
  }

  // ─────────────────────────────────────────────────────────────────
  // Animazioni globali
  // ─────────────────────────────────────────────────────────────────

  /** @private */
  _createAnimations() {
    this._createPlayerAnimations();
    for (const npc of NPC_KEYS) {
      this._createNpcAnimations(npc);
    }
  }

  /**
   * Animazioni player — Female_22-2.png, 3 frame per direzione.
   * Stesse chiave usate in VillageScene (walk_down, walk_left, ecc.)
   * @private
   */
  _createPlayerAnimations() {
    // Salta se la texture non è stata caricata (sicurezza)
    if (!this.textures.exists('player')) return;

    const directions = [
      { key: 'walk_down',  frames: [0, 1, 2]   },
      { key: 'walk_left',  frames: [3, 4, 5]   },
      { key: 'walk_right', frames: [6, 7, 8]   },
      { key: 'walk_up',    frames: [9, 10, 11] },
      { key: 'idle',       frames: [1]          },
    ];

    for (const { key, frames } of directions) {
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('player', { frames }),
        frameRate: 8,
        repeat: key === 'idle' ? 0 : -1,
      });
    }
  }

  /**
   * Animazioni NPC — stessa struttura del player.
   * @param {string} npcKey
   * @private
   */
  _createNpcAnimations(npcKey) {
    if (!this.textures.exists(`npc_${npcKey}`)) return;

    const directions = [
      { suffix: 'down',  frames: [0, 1, 2]   },
      { suffix: 'left',  frames: [3, 4, 5]   },
      { suffix: 'right', frames: [6, 7, 8]   },
      { suffix: 'up',    frames: [9, 10, 11] },
    ];

    for (const { suffix, frames } of directions) {
      const key = `npc_${npcKey}_walk_${suffix}`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(`npc_${npcKey}`, { frames }),
        frameRate: 6,
        repeat: -1,
      });
    }
  }
}