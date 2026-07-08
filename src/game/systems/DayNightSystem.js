import Phaser from 'phaser';
import { emitToReact } from '../utils/phaserBridge.js';
import { SeasonalDaylight } from '../utils/SeasonalDaylight.js';

/**
 * @file DayNightSystem.js
 * Overlay visivo alba/giorno/tramonto/notte guidato dall'orologio REALE
 * del dispositivo (non un ciclo di gioco accelerato), crossfade musicale
 * giorno/notte tramite AudioManager, e luci alle finestre delle case
 * che si accendono di notte.
 *
 * L'overlay è un rettangolo full-screen fissato alla camera, disegnato
 * in blend mode MULTIPLY (scurisce mantenendo i colori della scena
 * sottostanti, invece di stenderci sopra un velo piatto) e interpolato
 * tra keyframe così la transizione è graduale e non a scatti.
 *
 * Le luci delle case vengono disegnate a una profondità superiore
 * all'overlay, così restano ben visibili e "bucano" il buio invece di
 * essere scurite anche loro.
 *
 * @module systems/DayNightSystem
 */

/**
 * Keyframe stagionali: colore/opacità dell'overlay per ogni stagione italiana.
 * Ogni stagione ha alba/tramonto a orari diversi (Roma ~41°N).
 * Notte: blu-violetta profonda (0x0d1f3c) per atmosfera realistica.
 * @type {Object<string, Array<{hour: number, color: number, alpha: number}>>}
 */
const SEASONAL_KEYFRAMES = {
  inverno: [
    // Dicembre–Febbraio: giorni corti (alba ~7:30, tramonto ~16:45)
    { hour: 0,    color: 0x0d1f3c, alpha: 0.68 }, // notte blu-violetta
    { hour: 7,    color: 0x0d1f3c, alpha: 0.68 },
    { hour: 7.5,  color: 0x4a5f8f, alpha: 0.35 }, // alba: blu freddo
    { hour: 8.5,  color: 0xffffff, alpha: 0    }, // giorno pieno
    { hour: 16.5, color: 0xffffff, alpha: 0    }, // giorno pieno (fine)
    { hour: 17,   color: 0xff8c5a, alpha: 0.38 }, // tramonto: arancione
    { hour: 17.5, color: 0x5f4a8f, alpha: 0.45 }, // crepuscolo: viola
    { hour: 18,   color: 0x0d1f3c, alpha: 0.68 }, // notte blu-violetta
    { hour: 24,   color: 0x0d1f3c, alpha: 0.68 },
  ],

  primavera: [
    // Marzo–Maggio: giorni allungati (alba ~6:00→4:45, tramonto ~18:00→19:15)
    { hour: 0,    color: 0x0d1f3c, alpha: 0.68 },
    { hour: 4.5,  color: 0x0d1f3c, alpha: 0.68 },
    { hour: 5,    color: 0x6b7fb8, alpha: 0.32 }, // alba: blu-indaco
    { hour: 6.5,  color: 0xffffff, alpha: 0    }, // giorno pieno
    { hour: 19,   color: 0xffffff, alpha: 0    }, // giorno pieno (fine)
    { hour: 19.5, color: 0xff9d5c, alpha: 0.35 }, // tramonto: arancione caldo
    { hour: 20.2, color: 0x6b5f8f, alpha: 0.42 }, // crepuscolo: viola
    { hour: 21,   color: 0x0d1f3c, alpha: 0.68 },
    { hour: 24,   color: 0x0d1f3c, alpha: 0.68 },
  ],

  estate: [
    // Giugno–Agosto: giorni lunghi (alba ~4:45, tramonto ~21:00)
    { hour: 0,    color: 0x0d1f3c, alpha: 0.68 },
    { hour: 4,    color: 0x0d1f3c, alpha: 0.68 },
    { hour: 4.5,  color: 0x6b7fb8, alpha: 0.32 }, // alba: blu-indaco
    { hour: 5.5,  color: 0xffffff, alpha: 0    }, // giorno pieno
    { hour: 20.5, color: 0xffffff, alpha: 0    }, // giorno pieno (fine)
    { hour: 21,   color: 0xff9d5c, alpha: 0.28 }, // tramonto: arancione tenero
    { hour: 21.8, color: 0x6b5f8f, alpha: 0.40 }, // crepuscolo: viola
    { hour: 22.5, color: 0x0d1f3c, alpha: 0.68 },
    { hour: 24,   color: 0x0d1f3c, alpha: 0.68 },
  ],

  autunno: [
    // Settembre–Novembre: giorni accorciati (alba ~6:00→7:30, tramonto ~18:30→16:30)
    { hour: 0,    color: 0x0d1f3c, alpha: 0.68 },
    { hour: 6,    color: 0x0d1f3c, alpha: 0.68 },
    { hour: 6.5,  color: 0x6b7fb8, alpha: 0.33 }, // alba: blu-indaco
    { hour: 7.5,  color: 0xffffff, alpha: 0    }, // giorno pieno
    { hour: 18,   color: 0xffffff, alpha: 0    }, // giorno pieno (fine)
    { hour: 18.5, color: 0xff9d5c, alpha: 0.36 }, // tramonto: arancione
    { hour: 19.2, color: 0x5f4a8f, alpha: 0.43 }, // crepuscolo: viola
    { hour: 20,   color: 0x0d1f3c, alpha: 0.68 },
    { hour: 24,   color: 0x0d1f3c, alpha: 0.68 },
  ],
};

/** Finestra oraria [inizio,fine) considerata "diurna" (musica + luci spente). */
const DAY_START_HOUR = 6.5;
const DAY_END_HOUR   = 19.5;

/** Ogni quanto ricalcolare ora/overlay/musica (ms). */
const CHECK_INTERVAL_MS = 15000;

/** Durata del fade in/out delle luci e del cambio musica (ms). */
const TRANSITION_MS = 3000;

/** Profondità dell'overlay: sopra la mappa/player, sotto le luci case. */
const OVERLAY_DEPTH = 150;

/** Profondità delle luci: sopra l'overlay, per restare visibili nel buio. */
const HOUSE_LIGHT_DEPTH = 160;

export class DayNightSystem {
  /**
   * @param {Phaser.Scene}                          scene
   * @param {import('./AudioManager.js').AudioManager} [audioManager] - Se
   *   passato, gestisce il crossfade musicale giorno/notte automaticamente.
   * @param {Array<{x: number, y: number}>} [housePositions] - Coordinate
   *   (in pixel mappa) dove disegnare una luce di finestra accesa di notte.
   */
  constructor(scene, audioManager = null, housePositions = []) {
    /** @type {Phaser.Scene} */
    this.scene = scene;
    this.audioManager = audioManager;

    /** @type {boolean|null} Ultima fascia (giorno/notte) applicata, per evitare transizioni ripetute. */
    this._isDay = null;

    /** @type {string} Stagione corrente memorizzata. */
    this._currentSeason = SeasonalDaylight.getCurrentSeason();

    const { width, height } = scene.scale;
    /** @type {Phaser.GameObjects.Rectangle} */
    this.overlay = scene.add.rectangle(0, 0, width, height, 0xffffff, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(OVERLAY_DEPTH)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    /** @type {Phaser.GameObjects.Container[]} */
    this._houseLights = housePositions.map(({ x, y }) => this._createHouseLight(x, y));

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
   * Ricalcola overlay, musica e luci delle case in base all'ora reale
   * del dispositivo. Richiamato automaticamente ogni `CHECK_INTERVAL_MS`
   * da un timer interno.
   * @returns {void}
   */
  update() {
    const now  = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;

    // Controlla se la stagione è cambiata
    const season = SeasonalDaylight.getCurrentSeason(now);
    if (season !== this._currentSeason) {
      this._currentSeason = season;
    }

    const keyframes = this._getSeasonalKeyframes(this._currentSeason);
    const { color, alpha } = this._sampleOverlay(hour, keyframes);
    this.overlay.setFillStyle(color, alpha);

    const isDay = hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
    if (isDay !== this._isDay) {
      this._isDay = isDay;
      this.audioManager?.crossfadeTo(isDay ? 'bgm_day' : 'bgm_night', undefined, TRANSITION_MS);
      this._setHouseLightsOn(!isDay);
    }

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    emitToReact('world:timeChanged', { time: `${hh}:${mm}`, season: this._currentSeason });
  }

  /**
   * Ferma il timer, rimuove il listener di resize e distrugge overlay e luci.
   * Chiamare da `scene.shutdown()` per evitare timer/oggetti orfani.
   * @returns {void}
   */
  destroy() {
    this._timer?.remove();
    this.scene.scale.off('resize', this._handleResize);
    this.overlay?.destroy();
    for (const light of this._houseLights) light.destroy();
    this._houseLights = [];
  }

  // ─────────────────────────────────────────────────────────────────
  // Privato
  // ─────────────────────────────────────────────────────────────────

  /**
   * Crea una piccola luce calda (alone + nucleo) per una finestra di casa,
   * inizialmente spenta (alpha 0): si accende con un fade quando scende la notte.
   * Usa strati sovrapposti per simulare un effetto gradiente radiale (cono di luce).
   * @param {number} x
   * @param {number} y
   * @returns {Phaser.GameObjects.Container}
   * @private
   */
  _createHouseLight(x, y) {
    const container = this.scene.add.container(x, y);

    // Strato 1: Alone esteriore (trasparente, grande)
    const glow1 = this.scene.add.circle(0, 0, 20, 0xffe08a, 0.08)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Strato 2: Alone medio
    const glow2 = this.scene.add.circle(0, 0, 14, 0xffe08a, 0.15)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Strato 3: Alone principale
    const glow3 = this.scene.add.circle(0, 0, 8, 0xffe08a, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Strato 4: Nucleo brillante
    const core = this.scene.add.circle(0, 0, 3, 0xfff3c4, 0.95);

    container.add([glow1, glow2, glow3, core]);
    return container
      .setDepth(HOUSE_LIGHT_DEPTH)
      .setAlpha(0);
  }

  /**
   * Accende/spegne con un fade tutte le luci delle case.
   * @param {boolean} on
   * @private
   */
  _setHouseLightsOn(on) {
    for (const light of this._houseLights) {
      this.scene.tweens.add({
        targets:  light,
        alpha:    on ? 1 : 0,
        duration: TRANSITION_MS,
        ease:     'Linear',
      });
    }
  }

  /**
   * Interpola colore e alpha dell'overlay tra i due keyframe che
   * racchiudono `hour`, usando i keyframe della stagione corrente.
   * @param {number} hour - Ora frazionaria 0-24 (es. 14.5 = 14:30).
   * @param {Array<{hour: number, color: number, alpha: number}>} keyframes - Keyframe stagionali.
   * @returns {{color: number, alpha: number}}
   * @private
   */
  _sampleOverlay(hour, keyframes) {
    const frames = keyframes;
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
   * Restituisce l'array di keyframe per la stagione indicata.
   * @param {string} season - 'primavera'|'estate'|'autunno'|'inverno'
   * @returns {Array<{hour: number, color: number, alpha: number}>}
   * @private
   */
  _getSeasonalKeyframes(season) {
    return SEASONAL_KEYFRAMES[season] || SEASONAL_KEYFRAMES.primavera;
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
