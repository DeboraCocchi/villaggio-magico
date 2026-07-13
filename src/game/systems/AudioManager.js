import Phaser from 'phaser';

/**
 * @file AudioManager.js
 * Gestisce le tracce musicali di sottofondo e il crossfade tra loro
 * (es. musica diurna ↔ notturna) tramite tween del volume.
 *
 * Se una traccia richiesta non è stata caricata (asset audio mancante),
 * il crossfade viene ignorato silenziosamente: il gioco continua con la
 * traccia disponibile finché l'asset non viene aggiunto in preload.
 *
 * @module systems/AudioManager
 */

const DEFAULT_VOLUME  = 0.4;
const DEFAULT_FADE_MS = 4000;

export class AudioManager {
  /**
   * @param {Phaser.Scene} scene - Scena proprietaria (usa scene.sound/scene.tweens).
   */
  constructor(scene) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {Map<string, Phaser.Sound.BaseSound>} */
    this._tracks = new Map();

    /** @type {string|null} Chiave della traccia attualmente udibile. */
    this._currentKey = null;
  }

  // ─────────────────────────────────────────────────────────────────
  // API pubblica
  // ─────────────────────────────────────────────────────────────────

  /**
   * Avvia una traccia come base musicale, gestendo il blocco autoplay
   * del browser (attende il primo input utente se necessario).
   *
   * @param {string} key    - Chiave audio Phaser (già caricata in preload).
   * @param {number} [volume=DEFAULT_VOLUME]
   * @returns {void}
   */
  playBase(key, volume = DEFAULT_VOLUME) {
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`[AudioManager] Traccia "${key}" non trovata in cache`);
      return;
    }

    const track = this._getOrCreateTrack(key, volume);
    this._currentKey = key;

    if (this.scene.sound.locked) {
      this.scene.sound.once('unlocked', () => track.play());
    } else {
      track.play();
    }
  }

  /**
   * Esegue un crossfade morbido dalla traccia corrente a `key`.
   * Non fa nulla se `key` è già la traccia corrente o se non è caricata
   * in cache (asset non ancora aggiunto).
   *
   * @param {string} key
   * @param {number} [targetVolume=DEFAULT_VOLUME]
   * @param {number} [fadeMs=DEFAULT_FADE_MS]
   * @returns {void}
   */
  crossfadeTo(key, targetVolume = DEFAULT_VOLUME, fadeMs = DEFAULT_FADE_MS) {
    if (key === this._currentKey) return;
    if (!this.scene.cache.audio.exists(key)) return;

    const nextTrack = this._getOrCreateTrack(key, 0);
    const prevTrack = this._currentKey ? this._tracks.get(this._currentKey) : null;
    this._currentKey = key;

    const startFade = () => {
      nextTrack.play();

      this.scene.tweens.add({
        targets:  nextTrack,
        volume:   targetVolume,
        duration: fadeMs,
        ease:     'Linear',
      });

      if (prevTrack) {
        this.scene.tweens.add({
          targets:    prevTrack,
          volume:     0,
          duration:   fadeMs,
          ease:       'Linear',
          onComplete: () => prevTrack.stop(),
        });
      }
    };

    if (this.scene.sound.locked) {
      this.scene.sound.once('unlocked', startFade);
    } else {
      startFade();
    }
  }

  /**
   * Silenzia o riattiva tutte le tracce musicali.
   *
   * @param {boolean} enabled - true per riprodurre, false per silenziare.
   * @returns {void}
   */
  setMusicEnabled(enabled) {
    for (const track of this._tracks.values()) {
      if (enabled) {
        if (!track.isPlaying) track.play();
      } else {
        track.stop();
      }
    }
  }

  /**
   * Ferma e distrugge tutte le tracce gestite. Chiamare da
   * `scene.shutdown()` per evitare audio residuo tra un riavvio e l'altro.
   * @returns {void}
   */
  destroy() {
    for (const track of this._tracks.values()) {
      track.stop();
      track.destroy();
    }
    this._tracks.clear();
    this._currentKey = null;
  }

  // ─────────────────────────────────────────────────────────────────
  // Privato
  // ─────────────────────────────────────────────────────────────────

  /**
   * @param {string} key
   * @param {number} volume
   * @returns {Phaser.Sound.BaseSound}
   * @private
   */
  _getOrCreateTrack(key, volume) {
    let track = this._tracks.get(key);
    if (!track) {
      track = this.scene.sound.add(key, { loop: true, volume });
      this._tracks.set(key, track);
    }
    return track;
  }
}
