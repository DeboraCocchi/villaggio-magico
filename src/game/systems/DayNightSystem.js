import Phaser from 'phaser';
import { emitToReact } from '../utils/phaserBridge.js';

/**
 * @file DayNightSystem.js
 * Overlay visivo alba/giorno/tramonto/notte guidato dall'orologio REALE
 * del dispositivo (non un ciclo di gioco accelerato), più crossfade
 * musicale giorno/notte tramite AudioManager.
 *
 * L'overlay è un rettangolo full-screen fissato alla camera che cambia
 * colore/opacità in base all'ora corrente, interpolando tra keyframe
 * così la transizione è graduale e non a scatti.
 *
 * @module systems/DayNightSystem
 */

/**
 * Keyframe colore/opacità dell'overlay per ora del giorno (0-24).
 * Interpolati linearmente tra keyframe adiacenti.
 * ✏️ Modifica qui gli orari/colori delle fasi.
 * @type {Array<{hour: number, color: number, alpha: number}>}
 */
const OVERLAY_KEYFRAMES = [
  { hour: 0,    color: 0x0a1a40, alpha: 0.55 }, // notte fonda
  { hour: 5,    color: 0x0a1a40, alpha: 0.55 }, // notte fonda (fine)
  { hour: 6.5,  color: 0xffb37a, alpha: 0.25 }, // alba
  { hour: 8,    color: 0xffffff, alpha: 0    }, // giorno pieno
  { hour: 18,   color: 0xffffff, alpha: 0    }, // giorno pieno (fine)
  { hour: 19.5, color: 0xff7043, alpha: 0.30 }, // tramonto
  { hour: 21,   color: 0x0a1a40, alpha: 0.55 }, // notte fonda
  { hour: 24,   color: 0x0a1a40, alpha: 0.55 }, // chiusura ciclo
];

/** Finestra oraria [inizio,fine) considerata "diurna" per la musica. */
const DAY_START_HOUR = 6.5;
const DAY_END_HOUR   = 19.5;

/** Ogni quanto ricalcolare ora/overlay/musica (ms). */
const CHECK_INTERVAL_MS = 15000;

export class DayNightSystem {
  /**
   * @param {Phaser.Scene}                          scene
   * @param {import('./AudioManager.js').AudioManager} [audioManager] - Se
   *   passato, gestisce il crossfade musicale giorno/notte automaticamente.
   */
  constructor(scene, audioManager = null) {
    /** @type {Phaser.Scene} */
    this.scene = scene;
    this.audioManager = audioManager;

    /** @type {boolean|null} Ultima fascia musicale applicata (per evitare crossfade ripetuti). */
    this._isDayMusic = null;

    const { width, height } = scene.scale;
    /** @type {Phaser.GameObjects.Rectangle} */
    this.overlay = scene.add.rectangle(0, 0, width, height, 0xffffff, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(150);

    this._handleResize = this._handleResize.bind(this);
    scene.scale.on('resize', this._handleResize);

    /** @type {Phaser.Time.TimerEvent} */
    this._timer = scene.time.addEvent({
      delay:    CHECK_INTERVAL_MS,
      loop:     true,
      callback: () => this.update(),
    });

    // Applica subito lo stato corrente, senza aspettare il primo tick.
    this.update();
  }

  // ─────────────────────────────────────────────────────────────────

  /**
   * Ricalcola overlay e musica in base all'ora reale del dispositivo.
   * Richiamato automaticamente ogni `CHECK_INTERVAL_MS` da un timer interno.
   * @returns {void}
   */
  update() {
    const now  = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;

    const { color, alpha } = this._sampleOverlay(hour);
    this.overlay.setFillStyle(color, alpha);

    const isDay = hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
    if (this.audioManager && isDay !== this._isDayMusic) {
      this._isDayMusic = isDay;
      this.audioManager.crossfadeTo(isDay ? 'bgm_day' : 'bgm_night');
    }

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    emitToReact('world:timeChanged', { time: `${hh}:${mm}` });
  }

  /**
   * Ferma il timer, rimuove il listener di resize e distrugge l'overlay.
   * Chiamare da `scene.shutdown()` per evitare timer orfani.
   * @returns {void}
   */
  destroy() {
    this._timer?.remove();
    this.scene.scale.off('resize', this._handleResize);
    this.overlay?.destroy();
  }

  // ─────────────────────────────────────────────────────────────────
  // Privato
  // ─────────────────────────────────────────────────────────────────

  /**
   * Interpola colore e alpha dell'overlay tra i due keyframe che
   * racchiudono `hour`.
   * @param {number} hour - Ora frazionaria 0-24 (es. 14.5 = 14:30).
   * @returns {{color: number, alpha: number}}
   * @private
   */
  _sampleOverlay(hour) {
    const frames = OVERLAY_KEYFRAMES;
    let a = frames[0];
    let b = frames[frames.length - 1];

    for (let i = 0; i < frames.length - 1; i++) {
      if (hour >= frames[i].hour && hour <= frames[i + 1].hour) {
        a = frames[i];
        b = frames[i + 1];
        break;
      }
    }

    const span = b.hour - a.hour;
    const t    = span === 0 ? 0 : (hour - a.hour) / span;

    const colorA = Phaser.Display.Color.ValueToColor(a.color);
    const colorB = Phaser.Display.Color.ValueToColor(b.color);
    const mixed  = Phaser.Display.Color.Interpolate.ColorWithColor(
      colorA, colorB, 100, Math.round(t * 100)
    );

    return {
      color: Phaser.Display.Color.GetColor(mixed.r, mixed.g, mixed.b),
      alpha: a.alpha + (b.alpha - a.alpha) * t,
    };
  }

  /**
   * Ridimensiona l'overlay quando cambia la dimensione del canvas
   * (Phaser.Scale.RESIZE, es. rotazione del tablet).
   * @param {Phaser.Structs.Size} gameSize
   * @private
   */
  _handleResize(gameSize) {
    this.overlay.setSize(gameSize.width, gameSize.height);
  }
}
