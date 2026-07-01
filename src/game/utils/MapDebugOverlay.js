/**
 * @file MapDebugOverlay.js
 * Overlay visivo di debug per la mappa del villaggio.
 * Visibile SOLO in modalità DEV (import.meta.env.DEV === true).
 *
 * Funzionalità:
 *  - Toggle con F1
 *  - Rettangoli semitrasparenti per ogni zona con etichetta
 *  - Coordinate tile del cursore (in basso a sinistra)
 *  - Elenco case per zona con id e nome
 *
 * Usato solo da VillageScene.js:
 *   if (import.meta.env.DEV) { this.debugOverlay = new MapDebugOverlay(this, mapData) }
 */

import { VILLAGE_CONFIG } from '@data/villageConfig'

/** Colori zona → valore esadecimale Phaser */
const ZONE_COLORS = {
  center: 0xffff00,
  north:  0x00ccff,
  south:  0xff8800,
  east:   0x00ff88,
  west:   0xff0088,
  forest: 0x44ff44,
}

/** Zone bounds, duplicate qui per non dipendere da MapGenerator internals */
const ZONE_BOUNDS = {
  center: { x1: 22, y1: 16, x2: 38, y2: 29 },
  north:  { x1: 15, y1:  2, x2: 45, y2: 14 },
  south:  { x1: 15, y1: 31, x2: 45, y2: 39 },
  east:   { x1: 44, y1: 10, x2: 57, y2: 35 },
  west:   { x1:  2, y1: 10, x2: 16, y2: 35 },
  forest: { x1:  2, y1:  2, x2: 14, y2: 20 },
}

const TILE_SIZE = 16

export class MapDebugOverlay {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../generators/MapGenerator').GeneratedMap} mapData
   */
  constructor(scene, mapData) {
    this.scene   = scene
    this.mapData = mapData
    this.visible = false

    /** @type {Phaser.GameObjects.Graphics|null} */
    this.graphics = null

    /** @type {Phaser.GameObjects.Text|null} */
    this.coordText = null

    /** @type {Phaser.GameObjects.Text|null} */
    this.houseListText = null

    /** @type {Phaser.GameObjects.Container|null} */
    this.zoneLabels = null
  }

  /**
   * Inizializza i game object — chiamare una sola volta dopo create().
   */
  init() {
    const scene = this.scene

    // ── Graphics per rettangoli zone ─────────────────────────────────────────
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(100)
    this.graphics.setScrollFactor(1)   // segue la camera

    // ── Label coordinate tile (fixed, bottom-left) ────────────────────────────
    this.coordText = scene.add.text(8, scene.scale.height - 40, '', {
      fontSize:       '10px',
      fontFamily:     'monospace',
      color:          '#00ff00',
      backgroundColor: '#000000cc',
      padding:        { x: 6, y: 4 },
    })
    this.coordText.setScrollFactor(0)
    this.coordText.setDepth(200)

    // ── Elenco case per zona (fixed, top-right) ────────────────────────────────
    const houseList = this._buildHouseList()
    this.houseListText = scene.add.text(
      scene.scale.width - 8,
      8,
      houseList,
      {
        fontSize:       '8px',
        fontFamily:     'monospace',
        color:          '#ffffff',
        backgroundColor: '#000000cc',
        padding:        { x: 6, y: 4 },
        align:          'right',
      }
    )
    this.houseListText.setOrigin(1, 0)
    this.houseListText.setScrollFactor(0)
    this.houseListText.setDepth(200)

    // ── Etichette zone (nel mondo, seguono camera) ────────────────────────────
    this.zoneLabels = scene.add.container(0, 0)
    this.zoneLabels.setDepth(101)

    for (const [zoneName, b] of Object.entries(ZONE_BOUNDS)) {
      const cx = (b.x1 + b.x2) / 2 * TILE_SIZE
      const cy = (b.y1 + b.y2) / 2 * TILE_SIZE
      const label = scene.add.text(cx, cy, zoneName.toUpperCase(), {
        fontSize:       '8px',
        fontFamily:     'monospace',
        color:          '#ffffff',
        stroke:         '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5)
      this.zoneLabels.add(label)
    }

    // Disegna subito i rettangoli zone (ma nascosti finché non si attiva)
    this._drawZones()

    // Tutto nascosto all'avvio
    this._setVisible(false)
  }

  /**
   * Toggle visibilità overlay (chiamato da F1).
   */
  toggle() {
    this.visible = !this.visible
    this._setVisible(this.visible)
    console.log(`[MapDebugOverlay] ${this.visible ? 'ON' : 'OFF'}`)
  }

  /**
   * Aggiorna le coordinate tile del cursore. Chiamare in update().
   */
  update() {
    if (!this.visible || !this.coordText) return

    const pointer  = this.scene.input.activePointer
    const worldX   = pointer.worldX
    const worldY   = pointer.worldY
    const tileX    = Math.floor(worldX / TILE_SIZE)
    const tileY    = Math.floor(worldY / TILE_SIZE)

    // Individua in quale zona si trova il cursore
    let zoneName = '—'
    for (const [name, b] of Object.entries(ZONE_BOUNDS)) {
      if (tileX >= b.x1 && tileX <= b.x2 && tileY >= b.y1 && tileY <= b.y2) {
        zoneName = name
        break
      }
    }

    this.coordText.setText(
      `Tile: (${tileX}, ${tileY})  Pixel: (${Math.floor(worldX)}, ${Math.floor(worldY)})  Zona: ${zoneName}`
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Disegna rettangoli semitrasparenti per ogni zona.
   * @private
   */
  _drawZones() {
    if (!this.graphics) return
    this.graphics.clear()

    for (const [zoneName, b] of Object.entries(ZONE_BOUNDS)) {
      const color   = ZONE_COLORS[zoneName] ?? 0xffffff
      const px      = b.x1 * TILE_SIZE
      const py      = b.y1 * TILE_SIZE
      const pw      = (b.x2 - b.x1) * TILE_SIZE
      const ph      = (b.y2 - b.y1) * TILE_SIZE

      // Fill semitrasparente
      this.graphics.fillStyle(color, 0.12)
      this.graphics.fillRect(px, py, pw, ph)

      // Bordo
      this.graphics.lineStyle(1, color, 0.8)
      this.graphics.strokeRect(px, py, pw, ph)
    }

    // Disegna spawn points
    const sp = this.mapData.spawnPoints
    this._drawCross(sp.player.x, sp.player.y, 0xffffff, 'Player')
    this._drawCross(sp.pet.x,    sp.pet.y,    0xffaaff, 'Pet')

    for (const [id, pos] of Object.entries(sp.npcs)) {
      this._drawCross(pos.x, pos.y, 0xffff00, id)
    }
  }

  /**
   * Disegna una croce + etichetta per un punto di spawn.
   * @param {number} px - pixel x
   * @param {number} py - pixel y
   * @param {number} color
   * @param {string} label
   * @private
   */
  _drawCross(px, py, color, label) {
    const g = this.graphics
    const S = 5
    g.lineStyle(1, color, 1)
    g.strokeRect(px - S, py - S, S * 2, S * 2)

    this.scene.add.text(px, py - S - 4, label, {
      fontSize:       '6px',
      fontFamily:     'monospace',
      color:          '#' + color.toString(16).padStart(6, '0'),
      stroke:         '#000000',
      strokeThickness: 1,
    })
      .setOrigin(0.5, 1)
      .setDepth(102)
  }

  /**
   * Costruisce il testo dell'elenco case per zona.
   * @returns {string}
   * @private
   */
  _buildHouseList() {
    const zones = {}
    for (const inh of VILLAGE_CONFIG.inhabitants) {
      if (!zones[inh.zone]) zones[inh.zone] = []
      zones[inh.zone].push(`  ${inh.id} (${inh.residentName})`)
    }

    let out = '── CASE PER ZONA ──\n'
    for (const [zoneName, entries] of Object.entries(zones)) {
      out += `[${zoneName.toUpperCase()}]\n`
      out += entries.join('\n') + '\n'
    }
    return out.trim()
  }

  /**
   * Mostra/nasconde tutti i game object del debug.
   * @param {boolean} visible
   * @private
   */
  _setVisible(visible) {
    if (this.graphics)      this.graphics.setVisible(visible)
    if (this.coordText)     this.coordText.setVisible(visible)
    if (this.houseListText) this.houseListText.setVisible(visible)
    if (this.zoneLabels)    this.zoneLabels.setVisible(visible)
  }
}