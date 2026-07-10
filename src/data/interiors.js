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
export const INTERIORS = {
  interior_casa_cecilia: {
    tilemapKey: 'interior_casa_cecilia',
    tilemapPath: 'assets/interiors/house_cecilia.tmj',
    tilesetImages: [
      { name: 'Pixel Interiors 32x32pxl', key: 'pixel_interiors_base', path: 'assets/tilesets/Pixel Interiors 32x32pxl.png' },
    ],
  },

  // interior_casa_fucsia: {
  //   tilemapKey: 'interior_casa_fucsia',
  //   tilemapPath: 'assets/interiors/casa_fucsia.tmj',
  //   tilesetImages: [
  //     { name: 'interior_base', key: 'interior_base', path: 'assets/tilesets/interior_base.png' },
  //   ],
  // },


  // Aggiungi qui le altre case man mano che crei i relativi file .tmj.
  // La chiave (es. "interior_casa_verde") è lo stesso valore che devi
  // scrivere nella proprietà "targetInterior" degli oggetti dell'Object
  // Layer "doors" in villaggio.tmj.
}