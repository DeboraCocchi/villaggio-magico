/**
 * @file usePlayerStore.js
 * Store Zustand per i dati del giocatore mostrati nell'HUD.
 *
 * Phaser aggiorna i valori di gioco via bridge window (CustomEvent),
 * React li legge per visualizzarli nell'interfaccia.
 *
 * Il flusso audio è invece inverso: React è la fonte di verità
 * (l'utente muove lo slider) e notifica Phaser via AUDIO_EVENT.
 *
 * @module usePlayerStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Nome dell'evento window emesso quando cambia lo stato audio.
 * @constant {string}
 */
export const AUDIO_EVENT = 'villaggio:audio-change';

/**
 * Identificatori dei pannelli a scomparsa del dock.
 * @readonly
 * @enum {string}
 */
export const PANEL = {
  PLAYER: 'player',
  QUESTS: 'quests',
};

/**
 * @typedef {Object} PlayerState
 * @property {string}   name           - Nome della giocatrice.
 * @property {number}   coins          - Numero di monete campana correnti.
 * @property {number}   hearts         - Cuori vita/amicizia (0–5).
 * @property {string}   currentTime    - Ora nel gioco (es. '14:30').
 * @property {string}   season         - Stagione corrente ('primavera'|'estate'|'autunno'|'inverno').
 * @property {boolean}  musicEnabled   - Musica abilitata o meno.
 * @property {number}   volume         - Volume master 0–1.
 * @property {?string}  openPanel      - Pannello aperto (PANEL.*) oppure null se tutto chiuso.
 * @property {Function} setName        - Imposta il nome della giocatrice.
 * @property {Function} setCoins       - Imposta le monete.
 * @property {Function} setHearts      - Imposta i cuori.
 * @property {Function} setTime        - Imposta l'ora di gioco.
 * @property {Function} setSeason      - Imposta la stagione.
 * @property {Function} setMusicEnabled - Attiva/disattiva la musica.
 * @property {Function} toggleMusic    - Inverte lo stato della musica.
 * @property {Function} setVolume      - Imposta il volume (0–1).
 * @property {Function} togglePanel    - Switch: apre il pannello o lo richiude se già aperto.
 * @property {Function} closePanel     - Chiude qualunque pannello aperto.
 */

/**
 * Notifica Phaser dello stato audio corrente.
 * @param {{ musicEnabled: boolean, volume: number }} audio
 */
const emitAudio = ({ musicEnabled, volume }) => {
  window.dispatchEvent(
    new CustomEvent(AUDIO_EVENT, { detail: { musicEnabled, volume } })
  );
};

/**
 * Store per i dati del giocatore visibili nell'HUD React.
 *
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<PlayerState>>}
 */
export const usePlayerStore = create(
  persist(
    (set, get) => ({
      name:         'Cecilia',
      coins:        0,
      hearts:       3,
      currentTime:  '08:00',
      season:       'primavera',
      musicEnabled: true,
      volume:       0.7,
      openPanel:    null,

      /** @param {string} name */
      setName:   (name)   => set({ name }),

      /** @param {number} coins */
      setCoins:  (coins)  => set({ coins }),

      /** @param {number} hearts */
      setHearts: (hearts) => set({ hearts }),

      /** @param {string} time - Formato 'HH:MM'. */
      setTime:   (time)   => set({ currentTime: time }),

      /** @param {string} season */
      setSeason: (season) => set({ season }),

      /** @param {boolean} enabled */
      setMusicEnabled: (enabled) => {
        set({ musicEnabled: enabled });
        emitAudio(get());
      },

      toggleMusic: () => {
        set({ musicEnabled: !get().musicEnabled });
        emitAudio(get());
      },

      /** @param {number} volume - Clampato tra 0 e 1. */
      setVolume: (volume) => {
        const v = Math.min(1, Math.max(0, volume));
        set({ volume: v, musicEnabled: v > 0 });
        emitAudio(get());
      },

      /**
       * Comportamento switch: se il pannello richiesto è già aperto lo chiude,
       * altrimenti lo apre chiudendo l'altro (uno solo per volta sul tablet).
       * @param {string} panelId - Uno dei valori di PANEL.
       */
      togglePanel: (panelId) =>
        set({ openPanel: get().openPanel === panelId ? null : panelId }),

      closePanel: () => set({ openPanel: null }),
    }),
    {
      name: 'villaggio-player-prefs',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Solo le preferenze audio: coins/hearts/currentTime/season arrivano da
      // Phaser a ogni avvio, e openPanel deve ripartire sempre chiuso.
      partialize: (state) => ({
        musicEnabled: state.musicEnabled,
        volume:       state.volume,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Rehydrate preferenze fallito, uso i default', error);
          return;
        }
        if (state) emitAudio(state);
      },
    }
  )
);