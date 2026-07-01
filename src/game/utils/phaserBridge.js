/**
 * @file phaserBridge.js
 * Utility per emettere CustomEvent su `window` da qualsiasi classe Phaser
 * (scene, entità, manager) verso i componenti React in ascolto.
 *
 * Convenzione chiavi eventi:
 *   'dominio:azione'  →  es. 'dialog:open', 'player:coinCollected'
 *
 * @module utils/phaserBridge
 */

/**
 * Emette un CustomEvent su `window` con un payload opzionale.
 * Usato dalle scene/entità Phaser per comunicare con React.
 *
 * @param {string} eventKey  - Chiave dell'evento (es. `'dialog:open'`).
 * @param {*}      [detail]  - Payload serializzabile da allegare all'evento.
 * @returns {void}
 *
 * @example
 * // In VillageScene, quando un NPC avvia un dialogo:
 * import { emitToReact } from '@game/utils/phaserBridge.js';
 *
 * emitToReact('dialog:open', {
 *   npcKey:   'bunny',
 *   messages: ['Ciao! 🐰', 'Come stai oggi?'],
 * });
 */
export function emitToReact(eventKey, detail) {
  window.dispatchEvent(new CustomEvent(eventKey, { detail: detail ?? null }));
}

/**
 * Aggiunge un listener su `window` per un evento React → Phaser.
 * Restituisce la funzione di cleanup da chiamare in `shutdown()`.
 *
 * @param {string}   eventKey - Chiave dell'evento.
 * @param {Function} handler  - Funzione chiamata con `event.detail`.
 * @returns {Function} Funzione di cleanup: richiama per rimuovere il listener.
 *
 * @example
 * // In AvatarScene.create():
 * this._cleanup = listenFromReact('react:avatarConfirmed', (data) => {
 *   this.registry.set('avatarData', data);
 *   this.scene.start('VillageScene');
 * });
 *
 * // In AvatarScene.shutdown():
 * this._cleanup();
 */
export function listenFromReact(eventKey, handler) {
  /**
   * @param {CustomEvent} event
   */
  function wrappedHandler(event) {
    handler(event.detail);
  }

  window.addEventListener(eventKey, wrappedHandler);

  // Restituisce il cleanup
  return () => window.removeEventListener(eventKey, wrappedHandler);
}
