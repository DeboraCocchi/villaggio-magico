import Phaser from 'phaser';
import {
  PLAYER_CHARACTERS,
  PLAYER_SPRITE_REGISTRY_KEY,
  getSavedPlayerKey,
  savePlayerKey,
  createPlayerAnimations,
} from '../utils/playerCharacter.js';

/**
 * @file AvatarScene.js
 * Scena di scelta del personaggio (fase P01).
 *
 * Sfondo: cielo notturno 8-bit animato (stelle che brillano, luna,
 * qualche stella cadente). I tre spritesheet (player, player1, player3)
 * sono già caricati da PreloadScene; qui vengono mostrati animati
 * (walk_down di anteprima) e la scelta viene:
 *  - salvata in localStorage (PLAYER_SPRITE_STORAGE_KEY),
 *  - condivisa nel Registry (PLAYER_SPRITE_REGISTRY_KEY),
 *  - usata per (ri)creare le animazioni globali walk_* e idle.
 *
 * Poi parte VillageScene, che legge la chiave dal Registry.
 */

const IDLE_FRAME_DOWN = 1;
const PREVIEW_SCALE   = 3;

export class AvatarScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AvatarScene' });

    /** @type {string} Chiave sprite attualmente selezionata. */
    this.selectedKey = 'player';

    /** @type {Map<string, Phaser.GameObjects.Container>} Card per chiave sprite. */
    this._cards = new Map();

    /** @type {boolean} Evita doppio avvio durante il fade. */
    this._starting = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────

  create() {
    this.selectedKey = getSavedPlayerKey();
    this._starting   = false;
    this._cards.clear();

    const { width, height } = this.scale;

    this._createNightSky(width, height);
    this._createTitle(width);
    this._createCharacterCards(width, height);
    this._createConfirmButton(width, height);

    this._highlightSelected();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  // ─────────────────────────────────────────────────────────────────
  // SFONDO — cielo notturno 8-bit animato
  // ─────────────────────────────────────────────────────────────────

  /**
   * Gradiente notturno, stelle "pixel" che brillano, luna e
   * stelle cadenti periodiche.
   * @param {number} width
   * @param {number} height
   * @private
   */
  _createNightSky(width, height) {
    // Gradiente blu notte → indaco
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x0b1026, 0x0b1026, 0x1a1f4d, 0x241b52, 1);
    sky.fillRect(0, 0, width, height);

    // Stelle pixel (quadratini 2–3px) con twinkle sfalsato
    const STAR_COUNT = 70;
    for (let i = 0; i < STAR_COUNT; i++) {
      const size = Phaser.Math.Between(2, 3);
      const star = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height * 0.8),
        size, size,
        Phaser.Math.RND.pick([0xffffff, 0xfff3b0, 0xbfd7ff]),
      ).setDepth(1).setAlpha(Phaser.Math.FloatBetween(0.3, 1));

      this.tweens.add({
        targets:  star,
        alpha:    { from: star.alpha, to: 0.15 },
        duration: Phaser.Math.Between(800, 2200),
        yoyo:     true,
        repeat:   -1,
        delay:    Phaser.Math.Between(0, 1500),
      });
    }

    // Luna 8-bit: cerchio pieno + cerchio scuro sovrapposto (falce)
    const moonX = width * 0.82;
    const moonY = height * 0.18;
    const moon = this.add.graphics().setDepth(1);
    moon.fillStyle(0xfdf6d8, 1);
    moon.fillCircle(moonX, moonY, 26);
    moon.fillStyle(0x0b1026, 1);
    moon.fillCircle(moonX + 10, moonY - 8, 22);

    // Stella cadente ogni 4–7 secondi
    this._shootingStarTimer = this.time.addEvent({
      delay: Phaser.Math.Between(4000, 7000),
      loop:  true,
      callback: () => this._spawnShootingStar(width, height),
    });
  }

  /**
   * Piccola stella cadente diagonale con scia.
   * @param {number} width
   * @param {number} height
   * @private
   */
  _spawnShootingStar(width, height) {
    const startX = Phaser.Math.Between(width * 0.1, width * 0.9);
    const startY = Phaser.Math.Between(0, height * 0.3);

    const star = this.add.rectangle(startX, startY, 3, 3, 0xffffff)
      .setDepth(1);

    this.tweens.add({
      targets:  star,
      x:        startX + 140,
      y:        startY + 90,
      alpha:    0,
      duration: 700,
      ease:     'Quad.easeIn',
      onComplete: () => star.destroy(),
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────

  /**
   * @param {number} width
   * @private
   */
  _createTitle(width) {
    this.add.text(width / 2, this.scale.height * 0.14, '✨ Chi vuoi essere? ✨', {
      fontSize:   '28px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      color:      '#fce4ec',
      stroke:     '#ad1457',
      strokeThickness: 4,
      align:      'center',
    }).setOrigin(0.5).setDepth(2);
  }

  /**
   * Una card interattiva per ogni personaggio: sfondo arrotondato,
   * sprite animato (walk_down di anteprima) e nome.
   * @param {number} width
   * @param {number} height
   * @private
   */
  _createCharacterCards(width, height) {
    const count   = PLAYER_CHARACTERS.length;
    const spacing = Math.min(180, width / (count + 1));
    const startX  = width / 2 - (spacing * (count - 1)) / 2;
    const cardY   = height * 0.48;

    PLAYER_CHARACTERS.forEach(({ key, label }, i) => {
      const x = startX + spacing * i;

      const container = this.add.container(x, cardY).setDepth(2);

      // Sfondo card
      const bg = this.add.rectangle(0, 0, 120, 160, 0x1a1f4d, 0.85)
        .setStrokeStyle(3, 0x5c6bc0);
      container.add(bg);

      // Sprite anteprima animato
      if (this.textures.exists(key)) {
        const previewAnimKey = `avatar_preview_${key}`;
        if (!this.anims.exists(previewAnimKey)) {
          this.anims.create({
            key:       previewAnimKey,
            frames:    this.anims.generateFrameNumbers(key, { start: 0, end: 2 }),
            frameRate: 6,
            repeat:    -1,
          });
        }

        const sprite = this.add.sprite(0, -18, key, IDLE_FRAME_DOWN)
          .setScale(PREVIEW_SCALE);
        sprite.play(previewAnimKey);
        container.add(sprite);
      } else {
        console.warn(`[AvatarScene] Spritesheet "${key}" non caricato: controlla PreloadScene`);
      }

      // Nome
      const nameText = this.add.text(0, 58, label, {
        fontSize:   '16px',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        color:      '#fce4ec',
        fontStyle:  'bold',
      }).setOrigin(0.5);
      container.add(nameText);

      // Interattività (tap su tablet / click)
      bg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._selectCharacter(key));

      this._cards.set(key, container);
    });
  }

  /**
   * @param {number} width
   * @param {number} height
   * @private
   */
  _createConfirmButton(width, height) {
    const btnY = height * 0.78;

    const btnBg = this.add.rectangle(width / 2, btnY, 200, 52, 0xf48fb1)
      .setStrokeStyle(3, 0xfce4ec)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(width / 2, btnY, 'Inizia! 🌙', {
      fontSize:   '20px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      color:      '#ad1457',
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(3);

    // Pulsazione dolce del bottone
    this.tweens.add({
      targets:  [btnBg, btnText],
      scale:    { from: 1, to: 1.06 },
      duration: 900,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    btnBg.on('pointerdown', () => this._confirmSelection());
  }

  // ─────────────────────────────────────────────────────────────────
  // SELEZIONE
  // ─────────────────────────────────────────────────────────────────

  /**
   * @param {string} key
   * @private
   */
  _selectCharacter(key) {
    if (this.selectedKey === key) return;
    this.selectedKey = key;
    this._highlightSelected();
  }

  /**
   * Evidenzia la card selezionata (bordo rosa + leggero zoom).
   * @private
   */
  _highlightSelected() {
    for (const [key, container] of this._cards) {
      const bg = /** @type {Phaser.GameObjects.Rectangle} */ (container.list[0]);
      const isSelected = key === this.selectedKey;

      bg.setStrokeStyle(isSelected ? 4 : 3, isSelected ? 0xf48fb1 : 0x5c6bc0);
      bg.setFillStyle(isSelected ? 0x2a2f6d : 0x1a1f4d, isSelected ? 0.95 : 0.85);

      this.tweens.add({
        targets:  container,
        scale:    isSelected ? 1.1 : 1,
        duration: 180,
        ease:     'Quad.easeOut',
      });
    }
  }

  /**
   * Salva la scelta, rigenera le animazioni globali sulla texture
   * scelta e avvia VillageScene con fade.
   * @private
   */
  _confirmSelection() {
    if (this._starting) return;
    this._starting = true;

    savePlayerKey(this.selectedKey);
    this.registry.set(PLAYER_SPRITE_REGISTRY_KEY, this.selectedKey);

    // Animazioni globali walk_* e idle sulla texture scelta:
    // VillageScene e InteriorScene le usano senza modifiche.
    if (this.textures.exists(this.selectedKey)) {
      createPlayerAnimations(this.anims, this.selectedKey);
    }

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('VillageScene');
    });
  }

  // ─────────────────────────────────────────────────────────────────

  shutdown() {
    if (this._shootingStarTimer) {
      this._shootingStarTimer.remove();
      this._shootingStarTimer = null;
    }
    this._cards.clear();
  }
}