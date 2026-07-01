import Phaser from 'phaser';
import { generateNpcDialog } from '@api/claude.js';
import { emitToReact } from '../utils/phaserBridge.js';
import { usePlayerStore } from '@store/usePlayerStore.js';

/**
 * @file NPC.js
 * NPC umano presso una casa del villaggio. Nessuno sprite dedicato è
 * disponibile: viene riusato lo spritesheet del player (frame idle) con
 * un tint colorato (da villageConfig.inhabitants[].color) per distinguere
 * ogni abitante, più un'etichetta col nome sopra la testa.
 *
 * Quando la giocatrice si avvicina, mostra un fumetto "premi E per
 * parlare"; alla pressione del tasto genera un breve dialogo in italiano
 * tramite Claude (src/api/claude.js) e lo inoltra a React via il bridge
 * window ('dialog:open'), che DialogBox.jsx già ascolta.
 *
 * @module entities/NPC
 */

/** Mappa nome colore (villageConfig) → tint esadecimale. */
const COLOR_TINT = {
  pink:   0xf48fb1,
  blue:   0x64b5f6,
  yellow: 0xffd54f,
  green:  0x81c784,
  purple: 0xba68c8,
  orange: 0xffb74d,
};

/** Raggio (px mappa) entro cui compare il fumetto "premi E". */
const INTERACT_RADIUS = 40;

export class NPC extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {import('@data/villageConfig.js').VILLAGE_CONFIG['inhabitants'][number]} inhabitant
   */
  constructor(scene, x, y, inhabitant) {
    super(scene, x, y);

    /** @type {string} */
    this.id = inhabitant.id;
    /** @type {string} */
    this.residentName = inhabitant.residentName;
    /** @type {string} */
    this.personality = inhabitant.npc?.personality ?? 'gentile e cordiale';
    /** @type {string} */
    this.catchphrase = inhabitant.npc?.catchphrase ?? '';

    /** true mentre è in corso una richiesta di dialogo (evita doppie chiamate). */
    this._busy = false;

    // Usa lo spritesheet dedicato (villageConfig.spriteKey) se presente;
    // altrimenti ricade sullo spritesheet del player tinto col colore
    // dell'abitante, e in ultima istanza su un rettangolo grigio.
    const spriteKey = inhabitant.spriteKey;
    const hasOwnSprite = spriteKey && scene.textures.exists(spriteKey);

    let sprite;
    if (hasOwnSprite) {
      sprite = scene.add.sprite(0, 0, spriteKey, 1);
      const idleKey = `${spriteKey}_idle`;
      if (scene.anims.exists(idleKey)) sprite.play(idleKey);
    } else if (scene.textures.exists('player')) {
      sprite = scene.add.sprite(0, 0, 'player', 1);
      sprite.setTint(COLOR_TINT[inhabitant.color] ?? 0xffffff);
    } else {
      sprite = scene.add.rectangle(0, 0, 20, 24, 0xcccccc);
    }

    const nameTag = scene.add.text(0, -22, inhabitant.residentName, {
      fontSize:   '10px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      color:      '#4a3728',
      backgroundColor: 'rgba(255,255,255,0.75)',
      padding:    { x: 4, y: 1 },
    }).setOrigin(0.5);

    /** @type {Phaser.GameObjects.Text} Fumetto interazione, nascosto finché non si è vicini. */
    this._prompt = scene.add.text(0, -36, 'premi E 💬', {
      fontSize:   '9px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      color:      '#ffffff',
      backgroundColor: '#4a3728',
      padding:    { x: 4, y: 2 },
    }).setOrigin(0.5).setVisible(false);

    this.add([sprite, nameTag, this._prompt]);
    this.setDepth(16);

    scene.add.existing(this);
  }

  /**
   * Aggiorna la visibilità del fumetto "premi E" in base alla distanza
   * dalla giocatrice. Va chiamato da NPCManager ogni frame.
   *
   * @param {number} playerX
   * @param {number} playerY
   * @returns {boolean} true se la giocatrice è in raggio di interazione.
   */
  updateProximity(playerX, playerY) {
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    const inRange = (dx * dx + dy * dy) <= INTERACT_RADIUS * INTERACT_RADIUS;
    this._prompt.setVisible(inRange && !this._busy);
    return inRange;
  }

  /**
   * Genera un dialogo (Claude, con fallback offline) e lo apre in DialogBox
   * tramite il bridge Phaser → React. Non fa nulla se una richiesta è già
   * in corso.
   * @returns {Promise<void>}
   */
  async interact() {
    if (this._busy) return;
    this._busy = true;
    this._prompt.setVisible(false);

    const { name: playerName, season } = usePlayerStore.getState();

    const lines = await generateNpcDialog({
      npcKey:      this.id,
      npcName:     this.residentName,
      personality: this.personality,
      playerName,
      season,
      context: this.catchphrase ? `Frase preferita di ${this.residentName}: "${this.catchphrase}"` : '',
      lines: 3,
    });

    emitToReact('dialog:open', { npcKey: this.id, npcName: this.residentName, messages: lines });
    this._busy = false;
  }
}
