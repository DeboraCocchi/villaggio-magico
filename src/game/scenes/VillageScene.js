/**
 * @file VillageScene.js
 * Carica villaggio.tmj con tutti i tileset.
 * Fix v3: layer creati per indice numerico (Phaser 3.90 non accetta LayerData diretto).
 * Fix v4: aggiunto supporto porte → interni (Object Layer "doors" + InteriorScene).
 */

import Phaser from 'phaser'
import { AudioManager }   from '../systems/AudioManager.js'
import { DayNightSystem } from '../systems/DayNightSystem.js'
import { ItemManager }    from '../managers/ItemManager.js'
import { NPCManager }     from '../managers/NPCManager.js'
import { PetManager }     from '../managers/PetManager.js'
import { listenFromReact, emitToReact } from '../utils/phaserBridge.js'
import { QuestManager } from '../managers/QuestManager.js'
import { PLAYER_SPRITE_REGISTRY_KEY, getSavedPlayerKey } from '../utils/playerCharacter.js'
import { touchInput } from '../utils/touchInput.js'
import { usePlayerStore, AUDIO_EVENT } from '../../store/usePlayerStore.js';
import { computeZoom } from '../utils/responsiveZoom.js'

const PLAYER_SPEED = 120
const TILE_SIZE    = 32
const PLAYER_FACING_STORAGE_KEY = 'villaggio-player-facing'
const RETURN_POSITION_REGISTRY_KEY = 'villaggio-return-position'

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
    this.itemManager   = null
    this.npcManager    = null
    this.petManager    = null
    this.questManager  = null
    this._dialogOpen   = false
    this._dialogCleanup = []
    this.playerFacing = 'down'

    // ── Stato porte/interni ────────────────────────────────────────────────
    this.isTransitioning = false
    this._doorSensors = []
    this._doorCollisionHandler = null
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
    const cacheData = this.cache.tilemap.get('villaggio')

    /**
     * Crea un layer per indice e gli assegna il depth.
     * @param {number} index
     * @param {number} depth
     * @returns {Phaser.Tilemaps.TilemapLayer|null}
     */
    const mkLayer = (index, depth) => {
      try {
        const layerData = map.layers[index]
        const l = map.createLayer(index, tilesets, 0, 0)
        if (l && layerData) {
          // Trova il layer corretto in cacheData usando l'id (gli indici sono sfasati)
          const rawLayerData = cacheData?.data?.layers?.find(layer => layer.id === layerData.id)
          const offsetX = rawLayerData?.offsetx ?? 0
          const offsetY = rawLayerData?.offsety ?? 0
          l.setPosition(offsetX, offsetY)
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
    mkLayer(17, 17)  // case     ← MANCAVA
    mkLayer(18, 18) 
    // Player sarà depth 19

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

    // ── Player ────────────────────────────────────────────────────────────────
    const spawnX = map.widthInPixels  / 2
    const spawnY = map.heightInPixels / 2

   const playerKey = this.registry.get(PLAYER_SPRITE_REGISTRY_KEY) ?? getSavedPlayerKey()
    this.player = this.matter.add.sprite(spawnX, spawnY, playerKey)
    this.player.setDepth(this.player.y) 
    this.player.setFixedRotation()   // impedisce rotazioni fisiche

    // Corpo fisico più piccolo dello sprite
    this.player.setBody({ type: 'rectangle', width: 20, height: 24 })

    this.playerFacing = this._loadPlayerFacing()

    // Smorzamento: senza questo Matter accumula velocità indefinitamente
    this.player.setFrictionAir(0.982)      // resistenza aria
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
    if (this.textures.exists(playerKey)) {
      if (!this.anims.exists('walk_down'))
        this.anims.create({ key: 'walk_down',  frames: this.anims.generateFrameNumbers(playerKey, { start:  0, end:  2 }), frameRate: 8, repeat: -1 })
      if (!this.anims.exists('walk_left'))
        this.anims.create({ key: 'walk_left',  frames: this.anims.generateFrameNumbers(playerKey, { start:  3, end:  5 }), frameRate: 8, repeat: -1 })
      if (!this.anims.exists('walk_right'))
        this.anims.create({ key: 'walk_right', frames: this.anims.generateFrameNumbers(playerKey, { start:  6, end:  8 }), frameRate: 8, repeat: -1 })
      if (!this.anims.exists('walk_up'))
        this.anims.create({ key: 'walk_up',    frames: this.anims.generateFrameNumbers(playerKey, { start:  9, end: 11 }), frameRate: 8, repeat: -1 })
      if (!this.anims.exists('idle'))
        this.anims.create({ key: 'idle',       frames: [{ key: playerKey, frame: 1 }],                                     frameRate: 1, repeat: -1 })
      const idleFrameByFacing = { down: 1, left: 4, right: 7, up: 10 }
      this.player.anims.stop()
      this.player.setFrame(idleFrameByFacing[this.playerFacing] ?? 1)
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
    const housePositions = this._getHouseLightPositions(map)
    this.dayNight = new DayNightSystem(this, this.audioManager, housePositions)

    // ── Missione giornaliera + collezionabili ────────────────────────────────
    // Legge gli Object Layer 'flowers'/'shells'/'fruits'/'mushrooms' del TMJ,
    // sceglie la missione del giorno e piazza i collezionabili da raccogliere.
    this.itemManager = new ItemManager(this, map)

    // ── NPC umani ─────────────────────────────────────────────────────────────
    // Un NPC per ogni abitante con blocco `npc` in villageConfig.js, posizionato
    // sul punto omonimo dell'Object Layer "npcs" del TMJ. Tasto E per parlare.
    this.npcManager = new NPCManager(this, map)

    // ── Pet ───────────────────────────────────────────────────────────────────
    // Blue (Zia Debora), Robby e Corrado (Nonno Daniele) vagabondano vicino
    // casa; il pet della player la segue ovunque si sposti nel villaggio.
    this.petManager = new PetManager(this, map, this.player)

    // Blocca il movimento mentre un dialogo NPC è aperto (DialogBox.jsx
    // emette 'dialog:open'/'dialog:close' sul bridge window).
    this._dialogCleanup = [
      listenFromReact('dialog:open',  () => { this._dialogOpen = true }),
      listenFromReact('dialog:close', () => { this._dialogOpen = false }),
      listenFromReact('audio:toggleMusic', ({ enabled }) => {
        this.audioManager.setMusicEnabled(enabled)
      }),
    ]

    // ── Sistema missioni ───────────────────────────────────────────
    // Ascolta 'item:collected' (ItemManager) e gestisce offerta/avanzamento/
    // completamento quest quando NPC.interact() chiama onNpcTalk().
    this.questManager = new QuestManager(this)


    // ── Porte verso gli interni delle case ───────────────────────────────────
    // Legge l'Object Layer "doors" del TMJ: un rettangolo per ogni porta, con
    // Custom Properties "targetInterior" (string), "spawnX"/"spawnY" (int).
    this._setupDoors(map)

    // Al risveglio (uscita dall'interno), riposiziona il player e riattiva
    // la scena — vedi InteriorScene.exitHouse().
    this.events.on('wake', this._onWake, this)

    if (import.meta.env.DEV) window.__scene = this // eslint-disable-line -- TEMP debug hook, rimosso a fine verifica

    // ── Camera ────────────────────────────────────────────────────────────────
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(computeZoom(this.scale))

    this._onResizeZoom = () => this.cameras.main.setZoom(computeZoom(this.scale))

    this.scale.on('resize', this._onResizeZoom)

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
  update(time, delta) {
    if (!this.player) return

    const idleFrameByFacing = { down: 1, left: 4, right: 7, up: 10 }

    // Mentre un dialogo NPC è aperto, il player resta fermo (ma NPC/item/
    // giorno-notte continuano ad aggiornarsi normalmente).
    if (this._dialogOpen) {
      this.player.setVelocity(0, 0)
      if (this.textures.exists('player')) {
        this.player.anims.stop()
        this.player.setFrame(idleFrameByFacing[this.playerFacing] ?? 1)
      }
      return
    }

    // Durante il fade verso/da un interno, il player resta fermo così non
    // "scivola" mentre lo schermo è nero.
    if (this.isTransitioning) {
      this.player.setVelocity(0, 0)
      return
    }

    const left  = this.cursors.left.isDown  || this.wasd.left.isDown  || touchInput.left
    const right = this.cursors.right.isDown || this.wasd.right.isDown || touchInput.right
    const up    = this.cursors.up.isDown    || this.wasd.up.isDown    || touchInput.up
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown  || touchInput.down

    // Matter.js: impostiamo la velocità OGNI frame (non si accumula)
    let vx = 0
    let vy = 0
    if (left)  vx = -PLAYER_SPEED
    if (right) vx =  PLAYER_SPEED
    if (up)    vy = -PLAYER_SPEED
    if (down)  vy =  PLAYER_SPEED

    let nextFacing = null
    if (left) nextFacing = 'left'
    else if (right) nextFacing = 'right'
    else if (up) nextFacing = 'up'
    else if (down) nextFacing = 'down'

    if (nextFacing && nextFacing !== this.playerFacing) {
      this.playerFacing = nextFacing
      this._savePlayerFacing(this.playerFacing)
    }

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

    // Aggiorna la profondità del player basata sulla posizione Y (isometric-like depth sort)
    // per ottenere il corretto ordinamento Z-order con i collezionabili
    this.player.setDepth(this.player.y)

    // Animazioni
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

    if (import.meta.env.DEV && this.debugText?.visible) {
      const tx = Math.floor(this.player.x / TILE_SIZE)
      const ty = Math.floor(this.player.y / TILE_SIZE)
      this.debugText.setText(`tile (${tx},${ty})  px (${Math.floor(this.player.x)},${Math.floor(this.player.y)})`)
    }

    this.itemManager?.update(this.player.x, this.player.y)
    this.npcManager?.update(this.player.x, this.player.y, delta)
    this.petManager?.update(this.player.x, this.player.y, delta, this.playerFacing)
  }

  _loadPlayerFacing() {
    try {
      const facing = localStorage.getItem(PLAYER_FACING_STORAGE_KEY)
      if (facing === 'down' || facing === 'left' || facing === 'right' || facing === 'up') {
        return facing
      }
    } catch (e) {
      console.warn('[VillageScene] Impossibile leggere direzione player da localStorage:', e)
    }

    return 'down'
  }

  _savePlayerFacing(facing) {
    try {
      localStorage.setItem(PLAYER_FACING_STORAGE_KEY, facing)
    } catch (e) {
      console.warn('[VillageScene] Impossibile salvare direzione player in localStorage:', e)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Porte → interni ────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Legge l'Object Layer "doors" del TMJ e crea un sensor Matter (non
   * collidente, solo overlap) per ogni porta. Ogni oggetto deve avere le
   * Custom Properties:
   *   - targetInterior (string): chiave in data/interiors.js
   *   - spawnX, spawnY (int): posizione del player dentro l'interno
   *
   * @param {Phaser.Tilemaps.Tilemap} map
   * @private
   */
  _setupDoors(map) {
    const doorsLayer = map.getObjectLayer('doors')
    if (!doorsLayer) {
      console.warn('[VillageScene] Object Layer "doors" non trovato: nessuna casa sarà accessibile')
      return
    }

    for (const obj of doorsLayer.objects) {
      const props = this._objectProps(obj)
      const targetInterior = props.targetInterior

      if (!targetInterior) {
        console.warn(`[VillageScene] Oggetto porta senza proprietà "targetInterior" (id ${obj.id})`)
        continue
      }

      const sensor = this.matter.add.rectangle(
        obj.x + (obj.width  ?? TILE_SIZE) / 2,
        obj.y + (obj.height ?? TILE_SIZE) / 2,
        obj.width  ?? TILE_SIZE,
        obj.height ?? TILE_SIZE,
        { isSensor: true, isStatic: true, label: 'door' }
      )

      // Attacchiamo i dati della porta direttamente al body Matter, come
      // già fatto altrove nel progetto per estendere oggetti Phaser/Matter.
      sensor.doorData = {
        targetInterior,
        spawnX: Number(props.spawnX) || 0,
        spawnY: Number(props.spawnY) || 0,
      }

      this._doorSensors.push(sensor)
    }

    if (this._doorSensors.length === 0) return

    this._doorCollisionHandler = (event) => {
      if (this.isTransitioning) return
      for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB]
        const door = bodies.find(b => b.label === 'door')
        const isPlayer = bodies.includes(this.player.body)
        if (door && isPlayer) {
          this.enterHouse(door.doorData)
          break
        }
      }
    }

    this.matter.world.on('collisionstart', this._doorCollisionHandler)
  }

  /**
   * Converte le Custom Properties grezze di un oggetto Tiled in un
   * dizionario semplice { nome: valore }.
   * @param {object} obj oggetto grezzo da map.getObjectLayer(...).objects
   * @returns {Record<string, any>}
   * @private
   */
  _objectProps(obj) {
    const out = {}
    for (const p of obj.properties ?? []) out[p.name] = p.value
    return out
  }

  /**
   * Avvia la transizione verso l'interno di una casa: fade to black,
   * mette in sleep VillageScene (stato/oggetti restano in memoria) e
   * lancia InteriorScene sopra.
   *
   * @param {{targetInterior: string, spawnX: number, spawnY: number}} doorData
   */
  enterHouse(doorData) {
    if (this.isTransitioning) return
    this.isTransitioning = true
    this.player.setVelocity(0, 0)

    // Ricorda dove si trovava il player (leggermente scostato dalla porta
    // al risveglio) per farlo ricomparire nello stesso punto uscendo.
    this.registry.set(RETURN_POSITION_REGISTRY_KEY, {
      x: this.player.x,
      y: this.player.y,
      facing: this.playerFacing,
    })

    emitToReact('scene:transition', { entering: doorData.targetInterior })

    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.setVisible(false)
      this.scene.sleep()
      this.scene.launch('InteriorScene', {
        interiorId: doorData.targetInterior,
        spawnX: doorData.spawnX,
        spawnY: doorData.spawnY,
      })
    })
  }

  /**
   * Chiamato quando VillageScene si risveglia (il player è uscito da una
   * casa). Riposiziona il player scostato dalla porta da cui era entrato,
   * per evitare che il sensore lo faccia rientrare subito in loop.
   * @param {Phaser.Scenes.Systems} sys
   * @param {object} [data]
   * @private
   */
  _onWake(sys, data) {
    this.isTransitioning = false
    this.scene.setVisible(true)

    const stored = this.registry.get(RETURN_POSITION_REGISTRY_KEY)
    if (stored) {
      const offsetByFacing = { up: [0, 24], down: [0, -24], left: [24, 0], right: [-24, 0] }
      const [ox, oy] = offsetByFacing[stored.facing] ?? [0, 24]
      this.player.setPosition(stored.x + ox, stored.y + oy)
      this.playerFacing = stored.facing
    }

    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Ferma timer e audio quando la scena viene fermata/riavviata, per
   * evitare timer orfani e tracce musicali sovrapposte.
   */
  shutdown() {
    if (this._onResizeZoom) {
      this.scale.off('resize', this._onResizeZoom)
      this._onResizeZoom = null
    }
    this.dayNight?.destroy()
    this.audioManager?.destroy()
    this.itemManager?.destroy()
    this.npcManager?.destroy()
    this.petManager?.destroy()
    this.questManager?.destroy()   // ← NUOVA
    for (const cleanup of this._dialogCleanup) cleanup()
    this._dialogCleanup = []

    if (this._doorCollisionHandler) {
      this.matter.world.off('collisionstart', this._doorCollisionHandler)
      this._doorCollisionHandler = null
    }
    this.events.off('wake', this._onWake, this)
    this._doorSensors = []
  }
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Legge l'Object Layer "houses" del TMJ e calcola, per ogni casa,
   * un punto (in pixel mappa) dove disegnare la luce di finestra accesa
   * di notte: centro orizzontale del bounding box del poligono/rettangolo,
   * un po' sotto il centro verticale (zona finestre, sotto il tetto).
   *
   * @param {Phaser.Tilemaps.Tilemap} map
   * @returns {Array<{x: number, y: number}>}
   * @private
   */
  _getHouseLightPositions(map) {
    const housesLayer = map.getObjectLayer('houses')
    if (!housesLayer) return []

    const positions = []

    for (const obj of housesLayer.objects) {
      if (!obj.name) continue // salta oggetti d'appoggio senza nome

      const points = obj.polygon
        ? obj.polygon.map(p => ({ x: obj.x + p.x, y: obj.y + p.y }))
        : [
            { x: obj.x, y: obj.y },
            { x: obj.x + (obj.width ?? 0), y: obj.y + (obj.height ?? 0) },
          ]

      const xs = points.map(p => p.x)
      const ys = points.map(p => p.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)

      positions.push({
        x: (minX + maxX) / 2,
        y: minY + (maxY - minY) * 0.6,
      })
    }


    return positions
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