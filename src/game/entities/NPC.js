import Phaser from 'phaser';
import { getNextNpcDialog } from '@api/dialogueAI.js';
import { emitToReact } from '../utils/phaserBridge.js';
import { usePlayerStore } from '@store/usePlayerStore.js';
import { getIdleFrame } from '../utils/characterSpriteLayout.js';

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

/** Raggio (px mappa) entro cui un NPC umano vagabonda dalla sua posizione di spawn. */
const NPC_WANDER_RADIUS = 120;
/** Velocità (px/s) durante il vagabondare. */
const NPC_WANDER_SPEED = 45;
/** Distanza (px) sotto cui l'NPC considera raggiunta la meta. */
const NPC_ARRIVE_DIST = 8;
/** Intervallo min/max (ms) tra una meta di vagabondaggio e la successiva. */
const NPC_WANDER_PAUSE_MS = [2000, 5000];

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

    // Posizione di spawn: punto attorno cui l'NPC vagabondera'
    this._homeX = x;
    this._homeY = y;
    this._facing = 'down';
    this._wanderTarget = null;
    this._wanderWaitUntil = 0;

    // Usa lo spritesheet dedicato (villageConfig.spriteKey) se presente;
    // altrimenti ricade sullo spritesheet del player tinto col colore
    // dell'abitante, e in ultima istanza su un rettangolo grigio.
    const spriteKey = inhabitant.spriteKey;
    const hasOwnSprite = spriteKey && scene.textures.exists(spriteKey);
    this._animKey = hasOwnSprite ? spriteKey : null;
    this._usesPlayerFallback = !hasOwnSprite && scene.textures.exists('player');

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
    /** @type {Phaser.GameObjects.Sprite|Phaser.GameObjects.Rectangle} */
    this._sprite = sprite;

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
    this.setDepth(161);

    scene.add.existing(this);

    // Corpo fisico Matter.js: corpo dinamico che collide con muri e altri NPC.
    // Il Container (visuale) viene sincronizzato alla posizione del corpo ogni frame.
    this._body = scene.matter.add.circle(x, y, 10, {
      label:          'npc',
      frictionAir:    0.995,
      friction:       0,
      frictionStatic: 0,
      mass:           0.5,
      restitution:    0,
    });

    // Cambio direzione su collisione: memorizza la normale della collisione
    // come flag; il target di rimbalzo viene calcolato nel loop update()
    // per evitare di modificare corpi dentro il callback fisico.
    /** @type {{nx:number,ny:number}|null} */
    this._pendingBounce = null;
    this._collisionHandler = (event) => {
      if (this._busy || this._pendingBounce) return;
      for (const pair of event.pairs) {
        const isA = pair.bodyA === this._body;
        const isB = pair.bodyB === this._body;
        if (!isA && !isB) continue;
        // La normale punta da B verso A; se siamo il body B invertiamo
        const n = pair.collision.normal;
        this._pendingBounce = {
          nx: isA ?  n.x : -n.x,
          ny: isA ?  n.y : -n.y,
        };
        break;
      }
    };
    scene.matter.world.on('collisionstart', this._collisionHandler);
  }

  /**
   * Aggiorna posizione (sync col corpo fisico), vagabondaggio e animazione.
   * Va chiamato da NPCManager ogni frame.
   * @param {number} delta ms dall'ultimo frame
   */
  update(delta) { // eslint-disable-line no-unused-vars
    // Sincronizza il container al corpo fisico Matter
    this.x = this._body.position.x;
    this.y = this._body.position.y;
    this.setDepth(this.y + 161);

    // Azzera la rotazione fisica (previene lo spinning da collisioni)
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(this._body, 0);

    // Se sta parlando, resta fermo
    if (this._busy) {
      Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, { x: 0, y: 0 });
      this._playIdle();
      return;
    }

    // Rimbalzo da collisione: scegli target nella direzione della normale
    if (this._pendingBounce) {
      const { nx, ny } = this._pendingBounce;
      this._pendingBounce = null;
      Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, { x: 0, y: 0 });
      // Angolo di allontanamento = direzione normale ± fino a 60°
      const bounceAngle = Math.atan2(ny, nx)
        + (Math.random() - 0.5) * (Math.PI * 2 / 3);
      const dist = 40 + Math.random() * 50;
      this._wanderTarget = {
        x: this._body.position.x + Math.cos(bounceAngle) * dist,
        y: this._body.position.y + Math.sin(bounceAngle) * dist,
      };
      this._wanderWaitUntil = 0;
    }

    this._updateWander();
  }

  /** @private */
  _updateWander() {
    const now = this.scene.time.now;

    if (!this._wanderTarget && now >= this._wanderWaitUntil) {
      this._pickNewWanderTarget();
    }

    if (this._wanderTarget) {
      const dx = this._wanderTarget.x - this._body.position.x;
      const dy = this._wanderTarget.y - this._body.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= NPC_ARRIVE_DIST) {
        this._wanderTarget = null;
        this._wanderWaitUntil = now + Phaser.Math.Between(NPC_WANDER_PAUSE_MS[0], NPC_WANDER_PAUSE_MS[1]);
        Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, { x: 0, y: 0 });
        this._playIdle();
      } else {
        Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, {
          x: (dx / dist) * NPC_WANDER_SPEED,
          y: (dy / dist) * NPC_WANDER_SPEED,
        });
        const facing = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'down' : 'up');
        this._playWalk(facing);
      }
    } else {
      Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, { x: 0, y: 0 });
      this._playIdle();
    }
  }

  /** @private */
  _pickNewWanderTarget() {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.FloatBetween(NPC_WANDER_RADIUS * 0.3, NPC_WANDER_RADIUS);
    this._wanderTarget = {
      x: this._homeX + Math.cos(angle) * radius,
      y: this._homeY + Math.sin(angle) * radius,
    };
  }

  /** @private */
  _playWalk(facing) {
    this._facing = facing;
    if (this._animKey) {
      const key = `${this._animKey}_walk_${facing}`;
      if (this.scene.anims.exists(key)) this._sprite.play(key, true);
    } else if (this._usesPlayerFallback) {
      const key = `walk_${facing}`;
      if (this.scene.anims.exists(key)) this._sprite.play(key, true);
    }
  }

  /** @private */
  _playIdle(facing = this._facing) {
    this._facing = facing;
    if (this._animKey) {
      this._sprite.anims.stop();
      this._sprite.setFrame(getIdleFrame(this._animKey, facing));
    } else if (this._usesPlayerFallback) {
      const idleFrameByFacing = { down: 1, left: 4, right: 7, up: 10 };
      this._sprite.anims.stop();
      this._sprite.setFrame(idleFrameByFacing[facing] ?? 1);
    }
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

    // ── 1. Sistema quest: completamenti, avanzamenti o nuove offerte ──
    // Se il QuestManager ha qualcosa da dire (offerta/completamento),
    // il suo dialogo ha priorità sul dialogo normale.
    const questLines = this.scene.questManager?.onNpcTalk(this.id) ?? null;
    if (questLines) {
      emitToReact('dialog:open', { npcKey: this.id, npcName: this.residentName, messages: questLines });
      this._busy = false;
      return;
    }

    // ── 2. Dialogo normale: pool pre-scritto, poi AI gratuita ──
    const { name: playerName, season } = usePlayerStore.getState();

    const questHint = this.scene.questManager?.getHintForNpc(this.id) ?? '';
    const catchHint = this.catchphrase
      ? `Frase preferita di ${this.residentName}: "${this.catchphrase}". `
      : '';

    const lines = await getNextNpcDialog({
      npcId:      this.id,
      npcName:    this.residentName,
      playerName,
      season,
      context: `${catchHint}${questHint}`.trim(),
    });

    emitToReact('dialog:open', { npcKey: this.id, npcName: this.residentName, messages: lines });
    this._busy = false;
  }

  destroy(fromScene) {
    if (this._collisionHandler) {
      this.scene?.matter?.world?.off('collisionstart', this._collisionHandler);
      this._collisionHandler = null;
    }
    if (this._body) {
      this.scene?.matter?.world?.remove(this._body, true);
      this._body = null;
    }
    super.destroy(fromScene);
  }
}
