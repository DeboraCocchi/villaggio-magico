import Phaser from 'phaser';

/**
 * @file Player.js
 * Entità giocatore: sprite con fisica arcade, input da tastiera/touch,
 * animazioni direzionali e sistema di collisioni.
 *
 * @module entities/Player
 */

/**
 * Entità Player.
 * Estende Phaser.Physics.Arcade.Sprite per accedere a corpo fisico e animazioni.
 *
 * Uso in VillageScene:
 * ```js
 * this.player = new Player(this, spawnX, spawnY, cursors);
 * this.add.existing(this.player);
 * this.physics.add.existing(this.player);
 * ```
 *
 * @extends {Phaser.Physics.Arcade.Sprite}
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene}                            scene   - Scena parent.
   * @param {number}                                  x       - Posizione X iniziale.
   * @param {number}                                  y       - Posizione Y iniziale.
   * @param {Phaser.Types.Input.Keyboard.CursorKeys}  cursors - Cursori tastiera.
   */
  constructor(scene, x, y, cursors) {
    super(scene, x, y, 'player');

    /** @type {Phaser.Types.Input.Keyboard.CursorKeys} */
    this.cursors = cursors;

    /** Velocità di movimento in pixel/secondo. */
    this.speed = 80;

    /** Direzione corrente: 'down'|'up'|'left'|'right' */
    this._direction = 'down';

    // Aggiunge se stesso alla scena e alla fisica
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Corpo fisico più piccolo dello sprite (evita incastri)
    this.body.setSize(10, 10);
    this.body.setOffset(3, 6);
  }

  // ─────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Aggiorna movimento e animazione. Chiamare da VillageScene.update().
   *
   * @param {number} _time  - Tempo assoluto (non usato).
   * @param {number} _delta - Delta frame (non usato).
   * @returns {void}
   */
  update(_time, _delta) {
    this._handleMovement();
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Legge i cursori, imposta velocità e anima lo sprite.
   * @private
   */
  _handleMovement() {
    const { left, right, up, down } = this.cursors;
    const body = /** @type {Phaser.Physics.Arcade.Body} */ (this.body);

    body.setVelocity(0, 0);

    let moving = false;

    if (left.isDown) {
      body.setVelocityX(-this.speed);
      this._direction = 'left';
      moving = true;
    } else if (right.isDown) {
      body.setVelocityX(this.speed);
      this._direction = 'right';
      moving = true;
    }

    if (up.isDown) {
      body.setVelocityY(-this.speed);
      this._direction = 'up';
      moving = true;
    } else if (down.isDown) {
      body.setVelocityY(this.speed);
      this._direction = 'down';
      moving = true;
    }

    // Normalizza velocità diagonale
    if (body.velocity.x !== 0 && body.velocity.y !== 0) {
      body.velocity.normalize().scale(this.speed);
    }

    if (moving) {
      this.anims.play(`player_walk_${this._direction}`, true);
    } else {
      this.anims.stop();
      // Frame idle: primo frame della direzione corrente
      const idleFrame = { down: 0, left: 3, right: 6, up: 9 };
      this.setFrame(idleFrame[this._direction] ?? 0);
    }
  }
}
