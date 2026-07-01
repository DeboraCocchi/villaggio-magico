/**
 * @file usePhaserEvent.js
 * Hook per ascoltare eventi emessi da Phaser verso React
 * tramite il meccanismo nativo dei CustomEvent su `window`.
 *
 * Questo approccio "window bridge" mantiene Phaser e React
 * completamente disaccoppiati: Phaser non importa nulla di React
 * e React non ha riferimenti diretti alle scene Phaser.
 *
 * ──────────────────────────────────────────────────────────────
 * Lato Phaser (emissione):
 * ```js
 * window.dispatchEvent(new CustomEvent('dialog:open', {
 *   detail: { npcKey: 'bunny', text: 'Ciao! 🐰' },
 * }));
 * ```
 *
 * Lato React (ricezione):
 * ```jsx
 * usePhaserEvent('dialog:open', ({ npcKey, text }) => {
 *   openDialog({ npcKey, text });
 * });
 * ```
 * ──────────────────────────────────────────────────────────────
 *
 * @module usePhaserEvent
 */

import { useEffect, useRef } from 'react';

/**
 * Ascolta un CustomEvent emesso da Phaser su `window` e chiama
 * `callback` con il payload `event.detail` ogni volta che l'evento
 * viene lanciato.
 *
 * Il listener viene rimosso automaticamente quando il componente
 * si smonta (cleanup dell'effect), prevenendo memory leak e
 * chiamate su componenti non montati.
 *
 * @param {string}   eventKey - Chiave del CustomEvent (es. `'dialog:open'`).
 * @param {Function} callback - Funzione chiamata con `event.detail` come argomento.
 *                              Può essere non stabile (creata inline): viene
 *                              aggiornata tramite ref senza re-subscribe.
 * @returns {void}
 *
 * @example
 * // Apri il dialogo quando Phaser lo richiede
 * usePhaserEvent('dialog:open', ({ npcKey, text }) => {
 *   setDialog({ open: true, npcKey, text });
 * });
 *
 * @example
 * // Aggiorna monete HUD quando il giocatore ne raccoglie
 * usePhaserEvent('player:coinCollected', ({ total }) => {
 *   setCoins(total);
 * });
 */
export function usePhaserEvent(eventKey, callback) {
  // Mantiene sempre la versione più recente del callback
  // senza dover re-aggiungere il listener ad ogni render.
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }); // nessun array di dipendenze → aggiorna ad ogni render

  useEffect(() => {
    /**
     * Handler interno che chiama il callback aggiornato.
     * @param {CustomEvent} event
     */
    function handler(event) {
      callbackRef.current(event.detail);
    }

    window.addEventListener(eventKey, handler);

    // Cleanup: rimuove il listener quando il componente si smonta
    // o quando `eventKey` cambia.
    return () => {
      window.removeEventListener(eventKey, handler);
    };
  }, [eventKey]); // re-subscribe solo se cambia la chiave dell'evento
}
