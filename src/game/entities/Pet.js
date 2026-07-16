import Phaser from 'phaser';
import { getIdleFrame } from '../utils/characterSpriteLayout.js';
import { isBlocked } from '../utils/mapCollision.js';

/**
 * @file Pet.js
 * Animale da compagnia del villaggio. Non è dialogante (nessun tasto E):
 * si muove da solo secondo il proprio `behavior`.
 *
 * Il movimento usa Phaser Tweens per una camminata fluida e continua.
 * I muri del layer "collision" vengono rispettati tramite isBlocked,
 * che testa la posizione di destinazione contro i corpi statici del world.
 *
 * Comportamenti supportati:
 *  - 'wander_near_home': gira a caso entro un raggio fisso da un punto
 *    "casa" (l'anchor passato dal PetManager, di solito la posizione
 *    dell'NPC umano proprietario nel layer "npcs" del TMJ).
 *  - 'follow_player': insegue la giocatrice restando a distanza,
 *    accelerando se resta troppo indietro.
 *
 * @module entities/Pet
 */

/** Raggio (px mappa) entro cui un pet 'wander_near_home' si allontana dall'anchor. */
const WANDER_RADIUS = 70;
/** Velocità (px/s) durante il vagabondare. */
const WANDER_SPEED = 28;
/** Distanza (px) sotto la quale il pet considera raggiunta la meta. */
const ARRIVE_DIST = 6;
/** Intervallo min/max (ms) tra una meta di vagabondaggio e la successiva. */
const WANDER_PAUSE_MS = [1200, 3200];

/** Distanza (px) che il pet 'follow_player' cerca di mantenere dalla giocatrice. */
const FOLLOW_STOP_DIST = 28;
/** Velocità minima/massima (px/s) di inseguimento: più lontano → più veloce. */
const FOLLOW_SPEED_MIN = 50;
const FOLLOW_SPEED_MAX = 210;

/** Semi-larghezza/semi-altezza della box di collisione del pet (px). */
const PET_HALF_W = 6;
const PET_HALF_H = 4;
/** Offset verticale della box rispetto al centro dello sprite (i piedi). */
const PET_FOOT_OFFSET_Y = 5;

export class Pet extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {{name:string, animal:string, behavior:string, spriteKey?:string}} petConfig
   * @param {{x:number, y:number}} anchor Punto di riferimento per 'wander_near_home'.
   */
  constructor(scene, x, y, petConfig, anchor) {
    super(scene, x, y);

    this.petName = petConfig.name;
    this.behavior = petConfig.behavior ?? 'wander_near_home';
    this.anchor = anchor ?? { x, y };

    this._facing = 'down';
    this._wanderTarget = null;
    this._wanderWaitUntil = 0;
    this._activeTween = null;
    this._lastFollowTarget = null;

    /**
     * true dopo destroy() o dopo che Phaser ha distrutto questo Container
     * (shutdown/restart della scena). Ogni update esce subito se true.
     * @type {boolean}
     */
    this._destroyed = false;

    // Sprite dedicato (villageConfig pet.spriteKey) se caricato, altrimenti
    // sprite generico per specie, altrimenti un rettangolo colorato.
    const spriteKey = petConfig.spriteKey;
    const genericKey = `npc_${petConfig.animal}`;
    const resolvedKey = scene.textures.exists(spriteKey) ? spriteKey
      : scene.textures.exists(genericKey) ? genericKey
      : null;

    if (resolvedKey) {
      this.sprite = scene.add.sprite(0, 0, resolvedKey, 1);
      const idleKey = `${resolvedKey}_idle`;
      if (scene.anims.exists(idleKey)) this.sprite.play(idleKey);
      this._animKey = resolvedKey;
    } else {
      this.sprite = scene.add.rectangle(0, 0, 16, 16, 0xdddddd);
      this._animKey = null;
    }

    const nameTag = scene.add.text(0, -18, petConfig.name, {
      fontSize:   '9px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      color:      '#4a3728',
      backgroundColor: 'rgba(255,255,255,0.7)',
      padding:    { x: 3, y: 0 },
    }).setOrigin(0.5);

    this.add([this.sprite, nameTag]);
    this.setDepth(y + 151);

    scene.add.existing(this);

    // Se è Phaser a distruggere il Container (scene.shutdown), marchiamo il
    // pet come morto: update() smette di toccare scene/sprite già azzerati.
    this.once(Phaser.GameObjects.Events.DESTROY, () => { this._destroyed = true; });
  }

  /**
   * true se questo pet (o il suo sprite) è stato distrutto da Phaser.
   * @returns {boolean}
   */
  get isDestroyed() {
    return this._destroyed || !this.scene || !this.sprite || !this.sprite.scene;
  }

  /**
   * Va richiamato ogni frame da PetManager.
   * @param {number} delta ms dall'ultimo frame (this.scene.game.loop.delta)
   * @param {number} playerX
   * @param {number} playerY
   * @param {'down'|'left'|'right'|'up'} [playerFacing] Direzione attuale della
   *   giocatrice — usata dai pet 'follow_player' per restare sempre orientati
   *   come lei, a prescindere dalla direzione di avvicinamento.
   */
  update(delta, playerX, playerY, playerFacing) {
    if (this.isDestroyed) return;

    if (this.behavior === 'follow_player') {
      this._updateFollowPlayer(delta, playerX, playerY, playerFacing);
    } else {
      this._updateWanderNearHome(delta);
    }
    this.setDepth(this.y + 151);
  }

  /** @private */
  _updateFollowPlayer(delta, playerX, playerY, playerFacing) {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const facing = playerFacing ?? this._facing;

    if (dist <= FOLLOW_STOP_DIST) {
      this._playIdle(facing);
      this._stopMovement();
      return;
    }

    // Più è lontano, più corre per riprendere la giocatrice.
    const speed = Phaser.Math.Clamp(dist * 1.4, FOLLOW_SPEED_MIN, FOLLOW_SPEED_MAX);
    this._moveTowardSmooth(playerX, playerY, dist, speed);
    // L'orientamento segue sempre quello della giocatrice, non la direzione
    // di avvicinamento del pet (che potrebbe differire, es. se è in diagonale).
    this._playWalk(facing);
  }

  /** @private */
  _updateWanderNearHome(delta) {
    if (this.isDestroyed || !this.scene?.time) return;

    const now = this.scene.time.now;

    if (!this._wanderTarget && now >= this._wanderWaitUntil) {
      this._pickNewWanderTarget();
    }

    if (this._wanderTarget) {
      const dx = this._wanderTarget.x - this.x;
      const dy = this._wanderTarget.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= ARRIVE_DIST) {
        this._wanderTarget = null;
        this._wanderWaitUntil = now + Phaser.Math.Between(...WANDER_PAUSE_MS);
        this._playIdle();
        this._stopMovement();
        return;
      }

      const blocked = this._checkCollisionPath(this._wanderTarget.x, this._wanderTarget.y);

      // Muro sulla strada: la meta è irraggiungibile, ne scegliamo un'altra
      // subito invece di restare a grattare contro il muro.
      if (blocked) {
        this._wanderTarget = null;
        this._wanderWaitUntil = now + Phaser.Math.Between(300, 900);
        this._playIdle();
        this._stopMovement();
        return;
      }

      this._moveTowardSmooth(this._wanderTarget.x, this._wanderTarget.y, dist, WANDER_SPEED);

      const facing = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
      this._playWalk(facing);
    } else {
      this._playIdle();
    }
  }

  /** @private */
  _pickNewWanderTarget() {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.FloatBetween(WANDER_RADIUS * 0.3, WANDER_RADIUS);
    this._wanderTarget = {
      x: this.anchor.x + Math.cos(angle) * radius,
      y: this.anchor.y + Math.sin(angle) * radius,
    };
  }

  /**
   * Muove il pet verso una destinazione con un tween fluido.
   * Ricrea il tween solo se la destinazione è cambiata di almeno 5px.
   * @private
   */
  _moveTowardSmooth(targetX, targetY, dist, speed) {
    if (!this.scene) return;

    // Controlla se il target è cambiato significativamente
    if (this._lastFollowTarget) {
      const dx = targetX - this._lastFollowTarget.x;
      const dy = targetY - this._lastFollowTarget.y;
      const targetDist = Math.sqrt(dx * dx + dy * dy);
      if (targetDist < 5) return; // Target non è cambiato abbastanza, mantieni il tween attuale
    }

    this._lastFollowTarget = { x: targetX, y: targetY };
    this._stopMovement();

    const duration = (dist / speed) * 1000;
    if (duration <= 0) return;

    this._activeTween = this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Power2.easeOut',
    });
  }

  /**
   * Controlla se c'è un ostacolo diretto verso il target.
   * Ritorna true se il cammino è bloccato.
   * @private
   */
  _checkCollisionPath(targetX, targetY) {
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const x = this.x + (targetX - this.x) * (i / steps);
      const y = this.y + (targetY - this.y) * (i / steps);
      const cy = y + PET_FOOT_OFFSET_Y;
      if (isBlocked(this.scene, x, cy, PET_HALF_W, PET_HALF_H)) return true;
    }
    return false;
  }

  /**
   * Ferma il tween di movimento attivo.
   * @private
   */
  _stopMovement() {
    if (this._activeTween) {
      this._activeTween.stop();
      this._activeTween = null;
    }
  }

  /**
   * @private
   * @returns {boolean} true se sprite è uno Sprite vivo con il component anims.
   */
  _canAnimate() {
    return !this.isDestroyed && !!this._animKey && !!this.sprite?.anims && !!this.scene?.anims;
  }

  /** @private */
  _playWalk(facing) {
    this._facing = facing;
    if (!this._canAnimate()) return;
    const key = `${this._animKey}_walk_${facing}`;
    if (this.scene.anims.exists(key)) this.sprite.play(key, true);
  }

  /**
   * Ferma l'animazione e mostra il frame statico rivolto in `facing`
   * (default: l'ultima direzione nota) — usa getIdleFrame invece
   * dell'anim generica per restare corretto anche per gli sprite con
   * righe sinistra/destra invertite (es. npc_bunny).
   * @private
   */
  _playIdle(facing = this._facing) {
    this._facing = facing;
    if (!this._canAnimate()) return;
    this.sprite.anims.stop();
    this.sprite.setFrame(getIdleFrame(this._animKey, facing));
  }

  destroy(fromScene) {
    this._destroyed = true;
    this._stopMovement();
    this._wanderTarget = null;
    super.destroy(fromScene);
    this.sprite = null;
  }
}