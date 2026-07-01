/**
 * @file MapGenerator.js
 * Genera la mappa del villaggio da VILLAGE_CONFIG con seed fisso.
 * Il risultato viene cachato in localStorage: stessa mappa identica ad ogni partita.
 * Se il seed cambia, la cache viene invalidata e la mappa viene rigenrata.
 */

import { SeededRandom } from './PRNG.js'
import { HOUSE_LAYOUTS } from './HouseLayouts.js'

// ─────────────────────────────────────────────────────────────────────────────
// TILE ID — sostituisci con gli id reali del tuo tileset
// ─────────────────────────────────────────────────────────────────────────────
const TILE = {
  GRASS:        1,
  SAND_LIGHT:   2,
  SAND_MID:     3,
  SAND_DARK:    4,
  WATER:        5,
  WATER_EDGE:   6,
  PATH_COBBLE:  10,
  PATH_DIRT:    11,
  PATH_STONE:   12,
  PATH_WOOD:    13,
  BRIDGE_H:     14,
  BRIDGE_V:     15,
  TREE_OAK:     20,
  TREE_PINE:    21,
  TREE_APPLE:   22,
  TREE_CHERRY:  23,
  FLOWER_RED:   30,
  FLOWER_YELLOW:31,
  FLOWER_PINK:  32,
  FLOWER_WHITE: 33,
  FLOWER_PURPLE:34,
  FLOWER_ORANGE:35,
  ROCK:         40,
  MUSHROOM:     41,
  SHELL:        42,
}

/** Mappa stile percorso → tile id */
const PATH_TILE_ID = {
  cobblestone: TILE.PATH_COBBLE,
  dirt:        TILE.PATH_DIRT,
  stone:       TILE.PATH_STONE,
  wood:        TILE.PATH_WOOD,
}

/** Mappa variante fiore → tile id */
const FLOWER_TILE_ID = {
  red:    TILE.FLOWER_RED,
  yellow: TILE.FLOWER_YELLOW,
  pink:   TILE.FLOWER_PINK,
  white:  TILE.FLOWER_WHITE,
  purple: TILE.FLOWER_PURPLE,
  orange: TILE.FLOWER_ORANGE,
}

/** Mappa variante albero → tile id */
const TREE_TILE_ID = {
  oak:    TILE.TREE_OAK,
  pine:   TILE.TREE_PINE,
  apple:  TILE.TREE_APPLE,
  cherry: TILE.TREE_CHERRY,
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone bounds (in tile)
// ─────────────────────────────────────────────────────────────────────────────
const ZONE_BOUNDS = {
  center: { x1: 22, y1: 16, x2: 38, y2: 29 },
  north:  { x1: 15, y1:  2, x2: 45, y2: 14 },
  south:  { x1: 15, y1: 31, x2: 45, y2: 39 },
  east:   { x1: 44, y1: 10, x2: 57, y2: 35 },
  west:   { x1:  2, y1: 10, x2: 16, y2: 35 },
  forest: { x1:  2, y1:  2, x2: 14, y2: 20 },
}

const MAP_WIDTH  = 60
const MAP_HEIGHT = 45
const CACHE_VERSION = 'v1'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea una griglia 2D inizializzata al valore dato.
 * @param {number} w
 * @param {number} h
 * @param {number} [fill=0]
 * @returns {number[][]}
 */
function makeGrid(w, h, fill = 0) {
  return Array.from({ length: h }, () => new Array(w).fill(fill))
}

/**
 * Restituisce true se (tx, ty) è dentro i bounds della mappa.
 * @param {number} tx
 * @param {number} ty
 * @returns {boolean}
 */
function inBounds(tx, ty) {
  return tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT
}

/**
 * Calcola il centro (tile) di una zona.
 * @param {string} zone - chiave di ZONE_BOUNDS
 * @returns {{ cx: number, cy: number }}
 */
function zoneCenter(zone) {
  const b = ZONE_BOUNDS[zone]
  return {
    cx: Math.floor((b.x1 + b.x2) / 2),
    cy: Math.floor((b.y1 + b.y2) / 2),
  }
}

/**
 * Clamp un valore tra min e max.
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// ─────────────────────────────────────────────────────────────────────────────
// A* semplificato per i percorsi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pathfinding A* semplificato su griglia.
 * Ritorna un array di {x, y} tile oppure null se non c'è percorso.
 * @param {{ x:number, y:number }} start
 * @param {{ x:number, y:number }} end
 * @param {(tx:number, ty:number) => boolean} isBlocked
 * @returns {Array<{x:number, y:number}>|null}
 */
function findPath(start, end, isBlocked) {
  const key = (x, y) => `${x},${y}`
  const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

  const open = new Map()
  const closed = new Set()
  const cameFrom = new Map()
  const gScore = new Map()
  const fScore = new Map()

  const startKey = key(start.x, start.y)
  gScore.set(startKey, 0)
  fScore.set(startKey, heuristic(start, end))
  open.set(startKey, start)

  const DIRS = [
    { x:  0, y: -1 },
    { x:  0, y:  1 },
    { x: -1, y:  0 },
    { x:  1, y:  0 },
  ]

  // limite iterazioni per evitare loop infiniti su mappe grandi
  let iterations = 0
  const MAX_ITER = MAP_WIDTH * MAP_HEIGHT * 2

  while (open.size > 0 && iterations++ < MAX_ITER) {
    // nodo con f minore
    let currentKey = null
    let currentF = Infinity
    for (const [k] of open) {
      const f = fScore.get(k) ?? Infinity
      if (f < currentF) { currentF = f; currentKey = k }
    }

    const current = open.get(currentKey)
    if (current.x === end.x && current.y === end.y) {
      // Ricostruisce percorso
      const path = []
      let k = currentKey
      while (cameFrom.has(k)) {
        const n = cameFrom.get(k)
        path.unshift(n)
        k = key(n.x, n.y)
      }
      path.push(end)
      return path
    }

    open.delete(currentKey)
    closed.add(currentKey)

    for (const dir of DIRS) {
      const nx = current.x + dir.x
      const ny = current.y + dir.y
      if (!inBounds(nx, ny)) continue
      const nk = key(nx, ny)
      if (closed.has(nk)) continue
      if (isBlocked(nx, ny)) continue

      const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, { x: current.x, y: current.y })
        gScore.set(nk, tentativeG)
        fScore.set(nk, tentativeG + heuristic({ x: nx, y: ny }, end))
        if (!open.has(nk)) open.set(nk, { x: nx, y: ny })
      }
    }
  }

  return null  // nessun percorso trovato
}

// ─────────────────────────────────────────────────────────────────────────────
// MapGenerator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} PlacedObject
 * @property {number} x        - pixel x
 * @property {number} y        - pixel y
 * @property {string} type     - es. 'flower', 'tree', 'bench', 'mailbox', ...
 * @property {string} variant  - es. 'red', 'oak', 'wood', ...
 * @property {string} [itemId]
 * @property {string} [npcId]
 */

/**
 * @typedef {Object} GeneratedMap
 * @property {number} width
 * @property {number} height
 * @property {{ ground: number[][], decoration: number[][], paths: number[][], buildings: number[][], above: number[][], objects: PlacedObject[] }} layers
 * @property {{ player: {x:number, y:number}, npcs: Object.<string,{x:number,y:number}>, pet: {x:number, y:number}, items: Array<{x:number, y:number, itemId:string}> }} spawnPoints
 * @property {Array<{x:number, y:number, text:string, color:string}>} houseLabels
 */

export class MapGenerator {
  /**
   * @param {import('@data/villageConfig').VILLAGE_CONFIG} config
   */
  constructor(config) {
    this.config = config
    this.rng = new SeededRandom(config.seed)
  }

  /**
   * Genera (o carica dalla cache) la mappa del villaggio.
   * @returns {GeneratedMap}
   */
  generate() {
    const cacheKey = `village_map_${CACHE_VERSION}_seed_${this.config.seed}`

    // ── STEP 1: controlla localStorage ────────────────────────────────────────
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed && parsed._seed === this.config.seed) {
          console.log('[MapGenerator] Mappa caricata dalla cache.')
          return parsed
        }
      }
    } catch (e) {
      console.warn('[MapGenerator] Cache non leggibile, rigenero.', e)
    }

    console.log('[MapGenerator] Genero nuova mappa con seed:', this.config.seed)

    // Layer grezzi
    const W = MAP_WIDTH
    const H = MAP_HEIGHT

    const ground     = makeGrid(W, H, TILE.GRASS)
    const decoration = makeGrid(W, H, 0)
    const paths      = makeGrid(W, H, 0)
    const buildings  = makeGrid(W, H, 0)
    const above      = makeGrid(W, H, 0)

    /** @type {PlacedObject[]} */
    const objects = []

    /** @type {GeneratedMap['spawnPoints']} */
    const spawnPoints = {
      player: { x: 0, y: 0 },
      npcs:   {},
      pet:    { x: 0, y: 0 },
      items:  [],
    }

    /** @type {GeneratedMap['houseLabels']} */
    const houseLabels = []

    // Set di tile occupate (buildings, river) — usato per skip natura e pathfinding
    const occupied = new Set()
    const markOccupied = (tx, ty) => occupied.add(`${tx},${ty}`)
    const isOccupied   = (tx, ty) => occupied.has(`${tx},${ty}`)

    // Set di tile con acqua (river) — pathfinding non ci passa (solo ponti)
    const riverTiles = new Set()
    const markRiver  = (tx, ty) => riverTiles.add(`${tx},${ty}`)
    const isRiver    = (tx, ty) => riverTiles.has(`${tx},${ty}`)

    // ── STEP 2: Ground layer ──────────────────────────────────────────────────
    const { beach, river } = this.config.nature

    // Beach: ultimi 6 row → sabbia degradante
    if (beach && beach.enabled && beach.side === 'south') {
      for (let ty = H - 6; ty < H; ty++) {
        const dist = H - 1 - ty   // 0 = bordo, 5 = inizio sabbia
        const tileId = dist >= 4 ? TILE.SAND_LIGHT
                     : dist >= 2 ? TILE.SAND_MID
                     :             TILE.SAND_DARK
        for (let tx = 0; tx < W; tx++) {
          ground[ty][tx] = tileId
        }
      }
      // Acqua: ultima riga
      for (let tx = 0; tx < W; tx++) {
        ground[H - 1][tx] = TILE.WATER
        markOccupied(tx, H - 1)
      }
    }

    // River: Drunkard's Walk orizzontale
    // Posizionato a y ~22 (zona centrale, separa nord da sud)
    if (river && river.enabled && river.direction === 'horizontal') {
      const riverY     = 22   // riga di partenza del fiume
      const RIVER_WIDTH = 2   // larghezza in tile

      // zone con case — il fiume le aggira verticalmente
      const forbiddenX = new Set()
      for (const zoneName of Object.keys(ZONE_BOUNDS)) {
        const b = ZONE_BOUNDS[zoneName]
        if (b.y1 <= riverY + RIVER_WIDTH && b.y2 >= riverY) {
          for (let x = b.x1; x <= b.x2; x++) forbiddenX.add(x)
        }
      }

      let curY = riverY
      const bridgePositions = []
      const bridgePlaced    = new Set()

      for (let tx = 0; tx < W; tx++) {
        // Drunkard: devia di ±1 con probabilità 30%
        if (this.rng.next() < 0.3) {
          curY = clamp(curY + this.rng.nextInt(-1, 1), riverY - 2, riverY + 2)
        }

        // Se in zona proibita, salta la colonna (il fiume si interrompe → ponte potenziale)
        if (forbiddenX.has(tx)) {
          bridgePositions.push(tx)
          continue
        }

        for (let w = 0; w < RIVER_WIDTH; w++) {
          const ty = curY + w
          if (inBounds(tx, ty)) {
            ground[ty][tx]  = TILE.WATER
            decoration[ty][tx] = 0
            markOccupied(tx, ty)
            markRiver(tx, ty)
          }
        }

        // Bordi erba → acqua edge
        const edgeTop = curY - 1
        const edgeBot = curY + RIVER_WIDTH
        if (inBounds(tx, edgeTop) && ground[edgeTop][tx] === TILE.GRASS) {
          ground[edgeTop][tx] = TILE.WATER_EDGE
        }
        if (inBounds(tx, edgeBot) && ground[edgeBot][tx] === TILE.GRASS) {
          ground[edgeBot][tx] = TILE.WATER_EDGE
        }
      }

      // Ponti: prende N posizioni casuali dall'insieme dei bridge candidates
      const bridgeCount = river.bridgeCount ?? 2
      const shuffledBridges = this.rng.shuffle(bridgePositions)
      for (let i = 0; i < Math.min(bridgeCount, shuffledBridges.length); i++) {
        const bx = shuffledBridges[i]
        if (!bridgePlaced.has(bx)) {
          for (let w = 0; w < RIVER_WIDTH + 2; w++) {
            const ty = riverY - 1 + w
            if (inBounds(bx, ty)) {
              paths[ty][bx] = TILE.BRIDGE_H
              // Un ponte non è "occupied" (il giocatore ci cammina sopra)
              riverTiles.delete(`${bx},${ty}`)
            }
          }
          bridgePlaced.add(bx)
        }
      }
    }

    // ── STEP 4: Piazza case ───────────────────────────────────────────────────
    /**
     * Mappa npcId → { cx, cy } centro casa in tile.
     * Usata poi dai percorsi.
     * @type {Object.<string, {cx:number, cy:number}>}
     */
    const houseCenters = {}

    for (const inhabitant of this.config.inhabitants) {
      const layout = HOUSE_LAYOUTS[inhabitant.houseType] ?? HOUSE_LAYOUTS.cozy
      const { cx, cy } = zoneCenter(inhabitant.zone)

      const rows = layout.walls.length
      const cols = layout.walls[0].length

      // Offset per centrare il layout sulla zona
      const ox = cx - Math.floor(cols / 2)
      const oy = cy - Math.floor(rows / 2)

      houseCenters[inhabitant.id] = { cx, cy }

      // Ground
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tx = ox + c
          const ty = oy + r
          if (!inBounds(tx, ty)) continue
          const tileId = layout.ground[r][c]
          if (tileId !== 0) ground[ty][tx] = tileId
        }
      }

      // Walls (buildings layer, collisioni)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tx = ox + c
          const ty = oy + r
          if (!inBounds(tx, ty)) continue
          const tileId = layout.walls[r][c]
          if (tileId !== 0) {
            buildings[ty][tx] = tileId
            markOccupied(tx, ty)
          }
        }
      }

      // Roof (above layer)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tx = ox + c
          const ty = oy + r
          if (!inBounds(tx, ty)) continue
          const tileId = layout.roof[r][c]
          if (tileId !== 0) above[ty][tx] = tileId
        }
      }

      // Posizione porta per spawn NPC e label
      const doorTx = ox + layout.doorOffset.x
      const doorTy = oy + layout.doorOffset.y + 1  // un tile davanti alla porta

      // houseLabel: sopra la porta (un tile in alto rispetto al centro della facciata)
      houseLabels.push({
        x:     doorTx * 16,
        y:     (doorTy - 1) * 16,
        text:  inhabitant.residentName,
        color: inhabitant.color ?? '#ffffff',
      })

      // Spawn NPC: davanti alla porta
      if (inhabitant.npc) {
        spawnPoints.npcs[inhabitant.id] = {
          x: doorTx * 16 + 8,
          y: doorTy * 16 + 8,
        }
      }
    }

    // ── Player spawn ──────────────────────────────────────────────────────────
    const ps = this.config.player.spawnTile
    spawnPoints.player = { x: ps.x * 16 + 8, y: ps.y * 16 + 8 }

    // Pet spawn: vicino al player
    spawnPoints.pet = {
      x: (ps.x + 1) * 16 + 8,
      y: ps.y * 16 + 8,
    }

    // ── STEP 5: Percorsi A* ───────────────────────────────────────────────────
    if (this.config.paths.autoConnect) {
      const pathTileId = PATH_TILE_ID[this.config.paths.style] ?? TILE.PATH_COBBLE
      const mapCenter  = { x: Math.floor(MAP_WIDTH / 2), y: Math.floor(MAP_HEIGHT / 2) }

      const isBlocked = (tx, ty) => {
        // Il pathfinding evita i muri degli edifici e l'acqua (salvo ponti già presenti)
        return buildings[ty][tx] !== 0 || (isRiver(tx, ty) && paths[ty][tx] === 0)
      }

      for (const inhabitant of this.config.inhabitants) {
        const hc = houseCenters[inhabitant.id]
        if (!hc) continue

        const start = { x: hc.cx, y: hc.cy }
        const end   = mapCenter

        const route = findPath(start, end, isBlocked)
        if (route) {
          for (const node of route) {
            if (inBounds(node.x, node.y) && buildings[node.y][node.x] === 0) {
              paths[node.y][node.x] = pathTileId
            }
          }
        }
      }
    }

    // ── STEP 6: NearbyObjects ─────────────────────────────────────────────────
    for (const inhabitant of this.config.inhabitants) {
      const hc = houseCenters[inhabitant.id]
      if (!hc || !inhabitant.nearbyObjects) continue

      for (const obj of inhabitant.nearbyObjects) {
        const tx = hc.cx + obj.offsetTile.x
        const ty = hc.cy + obj.offsetTile.y

        // Sicurezza: non fuori mappa
        if (!inBounds(tx, ty)) continue

        objects.push({
          x:       tx * 16 + 8,
          y:       ty * 16 + 8,
          type:    obj.type,
          variant: obj.variant,
          npcId:   inhabitant.id,
        })
      }
    }

    // ── STEP 7: Natura procedurale ────────────────────────────────────────────
    const nature = this.config.nature

    // Helper: prova a piazzare un tile decorativo random sulla mappa
    const tryPlace = (tileId, maxAttempts = 50) => {
      for (let i = 0; i < maxAttempts; i++) {
        const tx = this.rng.nextInt(1, MAP_WIDTH  - 2)
        const ty = this.rng.nextInt(1, MAP_HEIGHT - 8)   // evita la beach
        if (isOccupied(tx, ty)) continue
        if (paths[ty][tx] !== 0) continue
        decoration[ty][tx] = tileId
        markOccupied(tx, ty)
        return true
      }
      return false
    }

    // Alberi
    if (nature.trees) {
      for (let i = 0; i < nature.trees.count; i++) {
        const variant = this.rng.nextFrom(nature.trees.variants)
        const tileId  = TREE_TILE_ID[variant] ?? TILE.TREE_OAK
        tryPlace(tileId)
      }
    }

    // Fiori
    if (nature.flowers) {
      for (let i = 0; i < nature.flowers.count; i++) {
        const variant = this.rng.nextFrom(nature.flowers.variants)
        const tileId  = FLOWER_TILE_ID[variant] ?? TILE.FLOWER_RED
        tryPlace(tileId)
      }
    }

    // Rocce
    if (nature.rocks) {
      for (let i = 0; i < nature.rocks.count; i++) {
        tryPlace(TILE.ROCK)
      }
    }

    // Funghi
    if (nature.mushrooms) {
      for (let i = 0; i < nature.mushrooms.count; i++) {
        tryPlace(TILE.MUSHROOM)
      }
    }

    // Conchiglie sulla spiaggia
    if (beach && beach.enabled) {
      const shellCount = beach.shellCount ?? 10
      for (let i = 0; i < shellCount; i++) {
        const tx = this.rng.nextInt(1, MAP_WIDTH - 2)
        const ty = this.rng.nextInt(MAP_HEIGHT - 5, MAP_HEIGHT - 2)
        if (!isOccupied(tx, ty) && ground[ty][tx] !== TILE.WATER) {
          decoration[ty][tx] = TILE.SHELL
          markOccupied(tx, ty)
        }
      }
    }

    // ── Costruisce GeneratedMap ───────────────────────────────────────────────
    /** @type {GeneratedMap} */
    const generatedMap = {
      _seed: this.config.seed,    // metadata per invalidazione cache
      width:  MAP_WIDTH,
      height: MAP_HEIGHT,
      layers: {
        ground,
        decoration,
        paths,
        buildings,
        above,
        objects,
      },
      spawnPoints,
      houseLabels,
    }

    // ── STEP 8: Serializza e salva in localStorage ────────────────────────────
    try {
      localStorage.setItem(
        `village_map_${CACHE_VERSION}_seed_${this.config.seed}`,
        JSON.stringify(generatedMap)
      )
      console.log('[MapGenerator] Mappa salvata in cache.')
    } catch (e) {
      console.warn('[MapGenerator] Impossibile salvare in localStorage.', e)
    }

    return generatedMap
  }
}