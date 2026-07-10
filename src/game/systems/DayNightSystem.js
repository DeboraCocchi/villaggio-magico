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
 * L'overlay è una texture canvas con un gradiente lineare orizzontale a
 * 3 stop (viola → magenta/rosso → arancio all'alba/tramonto, blu notte
 * profondo di notte), ridisegnata solo quando cambia il keyframe attivo
 * (ogni CHECK_INTERVAL_MS) — zero impatto sulle performance.
 *
 * Blend mode NORMAL (non MULTIPLY): con un gradiente a più colori,
 * MULTIPLY appiattisce le tinte vivaci di alba/tramonto in un impasto
 * grigiastro. Con NORMAL + alpha basso il colore resta vivo e "arioso",
 * e di notte il blu scuro con alpha alto scurisce comunque a sufficienza
 * la scena sottostante.
 *
 * Le luci delle case vengono disegnate a una profondità superiore
 * all'overlay, così restano ben visibili e "bucano" il buio invece di
 * essere scurite anche loro.
 *
 * @module systems/DayNightSystem
 */

/**
 * Keyframe stagionali: gradiente (3 stop esadecimali) + opacità
 * dell'overlay per ogni stagione italiana. Alba/tramonto a orari
 * diversi per stagione (Roma ~41°N).
 * @type {Object<string, Array<{hour: number, stops: [string,string,string], alpha: number}>>}
 */
const SEASONAL_KEYFRAMES = {
  inverno: [
    // Dicembre–Febbraio: giorni corti (alba ~7:30, tramonto ~16:45)
    { hour: 0,    stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 }, // notte
    { hour: 7,    stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
    { hour: 7.5,  stops: ['#233a63', '#5a5f8f', '#c98fae'], alpha: 0.34 }, // alba fredda
    { hour: 8.5,  stops: ['#ffffff', '#ffffff', '#ffffff'], alpha: 0    }, // giorno pieno
    { hour: 16.5, stops: ['#ffffff', '#ffffff', '#ffffff'], alpha: 0    },
    { hour: 17,   stops: ['#4a2f74', '#c9525a', '#e8935a'], alpha: 0.32 }, // tramonto
    { hour: 17.5, stops: ['#2a1f45', '#3d2a52', '#2f2050'], alpha: 0.42 }, // crepuscolo
    { hour: 18,   stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
    { hour: 24,   stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
  ],

  primavera: [
    // Marzo–Maggio: giorni allungati (alba ~6:00→4:45, tramonto ~18:00→19:15)
    { hour: 0,    stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
    { hour: 4.5,  stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
    { hour: 5,    stops: ['#28406e', '#6b7fb8', '#e0a98a'], alpha: 0.30 }, // alba
    { hour: 6.5,  stops: ['#ffffff', '#ffffff', '#ffffff'], alpha: 0    },
    { hour: 19,   stops: ['#ffffff', '#ffffff', '#ffffff'], alpha: 0    },
    { hour: 19.5, stops: ['#5b2f74', '#d1495b', '#f2a54f'], alpha: 0.30 }, // tramonto
    { hour: 20.2, stops: ['#2e1f4d', '#432a5c', '#33215a'], alpha: 0.40 }, // crepuscolo
    { hour: 21,   stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
    { hour: 24,   stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
  ],

  estate: [
    // Giugno–Agosto: giorni lunghi (alba ~4:45, tramonto ~21:00)
    { hour: 0,    stops: ['#122544', '#182c52', '#122544'], alpha: 0.64 }, // notte estiva, più mite
    { hour: 4,    stops: ['#122544', '#182c52', '#122544'], alpha: 0.64 },
    { hour: 4.5,  stops: ['#2a4373', '#7488c2', '#f2b98a'], alpha: 0.28 }, // alba dorata
    { hour: 5.5,  stops: ['#ffffff', '#ffffff', '#ffffff'], alpha: 0    },
    { hour: 20.5, stops: ['#ffffff', '#ffffff', '#ffffff'], alpha: 0    },
    { hour: 21,   stops: ['#6a2f6e', '#e2564a', '#f7b955'], alpha: 0.24 }, // tramonto acceso
    { hour: 21.8, stops: ['#331f52', '#4a2a63', '#382363'], alpha: 0.36 }, // crepuscolo
    { hour: 22.5, stops: ['#122544', '#182c52', '#122544'], alpha: 0.64 },
    { hour: 24,   stops: ['#122544', '#182c52', '#122544'], alpha: 0.64 },
  ],

  autunno: [
    // Settembre–Novembre: giorni accorciati (alba ~6:00→7:30, tramonto ~18:30→16:30)
    { hour: 0,    stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
    { hour: 6,    stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
    { hour: 6.5,  stops: ['#243d68', '#6478ae', '#dba888'], alpha: 0.32 }, // alba
    { hour: 7.5,  stops: ['#ffffff', '#ffffff', '#ffffff'], alpha: 0    },
    { hour: 18,   stops: ['#ffffff', '#ffffff', '#ffffff'], alpha: 0    },
    { hour: 18.5, stops: ['#4f2a63', '#c94f4a', '#e89a52'], alpha: 0.30 }, // tramonto
    { hour: 19.2, stops: ['#2a1d47', '#3e2856', '#301f52'], alpha: 0.41 }, // crepuscolo
    { hour: 20,   stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
    { hour: 24,   stops: ['#0a1526', '#0e1c34', '#0a1526'], alpha: 0.68 },
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

/** Chiave della texture canvas usata per il gradiente dell'overlay. */
const OVERLAY_TEXTURE_KEY = 'daynight-overlay';

export class DayNightSystem {
  /**
   * @param {Phaser.Scene}                          scene
   * @param {import('./AudioManager.js').AudioManager} [audioManager]
   * @param {Array<{x: number, y: number}>} [housePositions]
   */
  constructor(scene, audioManager = null, housePositions = []) {
    /** @type {Phaser.Scene} */
    this.scene = scene;
    this.audioManager = audioManager;

    /** @type {boolean|null} */
    this._isDay = null;

    /** @type {string} */
    this._currentSeason = SeasonalDaylight.getCurrentSeason();

    /** Ultimo gradiente calcolato: serve per ridisegnare dopo un resize
     * senza dover aspettare il prossimo tick di update(). */
    this._lastStops = ['#0a1526', '#0e1c34', '#0a1526'];
    this._lastAlpha = 0.68;

    const { width, height } = scene.scale;

    // Rimuove un'eventuale texture residua di una scena precedente
    // (restart/HMR) prima di ricrearla alla dimensione corrente.
    if (scene.textures.exists(OVERLAY_TEXTURE_KEY)) {
      scene.textures.remove(OVERLAY_TEXTURE_KEY);
    }
    /** @type {Phaser.Textures.CanvasTexture} */
    this._overlayTexture = scene.textures.createCanvas(OVERLAY_TEXTURE_KEY, width, height);

    /** @type {Phaser.GameObjects.Image} */
    this.overlay = scene.add.image(0, 0, OVERLAY_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(OVERLAY_DEPTH);
    // Nessun setBlendMode qui: resta NORMAL, per non sporcare i colori del gradiente.

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
   * Ricalcola gradiente overlay, musica e luci delle case in base
   * all'ora reale del dispositivo.
   * @returns {void}
   */
  update() {
    const now  = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;

    const season = SeasonalDaylight.getCurrentSeason(now);
    if (season !== this._currentSeason) {
      this._currentSeason = season;
    }

    const keyframes = this._getSeasonalKeyframes(this._currentSeason);
    const { stops, alpha } = this._sampleGradient(hour, keyframes);
    this._drawOverlay(stops, alpha);

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
   * Ferma il timer, rimuove listener/texture e distrugge overlay e luci.
   * Chiamare da `scene.shutdown()`.
   * @returns {void}
   */
  destroy() {
    this._timer?.remove();
    this.scene.scale.off('resize', this._handleResize);
    this.overlay?.destroy();
    if (this.scene.textures.exists(OVERLAY_TEXTURE_KEY)) {
      this.scene.textures.remove(OVERLAY_TEXTURE_KEY);
    }
    for (const light of this._houseLights) light.destroy();
    this._houseLights = [];
  }

  // ─────────────────────────────────────────────────────────────────
  // Privato
  // ─────────────────────────────────────────────────────────────────

  /**
   * Crea una piccola luce calda (alone + nucleo) per una finestra di casa.
   * Invariato rispetto alla tua versione.
   * @param {number} x
   * @param {number} y
   * @returns {Phaser.GameObjects.Container}
   * @private
   */
  _createHouseLight(x, y) {
    const container = this.scene.add.container(x, y);

    const glow1 = this.scene.add.circle(0, 0, 20, 0xffe08a, 0.08).setBlendMode(Phaser.BlendModes.ADD);
    const glow2 = this.scene.add.circle(0, 0, 14, 0xffe08a, 0.15).setBlendMode(Phaser.BlendModes.ADD);
    const glow3 = this.scene.add.circle(0, 0, 8,  0xffe08a, 0.35).setBlendMode(Phaser.BlendModes.ADD);
    const core  = this.scene.add.circle(0, 0, 3,  0xfff3c4, 0.95);

    container.add([glow1, glow2, glow3, core]);
    return container.setDepth(HOUSE_LIGHT_DEPTH).setAlpha(0);
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
   * Interpola i 3 stop del gradiente + l'alpha tra i due keyframe che
   * racchiudono `hour`, usando i keyframe della stagione corrente.
   * @param {number} hour - Ora frazionaria 0-24 (es. 14.5 = 14:30).
   * @param {Array<{hour: number, stops: [string,string,string], alpha: number}>} keyframes
   * @returns {{stops: [string,string,string], alpha: number}}
   * @private
   */
  _sampleGradient(hour, keyframes) {
    let a = keyframes[0];
    let b = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (hour >= keyframes[i].hour && hour <= keyframes[i + 1].hour) {
        a = keyframes[i];
        b = keyframes[i + 1];
        break;
      }
    }

    const span = b.hour - a.hour;
    const t    = span === 0 ? 0 : (hour - a.hour) / span;

    const stops = a.stops.map((hex, i) => this._lerpHex(hex, b.stops[i], t));
    const alpha = a.alpha + (b.alpha - a.alpha) * t;

    return { stops, alpha };
  }

  /**
   * Interpola due colori "#rrggbb" restituendo una stringa "rgb(r, g, b)"
   * utilizzabile direttamente in `addColorStop`.
   * @param {string} hexA
   * @param {string} hexB
   * @param {number} t - 0..1
   * @returns {string}
   * @private
   */
  _lerpHex(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    const r  = Math.round(ar + (br - ar) * t);
    const g  = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  /**
   * Ridisegna la texture canvas dell'overlay con un gradiente lineare
   * orizzontale a 3 stop (stessa logica del tuo CSS: 0% / 50% / 100%)
   * e applica l'alpha risultante all'immagine.
   * @param {[string,string,string]} stops
   * @param {number} alpha
   * @private
   */
  _drawOverlay(stops, alpha) {
    this._lastStops = stops;
    this._lastAlpha = alpha;

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const tex = this._overlayTexture;

    if (tex.width !== w || tex.height !== h) {
      tex.setSize(w, h);
    }

    const ctx = tex.getContext();
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0,   stops[0]);
    grad.addColorStop(0.5, stops[1]);
    grad.addColorStop(1,   stops[2]);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();

    // Riallinea sempre la dimensione visualizzata a quella della texture:
    // copre esattamente lo schermo, senza stretching (stesse dimensioni
    // in pixel di canvas e display).
    this.overlay.setDisplaySize(w, h);
    this.overlay.setAlpha(alpha);
  }

  /**
   * Restituisce l'array di keyframe per la stagione indicata.
   * @param {string} season - 'primavera'|'estate'|'autunno'|'inverno'
   * @returns {Array<{hour: number, stops: [string,string,string], alpha: number}>}
   * @private
   */
  _getSeasonalKeyframes(season) {
    return SEASONAL_KEYFRAMES[season] || SEASONAL_KEYFRAMES.primavera;
  }

  /**
   * Ridimensiona la texture dell'overlay quando cambia la dimensione
   * del canvas (Phaser.Scale.RESIZE, es. rotazione del tablet), usando
   * l'ultimo gradiente calcolato.
   * @param {Phaser.Structs.Size} gameSize
   * @private
   */
  _handleResize(gameSize) {
    this._drawOverlay(this._lastStops, this._lastAlpha);
  }
}