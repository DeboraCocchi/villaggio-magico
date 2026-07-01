/**
 * @file VillageScene.js
 * Carica villaggio.tmj con tutti i tileset.
 * Fix v3: layer creati per indice numerico (Phaser 3.90 non accetta LayerData diretto).
 */

import Phaser from 'phaser'
import { AudioManager }   from '../systems/AudioManager.js'
import { DayNightSystem } from '../systems/DayNightSystem.js'

const PLAYER_SPEED = 120
const TILE_SIZE    = 32

export class VillageScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VillageScene' })
    this.map    = null
    this.player = null
    this.cursors = null
    this.wasd    = null
    this.debugText = null
    this.audioManager = null
    this.dayNight      = null
  }

  // ─────────────────────────────────────────────────────────────────────────
  preload() {
    const { width, height } = this.scale
    const bg  = this.add.rectangle(width / 2, height / 2, width - 40, 12, 0x333333)
    const bar = this.add.rectangle(bg.x - (width - 40) / 2, height / 2, 0, 10, 0x78c8a0)
    bar.setOrigin(0, 0.5)
    this.load.on('progress', v => { bar.width = (width - 40) * v })
    this.load.on('complete', () => { bg.destroy(); bar.destroy() })

    this.load.tilemapTiledJSON('villaggio', 'assets/villaggio.tmj')

    const T = 'assets/tilesets/'
    this.load.image('DESERT_TILESET_32x32',     T + 'DESERT TILESET 32x32.png')
    this.load.image('Acqua_animata',             T + 'water_anim.png')
    this.load.image('Schiuma_cascata',           T + 'foam_anim.png')
    this.load.image('all2',                      T + 'all2.png')
    this.load.image('casa_tetto_verde',          T + 'casa_tetto_verde.png')
    this.load.image('casa_tetto_fucsia',         T + 'casa_tetto_fucsia.png')
    this.load.image('casa_tetto_arancione',      T + 'casa_tetto_arancione.png')
    this.load.image('all3',                      T + 'all3.png')
    this.load.image('h2',                        T + 'h2.png')
    this.load.image('Trees',                     T + 'Trees.png')
    this.load.image('Bridges_32px',              T + 'Bridges_32px.png')
    this.load.image('Flowering_Tree',            T + 'Flowering Tree.png')
    this.load.image('Pixel_16_v2_village_free',  T + 'Pixel 16 v2 village free.png')
    this.load.image('spr_tree_9',                T + 'spr_tree_9.png')
    this.load.image('spr_tree_8',                T + 'spr_tree_8.png')
    this.load.image('spr_tree_7',                T + 'spr_tree_7.png')
    this.load.image('spr_tree_6',                T + 'spr_tree_6.png')
    this.load.image('spr_tree_5',                T + 'spr_tree_5.png')
    this.load.image('spr_tree_4',                T + 'spr_tree_4.png')
    this.load.image('spr_tree_3',                T + 'spr_tree_3.png')
    this.load.image('spr_tree_2',                T + 'spr_tree_2.png')
    this.load.image('spr_tree_16',               T + 'spr_tree_16.png')
    this.load.image('spr_tree_15',               T + 'spr_tree_15.png')
    this.load.image('spr_tree_14',               T + 'spr_tree_14.png')
    this.load.image('spr_tree_13',               T + 'spr_tree_13.png')
    this.load.image('spr_tree_12',               T + 'spr_tree_12.png')
    this.load.image('spr_tree_11',               T + 'spr_tree_11.png')
    this.load.image('spr_tree_10',               T + 'spr_tree_10.png')
    this.load.image('spr_tree_1',                T + 'spr_tree_1.png')
    this.load.image('Top-down_Tileset_32x32',    T + 'Top-down_Tileset_32x32.png')
    this.load.image('all1',                      T + 'all1.png')
    this.load.image('Ores',                      T + 'Ores.png')
    this.load.image('Pixel_Art_Wheat',           T + 'Pixel Art Wheat.png')
    this.load.image('wooden_fence',              T + 'wooden_fence.png')
    // ⚠️ Il secondo tileset "Trees" (firstgid 3570) ha ancora name="Trees" nel .tmj.
    // Caricalo con una key diversa — ma addTilesetImage deve usare il name originale.
    // Soluzione: rinomina il secondo Trees nel .tmj in "Trees2" e aggiorna qui.
    // Finché non lo fai, usa questa key temporanea che punta al file corretto:
    this.load.image('Trees2',                    T + 'Trees_forest.png')
    this.load.image('Water_Flora',               T + 'Water Flora.png')
    this.load.image('Bridgessx_32x32',           T + 'Bridges_32x32.png')
    this.load.image('Weeping_Willow3',           T + 'Weeping Willow3.png')
    this.load.image('Weeping_Willow2',           T + 'Weeping Willow2.png')
    this.load.image('Garden_Decorations',        T + 'Garden Decorations.png')
    this.load.image('Decor',                     T + 'Decor.png')
    this.load.image('Angel_Statue',              T + 'Angel Statue.png')
    this.load.image('land_decorations',          T + 'land_decorations.png')
    this.load.image('beach_decorations',         T + 'beach_decorations.png')
    this.load.image('cabin_woods',               T + 'cabin-in-the-woods-assets 32x32 .png')

    // Female_22-2.png: 96×128, 3 col × 4 righe, 32×32px
    this.load.spritesheet('player', 'assets/player.png', {
      frameWidth:  32,
      frameHeight: 32,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  create() {
    const map = this.make.tilemap({ key: 'villaggio' })
    this.map  = map

    // ── Tileset ──────────────────────────────────────────────────────────────
    // addTilesetImage(nameInTMJ, preloadKey)
    // ⚠️ Il secondo "Trees" nel .tmj ha ancora name="Trees" — va rinominato.
    // Appena rinomini in "Trees2" nel .tmj, cambia anche qui.
    const tilesets = [
      map.addTilesetImage('DESERT TILESET 32x32',        'DESERT_TILESET_32x32'),
      map.addTilesetImage('Acqua animata',               'Acqua_animata'),
      map.addTilesetImage('Schiuma cascata',             'Schiuma_cascata'),
      map.addTilesetImage('all2',                        'all2'),
      map.addTilesetImage('casa_tetto_verde',            'casa_tetto_verde'),
      map.addTilesetImage('casa_tetto_fucsia',           'casa_tetto_fucsia'),
      map.addTilesetImage('casa_tetto_arancione',        'casa_tetto_arancione'),
      map.addTilesetImage('all3',                        'all3'),
      map.addTilesetImage('h2',                          'h2'),
      map.addTilesetImage('Trees',                       'Trees'),
      map.addTilesetImage('Bridges_32px',                'Bridges_32px'),
      map.addTilesetImage('Flowering Tree',              'Flowering_Tree'),
      map.addTilesetImage('Pixel 16 v2 village free',    'Pixel_16_v2_village_free'),
      map.addTilesetImage('spr_tree_9',                  'spr_tree_9'),
      map.addTilesetImage('spr_tree_8',                  'spr_tree_8'),
      map.addTilesetImage('spr_tree_7',                  'spr_tree_7'),
      map.addTilesetImage('spr_tree_6',                  'spr_tree_6'),
      map.addTilesetImage('spr_tree_5',                  'spr_tree_5'),
      map.addTilesetImage('spr_tree_4',                  'spr_tree_4'),
      map.addTilesetImage('spr_tree_3',                  'spr_tree_3'),
      map.addTilesetImage('spr_tree_2',                  'spr_tree_2'),
      map.addTilesetImage('spr_tree_16',                 'spr_tree_16'),
      map.addTilesetImage('spr_tree_15',                 'spr_tree_15'),
      map.addTilesetImage('spr_tree_14',                 'spr_tree_14'),
      map.addTilesetImage('spr_tree_13',                 'spr_tree_13'),
      map.addTilesetImage('spr_tree_12',                 'spr_tree_12'),
      map.addTilesetImage('spr_tree_11',                 'spr_tree_11'),
      map.addTilesetImage('spr_tree_10',                 'spr_tree_10'),
      map.addTilesetImage('spr_tree_1',                  'spr_tree_1'),
      map.addTilesetImage('Top-down_Tileset_32x32',      'Top-down_Tileset_32x32'),
      map.addTilesetImage('all1',                        'all1'),
      map.addTilesetImage('Ores',                        'Ores'),
      map.addTilesetImage('Pixel Art Wheat',             'Pixel_Art_Wheat'),
      map.addTilesetImage('wooden_fence',                'wooden_fence'),
      // ⚠️ Quando rinomini il secondo Trees nel .tmj in "Trees2", aggiorna qui:
      // map.addTilesetImage('Trees2', 'Trees2'),
      // Nel frattempo lo saltiamo: i tile del secondo Trees appariranno vuoti
      // fino alla rinomina nel .tmj.
      map.addTilesetImage('Water Flora',                 'Water_Flora'),
      map.addTilesetImage('Bridgessx_32x32',             'Bridgessx_32x32'),
      map.addTilesetImage('Weeping Willow3',             'Weeping_Willow3'),
      map.addTilesetImage('Weeping Willow2',             'Weeping_Willow2'),
      map.addTilesetImage('Garden Decorations',          'Garden_Decorations'),
      map.addTilesetImage('Decor',                       'Decor'),
      map.addTilesetImage('Angel Statue',                'Angel_Statue'),
      map.addTilesetImage('land_decorations',            'land_decorations'),
      map.addTilesetImage('beach_decorations',           'beach_decorations'),
      map.addTilesetImage('cabin-in-the-woods-assets 32x32 ', 'cabin_woods'),
    ].filter(Boolean)

    // ── Layer tile per INDICE NUMERICO ────────────────────────────────────────
    //
    // Phaser 3.90 NON accetta un oggetto LayerData direttamente in createLayer().
    // Bisogna passare il nome stringa o l'indice numerico del tilelayer.
    //
    // Indici dei tilelayer (solo tilelayer, i group non contano):
    //   0  Terreno
    //   1  acqua animata
    //   2  terreno2
    //   3  cascate
    //   4  alberi 1          (dentro group "alberi")
    //   5  alberi 2
    //   6  alberi 3
    //   7  alberi4           (primo dei 5 duplicati)
    //   8  alberi4
    //   9  alberi4
    //  10  alberi4
    //  11  alberi4
    //  12  alberi ultimo in basso
    //  13  ponti
    //  14  baracchino
    //  15  case              (dentro group "case")
    //  16  case2

    /**
     * Crea un layer per indice e gli assegna il depth.
     * @param {number} index
     * @param {number} depth
     * @returns {Phaser.Tilemaps.TilemapLayer|null}
     */
    const mkLayer = (index, depth) => {
      try {
        const l = map.createLayer(index, tilesets, 0, 0)
        if (l) {
          l.setDepth(depth)
        } else {
          console.warn(`[VillageScene] Layer indice ${index} non creato`)
        }
        return l
      } catch (e) {
        console.warn(`[VillageScene] Errore layer indice ${index}:`, e.message)
        return null
      }
    }

    mkLayer(0,  0)   // Terreno
    mkLayer(1,  1)   // acqua animata
    mkLayer(2,  2)   // terreno2
    mkLayer(3,  3)   // cascate
    mkLayer(4,  4)   // alberi 1
    mkLayer(5,  5)   // alberi 2
    mkLayer(6,  6)   // alberi 3
    mkLayer(7,  7)   // alberi4 (a)
    mkLayer(8,  8)   // alberi4 (b)
    mkLayer(9,  9)   // alberi4 (c)
    mkLayer(10, 10)  // alberi4 (d)
    mkLayer(11, 11)  // alberi4 (e)
    mkLayer(12, 12)  // alberi ultimo in basso
    mkLayer(13, 13)  // ponti
    mkLayer(14, 14)  // baracchino
    mkLayer(15, 15)  // case
    mkLayer(16, 16)  // case2
    // Player sarà depth 17

    // ── Attiva animazioni Tiled (acqua, cascata) ──────────────────────────────
    this._initTiledAnimations(map)

    // ── Collisioni Matter.js dal layer "collision" ───────────────────────────
    // Matter supporta rettangoli, poligoni ed ellissi reali (non bounding box).
    const collisionObjLayer = map.getObjectLayer('collision')

    if (collisionObjLayer) {
      for (const obj of collisionObjLayer.objects) {
        // Salta oggetti degeneri (dimensione zero)
        if (!obj.polygon && (obj.width ?? 0) < 2 && (obj.height ?? 0) < 2) continue

        if (obj.polygon) {
          // Poligono reale — vertici assoluti in pixel
          const vertices = obj.polygon.map(p => ({
            x: obj.x + p.x,
            y: obj.y + p.y,
          }))
          // Matter vuole i vertici come stringa o array di {x,y}
          // fromVertices calcola automaticamente il centro
          const xs = vertices.map(v => v.x)
          const ys = vertices.map(v => v.y)
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2
          // Rende i vertici relativi al centro
          const relVertices = vertices.map(v => ({ x: v.x - cx, y: v.y - cy }))
          this.matter.add.fromVertices(cx, cy, relVertices, {
            isStatic: true,
            friction: 0,
            frictionStatic: 0,
            label: 'wall',
          }, true)

        } else if (obj.ellipse) {
          // Ellisse → cerchio con raggio medio
          if ((obj.width ?? 0) < 4 || (obj.height ?? 0) < 4) continue
          const r = ((obj.width ?? 0) + (obj.height ?? 0)) / 4
          this.matter.add.circle(
            obj.x + (obj.width  ?? 0) / 2,
            obj.y + (obj.height ?? 0) / 2,
            r,
            { isStatic: true, friction: 0, label: 'wall' }
          )
        } else {
          // Rettangolo
          this.matter.add.rectangle(
            obj.x + (obj.width  ?? 0) / 2,
            obj.y + (obj.height ?? 0) / 2,
            obj.width  ?? TILE_SIZE,
            obj.height ?? TILE_SIZE,
            { isStatic: true, friction: 0, frictionStatic: 0, label: 'wall' }
          )
        }
      }
    }

    // ── Player ────────────────────────────────────────────────────────────────
    const spawnX = map.widthInPixels  / 2
    const spawnY = map.heightInPixels / 2

    this.player = this.matter.add.sprite(spawnX, spawnY, 'player')
    this.player.setDepth(17)
    this.player.setFixedRotation()   // impedisce rotazioni fisiche

    // Corpo fisico più piccolo dello sprite
    this.player.setBody({ type: 'rectangle', width: 20, height: 24 })

    // Smorzamento: senza questo Matter accumula velocità indefinitamente
    this.player.setFrictionAir(0.982)      // resistenza aria alta → si ferma subito
    this.player.setBounce(0)           // nessun rimbalzo
    this.player.setFriction(0)         // frizione superfici (irrilevante top-down)
    this.player.setFrictionStatic(0)
    this.player.setMass(1)

    // ── Animazioni player ─────────────────────────────────────────────────────
    // Female_22-2.png: 96×128, 3 col × 4 righe, 32×32 (12 frame totali: 0–11)
    //   riga 0 (frame  0-2): walk_down
    //   riga 1 (frame  3-5): walk_left
    //   riga 2 (frame  6-8): walk_right
    //   riga 3 (frame  9-11): walk_up
    if (this.textures.exists('player')) {
      if (!this.anims.exists('walk_down'))
        this.anims.create({ key: 'walk_down',  frames: this.anims.generateFrameNumbers('player', { start:  0, end:  2 }), frameRate: 8, repeat: -1 })
      if (!this.anims.exists('walk_left'))
        this.anims.create({ key: 'walk_left',  frames: this.anims.generateFrameNumbers('player', { start:  3, end:  5 }), frameRate: 8, repeat: -1 })
      if (!this.anims.exists('walk_right'))
        this.anims.create({ key: 'walk_right', frames: this.anims.generateFrameNumbers('player', { start:  6, end:  8 }), frameRate: 8, repeat: -1 })
      if (!this.anims.exists('walk_up'))
        this.anims.create({ key: 'walk_up',    frames: this.anims.generateFrameNumbers('player', { start:  9, end: 11 }), frameRate: 8, repeat: -1 })
      if (!this.anims.exists('idle'))
        this.anims.create({ key: 'idle',       frames: [{ key: 'player', frame: 1 }],                                     frameRate: 1, repeat: -1 })
      this.player.play('idle')
    } else {
      console.warn('[VillageScene] player.png non trovato')
    }

    // ── Animazioni acqua e cascata ────────────────────────────────────────────
    // Phaser 3 gestisce le animazioni Tiled automaticamente durante il parsing
    // del TMJ, ma SOLO se il tileset viene registrato correttamente con
    // addTilesetImage. Le animazioni sono già nei dati del .tmj:
    //   - "Acqua animata" (firstgid=267): 4 frame, 180ms ciascuno
    //   - "Schiuma cascata" (firstgid=271): 4 frame, 160ms ciascuno
    // Non servono this.anims.create() extra: Phaser le avvia da solo
    // nei TilemapLayer che contengono quei tile. Se non si vedono, il
    // problema è che water_anim.png o foam_anim.png non sono stati trovati.
    // Controlla in console che NON ci siano "Failed to process file" per questi.

    // ── Musica di sottofondo + ciclo giorno/notte ────────────────────────────
    // AudioManager gestisce il blocco autoplay del browser (attende il primo
    // input utente) e il crossfade tra traccia diurna e notturna.
    // DayNightSystem legge l'ora reale del dispositivo, applica l'overlay
    // visivo e chiede il crossfade musicale quando cambia fascia.
    this.audioManager = new AudioManager(this)
    this.audioManager.playBase('bgm_day')
    this.dayNight = new DayNightSystem(this, this.audioManager)

    // ── Camera ────────────────────────────────────────────────────────────────
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(2)

    // ── Debug Matter (hitbox visibili se debug:true nel config) ──────────────
    // Per nascondere le hitbox: metti debug:false nel config Phaser.

    // ── Input ─────────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })

    // ── Debug coord tile (F2 per toggle) ─────────────────────────────────────
    // Non usiamo più un testo sempre visibile (causava la "lineetta verde").
    // Premere F2 per mostrare/nascondere le coordinate tile.
    if (import.meta.env.DEV) {
      this.debugText = this.add.text(8, 8, '', {
        fontSize: '10px', fontFamily: 'monospace',
        color: '#00ff00', backgroundColor: '#000000aa',
        padding: { x: 4, y: 4 },
      }).setScrollFactor(0).setDepth(200).setVisible(false)

      this.input.keyboard.on('keydown-F2', () => {
        this.debugText.setVisible(!this.debugText.visible)
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  update() {
    if (!this.player) return

    const left  = this.cursors.left.isDown  || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown
    const up    = this.cursors.up.isDown    || this.wasd.up.isDown
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown

    // Matter.js: impostiamo la velocità OGNI frame (non si accumula)
    let vx = 0
    let vy = 0
    if (left)  vx = -PLAYER_SPEED
    if (right) vx =  PLAYER_SPEED
    if (up)    vy = -PLAYER_SPEED
    if (down)  vy =  PLAYER_SPEED

    // Normalizza diagonale
    if (vx !== 0 && vy !== 0) {
      vx = vx / Math.SQRT2
      vy = vy / Math.SQRT2
    }

    // setVelocity sovrascrive completamente la velocità ogni frame —
    // questo impedisce l'accumulo di velocità e lo spinning
    this.player.setVelocity(vx, vy)

    // Azzera anche la velocità angolare ogni frame (anti-spin)
    this.player.setAngularVelocity(0)

    // Animazioni
    if (this.textures.exists('player')) {
      if (left)       this.player.play('walk_left',  true)
      else if (right) this.player.play('walk_right', true)
      else if (up)    this.player.play('walk_up',    true)
      else if (down)  this.player.play('walk_down',  true)
      else            this.player.play('idle',       true)
    }

    if (import.meta.env.DEV && this.debugText?.visible) {
      const tx = Math.floor(this.player.x / TILE_SIZE)
      const ty = Math.floor(this.player.y / TILE_SIZE)
      this.debugText.setText(`tile (${tx},${ty})  px (${Math.floor(this.player.x)},${Math.floor(this.player.y)})`)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Ferma timer e audio quando la scena viene fermata/riavviata, per
   * evitare timer orfani e tracce musicali sovrapposte.
   */
  shutdown() {
    this.dayNight?.destroy()
    this.audioManager?.destroy()
  }
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Legge i metadati di animazione dai tileset Tiled e registra un timer
   * che aggiorna i frame animati a ogni interval dichiarato nel TMJ.
   *
   * Funziona per qualsiasi tileset con blocco "animation" nel TMJ:
   * - Acqua animata (4 frame, 180ms)
   * - Schiuma cascata (4 frame, 160ms)
   *
   * @param {Phaser.Tilemaps.Tilemap} map
   * @private
   */
  _initTiledAnimations(map) {
    // Raccoglie tutti i tile con animazione da tutti i tileset della mappa
    const animatedTiles = []

    for (const tileset of map.tilesets) {
      // map.tilesets sono gli oggetti Phaser Tileset (già registrati con addTilesetImage)
      // I dati Tiled grezzi sono in tileset.tileData
      const tileData = tileset.tileData ?? {}

      for (const [localIdStr, data] of Object.entries(tileData)) {
        if (!data.animation) continue

        const localId = parseInt(localIdStr, 10)
        const firstgid = tileset.firstgid
        const globalId = firstgid + localId

        // Converti i frame in global tile ID
        const frames = data.animation.map(f => ({
          globalId: firstgid + f.tileid,
          duration: f.duration,
        }))

        animatedTiles.push({
          globalId,   // tile ID che appare nel layer data
          frames,
          currentFrame: 0,
          elapsed: 0,
        })

        console.log(`[TiledAnim] Tileset "${tileset.name}" tile ${globalId}: ${frames.length} frame`)
      }
    }

    if (animatedTiles.length === 0) {
      console.warn('[TiledAnim] Nessun tile animato trovato — verifica che i tileset siano caricati correttamente')
      return
    }

    // Aggiorna le animazioni a ogni frame tramite scene.events.on('update')
    this.events.on('update', (/** @type {number} */ _time, /** @type {number} */ delta) => {
      for (const anim of animatedTiles) {
        anim.elapsed += delta

        const frame = anim.frames[anim.currentFrame]
        if (anim.elapsed >= frame.duration) {
          anim.elapsed -= frame.duration
          anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length

          const nextGlobalId = anim.frames[anim.currentFrame].globalId

          // Aggiorna tutti i tile con questo globalId in tutti i layer della mappa
          map.layers.forEach(layerData => {
            if (!layerData.data) return
            layerData.data.forEach(row => {
              row.forEach(tile => {
                if (tile.index === anim.globalId) {
                  tile.index = nextGlobalId
                  // Forza il redraw del tile
                  if (tile.tilemapLayer) {
                    tile.tilemapLayer.putTileAt(nextGlobalId, tile.x, tile.y)
                  }
                }
              })
            })
          })

          // Aggiorna il riferimento per il prossimo ciclo
          anim.globalId = nextGlobalId
        }
      }
    })
  }

}