/**
 * @file interiors.js
 * Configurazione di tutte le case visitabili. Ogni interno riusa la stessa
 * InteriorScene generica: qui definiamo solo quale tilemap e quali tileset
 * caricare per ciascuna casa. Non serve scrivere una scena Phaser per ogni
 * casa, solo un file .tmj dedicato.
 *
 * Convenzioni richieste in ogni .tmj di un interno (vedi InteriorScene.js):
 *   - Object Layer "collision": muri/mobili
 *   - Object Layer "exit": un solo oggetto rettangolare vicino alla porta
 *
 * `name` in tilesetImages deve combaciare con il "name" del tileset dentro
 * il file .tmj (stessa logica di map.addTilesetImage(nameInTMJ, key) usata
 * in VillageScene.js). Se il tileset del .tmj ha lo stesso nome della key,
 * puoi ometterlo.
 */
/**
 * I 3 tileset condivisi da tutti gli interni.
 * key  = chiave texture Phaser (usata in this.load.image)
 * path = percorso del PNG dentro public/
 * name = nome ESATTO del tileset nel .tmj
 * @type {{ name: string, key: string, path: string }[]}
 */
const SHARED_INTERIOR_TILESETS = [
  {
    name: 'InteriorTilesLITE (1)',
    key:  'interior_lite',
    path: 'assets/tilesets/interior_lite.png',
  },
  {
    name: 'TILESET INDOORS +Bathroom',
    key:  'interior_indoors',
    path: 'assets/tilesets/interior_indoors.png',
  },
  {
    name: 'Pixel Interiors 32x32pxl',
    key:  'interior_pixel',
    path: 'assets/tilesets/interior_pixel.png',
  },
  {
    name: 'Interiors_free_32x32',
    key:  'interior_free',
    path: 'assets/tilesets/Interiors_free_32x32.png',
  },
  {
    name: 'Interiors_free_16x16',
    key:  'interior_free_16x16',
    path: 'assets/tilesets/Interiors_free_16x16.png',
  },
]
 
export const INTERIORS = {
  interior_anna: {
    tilemapKey:    'interior_anna',
    tilemapPath:   'assets/interiors/house_anna.tmj',
    tilesetImages: SHARED_INTERIOR_TILESETS,
  },
  interior_cece: {
    tilemapKey:    'interior_cece',
    tilemapPath:   'assets/interiors/house_cece.tmj',
    tilesetImages: SHARED_INTERIOR_TILESETS,
  },
  interior_daniele: {
    tilemapKey:    'interior_daniele',
    tilemapPath:   'assets/interiors/house_daniele.tmj',
    tilesetImages: SHARED_INTERIOR_TILESETS,
  },
  interior_debora: {
    tilemapKey:    'interior_debora',
    tilemapPath:   'assets/interiors/house_debora.tmj',
    tilesetImages: SHARED_INTERIOR_TILESETS,
  },
}