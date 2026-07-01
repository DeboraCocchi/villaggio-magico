import Phaser from 'phaser';

/**
 * @file AvatarScene.js
 * Scheletro della scena di personalizzazione avatar.
 *
 * Fase P00 (corrente): forward diretto a VillageScene.
 * Fase P01 (future):   UI di scelta nome + palette colori + accessori.
 *
 * Bridge Phaser → React:
 * Quando l'utente completa la scelta dell'avatar, questa scena
 * emette un CustomEvent 'avatar:ready' su `window` con i dati scelti.
 * Il componente React AvatarCustomizer (da implementare) lo ascolta
 * tramite usePhaserEvent.
 */
export class AvatarScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AvatarScene' });
  }

  // ─────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────

  create() {
    // ── P00: skip diretto a VillageScene ──────────────────────────
    // Rimuovere questo blocco quando si implementa la UI avatar (P01).
    this.scene.start('VillageScene');

    /* ── P01 placeholder ─────────────────────────────────────────
    //
    // 1. Segnala a React di mostrare l'overlay di personalizzazione.
    //    React gestirà nome, colori, accessori via Zustand.
    window.dispatchEvent(new CustomEvent('phaser:scene', {
      detail: { scene: 'AvatarScene' },
    }));
    //
    // 2. Ascolta la conferma da React
    this._onAvatarConfirmed = (e) => {
      this.registry.set('avatarData', e.detail);   // condivide dati via Registry
      this.scene.start('VillageScene');
    };
    window.addEventListener('react:avatarConfirmed', this._onAvatarConfirmed, { once: true });
    // ────────────────────────────────────────────────────────────── */
  }

  /**
   * Pulizia listener al momento in cui la scena viene fermata/rimossa.
   * Importante per evitare memory leak durante hot-reload.
   */
  shutdown() {
    if (this._onAvatarConfirmed) {
      window.removeEventListener('react:avatarConfirmed', this._onAvatarConfirmed);
    }
  }
}
