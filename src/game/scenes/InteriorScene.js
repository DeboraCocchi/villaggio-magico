/**
 * @file InteriorScene.js
 * Scena generica e riusabile per l'interno di una casa.
 *
 * Non serve una scena Phaser per ogni casa: VillageScene la lancia con
 *   this.scene.launch('InteriorScene', { interiorId, spawnX, spawnY })
 * e InteriorScene carica la tilemap/tileset giusti leggendo la
 * configurazione in data/interiors.js per quell'interiorId.
 *
 * Convenzioni richieste in ogni .tmj di un interno:
 *   - Object Layer "collision": rettangoli/poligoni per muri e mobili
 *     (stesso significato di "collision" in villaggio.tmj)
 *   - Object Layer "exit": un solo oggetto rettangolare vicino alla
 *     porta d'uscita
 */

import Phaser from 'phaser'
import { emitToReact } from '../utils/phaserBridge.js'
import { INTERIORS } from '../../data/interiors.js'

const TILE_SIZE = 32
const PLAYER_SPEED = 100

export class InteriorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InteriorScene' })
    this.map = null
    this.player = null
    this.cursors = null
    this.wasd = null
    this.isTransitioning = false
    this.playerFacing = 'down'
    this._exitCollisionHandler = null
    this.interiorId = null
    this.config = null
  }

  // ─────────────────────────────────────────────────────────────────────────
  init(data) {
    this.interiorId = data.interiorId
    this.spawnX = data.spawnX ?? 0
    this.spawnY = data.spawnY ?? 0
    this.config = INTERIORS[this.interiorId]
    this.isTransitioning = false

    if (!this.config) {
      console.error(
        `[InteriorScene] Nessuna configurazione trovata per interiorId "${this.interiorId}" in data/interiors.js`
      )
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  preload() {
    if (!this.config) return

    // Evita di ricaricare se questo interno è già stato visitato in sessione
    if (!this.cache.tilemap.exists(this.config.tilemapKey)) {
      this.load.tilemapTiledJSON(this.config.tilemapKey, this.config.tilemapPath)
    }

    for (const ts of this.config.tilesetImages) {
      if (!this.textures.exists(ts.key)) {
        this.load.image(ts.key, ts.path)
      }
    }

    // Riusa lo spritesheet del player già caricato da VillageScene
    if (!this.textures.exists('player')) {
      this.load.spritesheet('player', 'assets/player.png', {
        frameWidth: 32,
        frameHeight: 32,
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  create() {
    if (!this.config) {
      // Fallback: torna al villaggio invece di restare su una scena rotta
      this.scene.stop()
      this.scene.wake('VillageScene')
      return
    }

    const map = this.make.tilemap({ key: this.config.tilemapKey })
    this.map = map

    const tilesets = this.config.tilesetImages
      .map(ts => map.addTilesetImage(ts.name ?? ts.key, ts.key))
      .filter(Boolean)

    // Crea tutti i tile layer per indice, stesso pattern usato in VillageScene
    map.layers.forEach((layerData, index) => {
      const layer = map.createLayer(index, tilesets, 0, 0)
      if (layer) layer.setDepth(index)
    })

    // ── Collisioni interne (muri, mobili) ────────────────────────────────────
    const collisionLayer = map.getObjectLayer('collision')
    if (collisionLayer) {
      for (const obj of collisionLayer.objects) {
        if (!obj.polygon && (obj.width ?? 0) < 2 && (obj.height ?? 0) < 2) continue
        this.matter.add.rectangle(
          obj.x + (obj.width  ?? TILE_SIZE) / 2,
          obj.y + (obj.height ?? TILE_SIZE) / 2,
          obj.width  ?? TILE_SIZE,
          obj.height ?? TILE_SIZE,
          { isStatic: true, friction: 0, frictionStatic: 0, label: 'wall' }
        )
      }
    } else {
      console.warn(`[InteriorScene] Object Layer "collision" non trovato in ${this.config.tilemapKey}`)
    }

    // ── Player ────────────────────────────────────────────────────────────────
    this.player = this.matter.add.sprite(this.spawnX, this.spawnY, 'player')
    this.player.setFixedRotation()
    this.player.setBody({ type: 'rectangle', width: 20, height: 24 })
    this.player.setFrictionAir(0.982)
    this.player.setBounce(0)
    this.player.setFriction(0)
    this.player.setFrictionStatic(0)
    this.player.setMass(1)
    this.player.setDepth(this.player.y)

    // Le animazioni walk_*/idle sono già registrate globalmente da
    // VillageScene (this.anims è condiviso da tutte le scene del gioco),
    // quindi qui non serve ricrearle.
    const idleFrameByFacing = { down: 1, left: 4, right: 7, up: 10 }
    if (this.textures.exists('player')) {
      this.player.setFrame(idleFrameByFacing[this.playerFacing] ?? 1)
    }

    // ── Uscita verso il villaggio ─────────────────────────────────────────────
    this._setupExit(map)

    // ── Camera ────────────────────────────────────────────────────────────────
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(2)
    this.cameras.main.fadeIn(300, 0, 0, 0)

    emitToReact('scene:entered', { interiorId: this.interiorId })

    // ── Input ─────────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Legge l'Object Layer "exit" (un solo oggetto atteso) e crea il sensor
   * Matter che, al contatto col player, riporta al villaggio.
   * @param {Phaser.Tilemaps.Tilemap} map
   * @private
   */
  _setupExit(map) {
    const exitLayer = map.getObjectLayer('exit')
    if (!exitLayer || exitLayer.objects.length === 0) {
      console.warn(
        `[InteriorScene] Nessun Object Layer "exit" trovato in ${this.config.tilemapKey}: impossibile uscire dalla casa`
      )
      return
    }

    const obj = exitLayer.objects[0]
    const sensor = this.matter.add.rectangle(
      obj.x + (obj.width  ?? TILE_SIZE) / 2,
      obj.y + (obj.height ?? TILE_SIZE) / 2,
      obj.width  ?? TILE_SIZE,
      obj.height ?? TILE_SIZE,
      { isSensor: true, isStatic: true, label: 'exit' }
    )

    this._exitCollisionHandler = (event) => {
      if (this.isTransitioning) return
      for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB]
        const isExit = bodies.includes(sensor)
        const isPlayer = bodies.includes(this.player.body)
        if (isExit && isPlayer) {
          this.exitHouse()
          break
        }
      }
    }

    this.matter.world.on('collisionstart', this._exitCollisionHandler)
  }

  /**
   * Fade to black, ferma InteriorScene e risveglia VillageScene (che si
   * riposiziona da sola in _onWake leggendo il registry).
   */
  exitHouse() {
    if (this.isTransitioning) return
    this.isTransitioning = true
    this.player.setVelocity(0, 0)

    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop()
      this.scene.wake('VillageScene')
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  update() {
    if (!this.player) return

    const idleFrameByFacing = { down: 1, left: 4, right: 7, up: 10 }

    if (this.isTransitioning) {
      this.player.setVelocity(0, 0)
      return
    }

    const left  = this.cursors.left.isDown  || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown
    const up    = this.cursors.up.isDown    || this.wasd.up.isDown
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown

    let vx = 0
    let vy = 0
    if (left)  vx = -PLAYER_SPEED
    if (right) vx =  PLAYER_SPEED
    if (up)    vy = -PLAYER_SPEED
    if (down)  vy =  PLAYER_SPEED

    if (left) this.playerFacing = 'left'
    else if (right) this.playerFacing = 'right'
    else if (up) this.playerFacing = 'up'
    else if (down) this.playerFacing = 'down'

    if (vx !== 0 && vy !== 0) {
      vx = vx / Math.SQRT2
      vy = vy / Math.SQRT2
    }

    this.player.setVelocity(vx, vy)
    this.player.setAngularVelocity(0)
    this.player.setDepth(this.player.y)

    if (this.textures.exists('player')) {
      if (left)       this.player.play('walk_left',  true)
      else if (right) this.player.play('walk_right', true)
      else if (up)    this.player.play('walk_up',    true)
      else if (down)  this.player.play('walk_down',  true)
      else {
        this.player.anims.stop()
        this.player.setFrame(idleFrameByFacing[this.playerFacing] ?? 1)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  shutdown() {
    if (this._exitCollisionHandler) {
      this.matter.world.off('collisionstart', this._exitCollisionHandler)
      this._exitCollisionHandler = null
    }
  }
}