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
import { VILLAGE_CONFIG } from '../../data/villageConfig.js'
import { NPC } from '../entities/NPC.js'
import { Pet } from '../entities/Pet.js'
import { PLAYER_SPRITE_REGISTRY_KEY, getSavedPlayerKey } from '../utils/playerCharacter.js'
import { usePlayerStore, AUDIO_EVENT } from '../../store/usePlayerStore.js';

const TILE_SIZE = 32
const PLAYER_SPEED = 100
const INTERACT_KEY = 'E'

const INTERIOR_RESIDENTS = {
  interior_cece: {
    npcs: [
      {
        id: 'mamma_chiara',
        residentName: 'Mamma Chiara',
        color: 'pink',
        npc: {
          personality: 'dolce e accogliente, ha sempre voglia di un abbraccio',
          catchphrase: 'Bentornata Cece!'
        }
      }
    ],
    pets: []
  },
  interior_anna: {
    npcs: [
      { inhabitantId: 'nonna_anna' },
      {
        id: 'papa_ale',
        residentName: 'Ale',
        color: 'blue',
        npc: {
          personality: 'calmo e giocherellone, ama fare battute leggere',
          catchphrase: 'Che bello stare insieme!'
        }
      }
    ],
    pets: []
  },
  interior_debora: {
    npcs: [{ inhabitantId: 'zia_debora' }],
    pets: [{ ownerId: 'zia_debora', petName: 'Blue' }]
  },
  interior_daniele: {
    npcs: [{ inhabitantId: 'nonno_daniele' }],
    pets: [{ ownerId: 'nonno_daniele', petName: 'Corrado' }]
  }
}

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
    this._collisionAabbs = []
    this._indoorNpcs = []
    this._indoorPets = []
    this._nearestInRange = null
    this._interactKey = null
    this._playerSpriteKey = 'player'
    this._magazzinoSensors = []
    this._magazzinoHandlerStart = null
    this._magazzinoHandlerEnd = null
    this._magazzinoOpen = false
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

    // Riusa lo spritesheet del personaggio scelto, già caricato da
    // PreloadScene (player | player1 | player3). Fallback di sicurezza.
    const playerKey = this.registry.get(PLAYER_SPRITE_REGISTRY_KEY) ?? getSavedPlayerKey()
    if (!this.textures.exists(playerKey)) {
      this.load.spritesheet(playerKey, `assets/sprites/${playerKey}.png`, {
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
    const cacheData = this.cache.tilemap.get(this.config.tilemapKey)
    map.layers.forEach((layerData, index) => {
      const layer = map.createLayer(index, tilesets, 0, 0)
      if (layer) {
        // Trova il layer corretto in cacheData usando l'id (gli indici sono sfasati)
        const rawLayerData = cacheData?.data?.layers?.find(l => l.id === layerData.id)
        const offsetX = rawLayerData?.offsetx ?? 0
        const offsetY = rawLayerData?.offsety ?? 0
        layer.setPosition(offsetX, offsetY)
        const customDepth = rawLayerData?.properties?.find(p => p.name === 'depth')?.value
        const finalDepth = customDepth ?? index
        layer.setDepth(finalDepth)
  
      }
    })

      const { musicEnabled, volume } = usePlayerStore.getState();
this.sound.mute   = !musicEnabled;
this.sound.volume = volume;

this._onAudioChange = (e) => {
  this.sound.mute   = !e.detail.musicEnabled;
  this.sound.volume = e.detail.volume;
};
window.addEventListener(AUDIO_EVENT, this._onAudioChange);

this.events.once('shutdown', () => {
  window.removeEventListener(AUDIO_EVENT, this._onAudioChange);
});

    // ── Collisioni interne (muri, mobili) ────────────────────────────────────
    const collisionLayer = map.getObjectLayer('collision')
    this._collisionAabbs = []
    if (collisionLayer) {
      for (const obj of collisionLayer.objects) {
        if (!obj.polygon && (obj.width ?? 0) < 2 && (obj.height ?? 0) < 2) continue

        if (obj.polygon) {
          const points = obj.polygon.map((p) => ({ x: obj.x + p.x, y: obj.y + p.y }))
          const xs = points.map((p) => p.x)
          const ys = points.map((p) => p.y)
          this._collisionAabbs.push({
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys),
          })
        } else {
          this._collisionAabbs.push({
            x: obj.x,
            y: obj.y,
            w: obj.width ?? TILE_SIZE,
            h: obj.height ?? TILE_SIZE,
          })
        }

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
    this._playerSpriteKey = this.registry.get(PLAYER_SPRITE_REGISTRY_KEY) ?? getSavedPlayerKey()
    this.player = this.matter.add.sprite(this.spawnX, this.spawnY, this._playerSpriteKey)
    this.player.setFixedRotation()
    this.player.setBody({ type: 'rectangle', width: 20, height: 24 })
    this.player.setFrictionAir(0.982)
    this.player.setBounce(0)
    this.player.setFriction(0)
    this.player.setFrictionStatic(0)
    this.player.setMass(1)
    this.player.setDepth(this.player.y)

    // Le animazioni walk_* e idle sono già registrate globalmente da
    // VillageScene (this.anims è condiviso da tutte le scene del gioco),
    // quindi qui non serve ricrearle.
    const idleFrameByFacing = { down: 1, left: 4, right: 7, up: 10 }
    if (this.textures.exists(this._playerSpriteKey)) {
      this.player.setFrame(idleFrameByFacing[this.playerFacing] ?? 1)
    }

    this._spawnInteriorResidents()

    // ── Uscita verso il villaggio ─────────────────────────────────────────────
    this._setupExit(map)

    // ── Bauli del magazzino (solo se il .tmj ha il layer) ─────────────────────
    this._setupMagazzino(map)

    // ── Camera ────────────────────────────────────────────────────────────────
    // Il player non può uscire dai bordi della mappa (physics)
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    this.cameras.main.setBackgroundColor('#000000')
    this.cameras.main.setZoom(2)
    this.cameras.main.fadeIn(300, 0, 0, 0)

    const ZOOM = 2
    const mapW = map.widthInPixels
    const mapH = map.heightInPixels
    // Dimensioni del viewport in world-units (pixel Tiled) al zoom corrente
    const camVpW = this.scale.width  / ZOOM
    const camVpH = this.scale.height / ZOOM

    // Per ogni asse: se la mappa è più piccola del viewport, i bounds vengono
    // estesi simmetricamente così la camera rimane centrata e il nero riempie
    // i bordi. Se la mappa è più grande, i bounds consentono lo scroll normale.
    const boundsX = mapW < camVpW ? -(camVpW - mapW) / 2 : 0
    const boundsY = mapH < camVpH ? -(camVpH - mapH) / 2 : 0
    const boundsW = Math.max(mapW, camVpW)
    const boundsH = Math.max(mapH, camVpH)

    this.cameras.main.setBounds(boundsX, boundsY, boundsW, boundsH)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)

    emitToReact('scene:entered', { interiorId: this.interiorId })

    // ── Input ─────────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })
    this._interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[INTERACT_KEY])
  }

  _spawnInteriorResidents() {
    const residents = INTERIOR_RESIDENTS[this.interiorId]
    if (!residents) return

    const npcSpecs = residents.npcs ?? []
    const petSpecs = residents.pets ?? []
    const totalEntities = npcSpecs.length + petSpecs.length
    const spawnPoints = this._resolveSpawnPoints(totalEntities)

    let i = 0
    for (const spec of npcSpecs) {
      const inhabitant = this._resolveNpcSpec(spec)
      if (!inhabitant) continue

      const point = spawnPoints[i++] ?? this._findFreePoint(this.spawnX, this.spawnY - 48)
      this._indoorNpcs.push(new NPC(this, point.x, point.y, inhabitant))
    }

    for (const spec of petSpecs) {
      const petConfig = this._resolvePetSpec(spec)
      if (!petConfig) continue

      const point = spawnPoints[i++] ?? this._findFreePoint(this.spawnX + 32, this.spawnY - 48)
      this._indoorPets.push(new Pet(
        this,
        point.x,
        point.y,
        { ...petConfig, behavior: 'wander_near_home' },
        { x: point.x, y: point.y }
      ))
    }
  }

  _resolveNpcSpec(spec) {
    if (spec.inhabitantId) {
      const inhabitant = VILLAGE_CONFIG.inhabitants.find((i) => i.id === spec.inhabitantId)
      if (!inhabitant) {
        console.warn(`[InteriorScene] Inhabitant "${spec.inhabitantId}" non trovato in villageConfig`)
        return null
      }
      return inhabitant
    }
    return spec
  }

  _resolvePetSpec(spec) {
    const owner = VILLAGE_CONFIG.inhabitants.find((i) => i.id === spec.ownerId)
    const pet = owner?.pet?.find((p) => p.name?.toLowerCase() === spec.petName?.toLowerCase())
    if (!pet) {
      console.warn(`[InteriorScene] Pet "${spec.petName}" non trovato per owner "${spec.ownerId}"`)
      return null
    }
    return pet
  }

  _resolveSpawnPoints(count) {
    const baseX = this.map?.widthInPixels ? this.map.widthInPixels / 2 : this.spawnX
    const baseY = this.map?.heightInPixels ? this.map.heightInPixels / 2 : this.spawnY
    const offsets = [
      [0, -36],
      [-40, -16],
      [40, -16],
      [-56, 28],
      [56, 28],
      [0, 48],
    ]

    const points = []
    for (let idx = 0; idx < count; idx++) {
      const [ox, oy] = offsets[idx] ?? [0, 0]
      points.push(this._findFreePoint(baseX + ox, baseY + oy, points))
    }
    return points
  }

  _findFreePoint(targetX, targetY, reserved = []) {
    const candidates = []
    candidates.push({ x: targetX, y: targetY })

    const rings = [20, 36, 52, 68, 84, 100]
    for (const radius of rings) {
      for (let step = 0; step < 12; step++) {
        const angle = (Math.PI * 2 * step) / 12
        candidates.push({
          x: targetX + Math.cos(angle) * radius,
          y: targetY + Math.sin(angle) * radius,
        })
      }
    }

    const minX = 14
    const minY = 14
    const maxX = (this.map?.widthInPixels ?? 0) - 14
    const maxY = (this.map?.heightInPixels ?? 0) - 14

    const isReserved = (x, y) => reserved.some((p) => Phaser.Math.Distance.Between(x, y, p.x, p.y) < 22)

    for (const point of candidates) {
      const x = Phaser.Math.Clamp(point.x, minX, maxX)
      const y = Phaser.Math.Clamp(point.y, minY, maxY)
      if (isReserved(x, y)) continue
      if (!this._isBlockedByCollision(x, y)) return { x, y }
    }

    return {
      x: Phaser.Math.Clamp(targetX, minX, maxX),
      y: Phaser.Math.Clamp(targetY, minY, maxY),
    }
  }

  _isBlockedByCollision(x, y) {
    const halfW = 10
    const halfH = 12
    const left = x - halfW
    const right = x + halfW
    const top = y - halfH
    const bottom = y + halfH

    return this._collisionAabbs.some((box) => {
      const bx1 = box.x
      const by1 = box.y
      const bx2 = box.x + box.w
      const by2 = box.y + box.h
      return left < bx2 && right > bx1 && top < by2 && bottom > by1
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Legge l'Object Layer "magazzino" (presente in house_cece.tmj) e crea un
   * sensor Matter per ogni baule con proprietà personalizzata magazzino=true.
   * Avvicinandosi (il sensor è allargato di MAGAZZINO_MARGIN px per lato)
   * viene emesso 'magazzino:open' verso React (MagazzinoPanel.jsx);
   * allontanandosi da tutti i bauli viene emesso 'magazzino:close'.
   *
   * @param {Phaser.Tilemaps.Tilemap} map
   * @private
   */
  _setupMagazzino(map) {
    const magazzinoLayer = map.getObjectLayer('magazzino')
    if (!magazzinoLayer || magazzinoLayer.objects.length === 0) return

    // Margine di "avvicinamento": il recap si apre prima di toccare il baule
    const MAGAZZINO_MARGIN = 20

    /** Solo gli oggetti con la proprietà bool magazzino = true. */
    const chests = magazzinoLayer.objects.filter((obj) =>
      obj.properties?.some((p) => p.name === 'magazzino' && p.value === true)
    )

    if (chests.length === 0) {
      console.warn(
        `[InteriorScene] Layer "magazzino" trovato in ${this.config.tilemapKey} ma nessun oggetto ha magazzino=true (controlla le proprietà in Tiled)`
      )
      return
    }

    this._magazzinoSensors = chests.map((obj) => {
      const w = (obj.width  ?? TILE_SIZE) + MAGAZZINO_MARGIN * 2
      const h = (obj.height ?? TILE_SIZE) + MAGAZZINO_MARGIN * 2
      return this.matter.add.rectangle(
        obj.x + (obj.width  ?? TILE_SIZE) / 2,
        obj.y + (obj.height ?? TILE_SIZE) / 2,
        w,
        h,
        { isSensor: true, isStatic: true, label: 'magazzino' }
      )
    })

    /** Bauli il cui sensor sta toccando il player in questo momento. */
    const touching = new Set()

    this._magazzinoHandlerStart = (event) => {
      if (this.isTransitioning) return
      for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB]
        const sensor = bodies.find((b) => this._magazzinoSensors.includes(b))
        const isPlayer = bodies.includes(this.player.body)
        if (sensor && isPlayer) {
          touching.add(sensor)
          if (!this._magazzinoOpen) {
            this._magazzinoOpen = true
            emitToReact('magazzino:open', { interiorId: this.interiorId })
          }
        }
      }
    }

    this._magazzinoHandlerEnd = (event) => {
      for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB]
        const sensor = bodies.find((b) => this._magazzinoSensors.includes(b))
        const isPlayer = bodies.includes(this.player.body)
        if (sensor && isPlayer) {
          touching.delete(sensor)
          if (touching.size === 0 && this._magazzinoOpen) {
            this._magazzinoOpen = false
            emitToReact('magazzino:close', { interiorId: this.interiorId })
          }
        }
      }
    }

    this.matter.world.on('collisionstart', this._magazzinoHandlerStart)
    this.matter.world.on('collisionend',   this._magazzinoHandlerEnd)
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
  update(_time, delta) {
    if (!this.player) return

    const frameDelta = delta ?? this.game.loop.delta

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

    if (this.textures.exists(this._playerSpriteKey)) {
      if (left)       this.player.play('walk_left',  true)
      else if (right) this.player.play('walk_right', true)
      else if (up)    this.player.play('walk_up',    true)
      else if (down)  this.player.play('walk_down',  true)
      else {
        this.player.anims.stop()
        this.player.setFrame(idleFrameByFacing[this.playerFacing] ?? 1)
      }
    }

    this._nearestInRange = null
    for (const npc of this._indoorNpcs) {
      npc.update(frameDelta)
      if (npc.updateProximity(this.player.x, this.player.y)) {
        this._nearestInRange = npc
      }
    }

    if (this._interactKey && Phaser.Input.Keyboard.JustDown(this._interactKey)) {
      this._nearestInRange?.interact()
    }

    for (const pet of this._indoorPets) {
      pet.update(frameDelta, this.player.x, this.player.y, this.playerFacing)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  shutdown() {
    for (const npc of this._indoorNpcs) npc.destroy()
    this._indoorNpcs = []

    for (const pet of this._indoorPets) pet.destroy()
    this._indoorPets = []

    this._nearestInRange = null

    if (this._exitCollisionHandler) {
      this.matter.world.off('collisionstart', this._exitCollisionHandler)
      this._exitCollisionHandler = null
    }

    if (this._magazzinoHandlerStart) {
      this.matter.world.off('collisionstart', this._magazzinoHandlerStart)
      this._magazzinoHandlerStart = null
    }
    if (this._magazzinoHandlerEnd) {
      this.matter.world.off('collisionend', this._magazzinoHandlerEnd)
      this._magazzinoHandlerEnd = null
    }
    this._magazzinoSensors = []

    // Se il pannello era aperto uscendo dalla casa, chiudilo
    if (this._magazzinoOpen) {
      this._magazzinoOpen = false
      emitToReact('magazzino:close', { interiorId: this.interiorId })
    }
  }
}