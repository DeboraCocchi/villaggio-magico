// ✏️ MODIFICA SOLO QUESTO FILE per personalizzare il villaggio
// Aggiungi/rimuovi abitanti, cambia nomi, oggetti vicino alle case, dialoghi iniziali

export const VILLAGE_CONFIG = {
  // Seed fisso: cambiarlo rigenera tutto il villaggio con disposizione diversa
  seed: 42,
  villageName: 'Villaggio Arcobaleno',

  player: {
    name: 'Cecilia',
    spawnTile: { x: 30, y: 22 },
    pet: {
      name: 'Nala',
      animal: 'rabbit',      // 'cat' | 'dog' | 'rabbit' | 'hamster'
      behavior: 'follow_player', // segue sempre Cecilia, ovunque si muova
      spriteKey: 'npc_bunny',
    },
  },

  // Un abitante per ogni casa già presente nell'Object Layer "houses" di villaggio.tmj
  // (house_cece, house_daniele, house_anna, house_debora — vedi houseObjectName sotto).
  inhabitants: [
    {
      id: 'cecilia',
      residentName: 'Cecilia',
      houseType: 'player',    // 'player'|'elder'|'cozy'|'garden'|'shop'|'treehouse'
      color: 'pink',          // 'pink'|'blue'|'yellow'|'green'|'purple'|'orange'
      zone: 'center',         // 'center'|'north'|'south'|'east'|'west'|'forest'
      // Nome dell'oggetto casa nell'Object Layer "houses" del TMJ (villaggio.tmj).
      houseObjectName: 'house_cecilia',
      nearbyObjects: [
        { type: 'flower',  variant: 'red',    offsetTile: { x: -2, y: 0 } },
        { type: 'flower',  variant: 'yellow', offsetTile: { x: -1, y: 0 } },
        { type: 'mailbox', variant: 'pink',   offsetTile: { x:  2, y: 0 } },
      ],
      welcomeMessage: 'Bentornata a casa, Cecilia! 🏠 La tua stanza è in ordine.',
    },
    {
      id: 'nonno_daniele',
      residentName: 'Nonno Daniele',
      houseType: 'elder',
      color: 'blue',
      zone: 'north',
      houseObjectName: 'house_daniele',
      // File in public/assets/sprites/<spriteKey>.png (spritesheet 96×128, 3x4, come player.png)
      spriteKey: 'daniele',
      nearbyObjects: [
        { type: 'bench',  variant: 'wood',  offsetTile: { x:  2, y: 1 } },
        { type: 'tree',   variant: 'apple', offsetTile: { x: -2, y: -1 } },
        { type: 'flower', variant: 'white', offsetTile: { x:  1, y: 0 } },
      ],
      npc: {
        personality: 'saggio e affettuoso, racconta sempre storie del passato',
        catchphrase: 'Accendiamo la piscinetta?',
        firstDialog: 'Cecilia mia! Stavo proprio pensando a te. Siediti con il nonno! 👴',
      },
      welcomeMessage: 'La casa del Nonno Daniele. Robby fa un giro nel giardino.',
        pet: [{
        name: 'Robby',
        animal: 'dog',        // 'cat' | 'dog' | 'rabbit' | 'hamster'
        behavior: 'wander_near_home',
        spriteKey: 'robby',
        },
        {
        name: 'Corrado',
        animal: 'cat',        // 'cat' | 'dog' | 'rabbit' | 'hamster'
        behavior: 'wander_near_home',
        spriteKey: 'corrado',
        }
        ]
    },
    {
      id: 'nonna_anna',
      residentName: 'Nonna Anna',
      houseType: 'cozy',
      color: 'yellow',
      zone: 'east',
      houseObjectName: 'house_anna',
      spriteKey: 'anna',
      nearbyObjects: [
        { type: 'flower', variant: 'pink',   offsetTile: { x: -1, y: 0 } },
        { type: 'flower', variant: 'purple', offsetTile: { x: -2, y: 0 } },
        { type: 'swing',  variant: 'wood',   offsetTile: { x:  3, y: 1 } },
      ],
      npc: {
        personality: 'saggia e premurosa, ama la sua famiglia',
        catchphrase: 'Vieni a tavola!',
        firstDialog: 'Cecilia!! Hai fame? Copriti che prendi freddo!',
      },
      welcomeMessage: 'Casa di Nonna Anna. C\'è sempre qualcosa di dolce da mangiare! 🍪',
    },
    {
      id: 'zia_debora',
      residentName: 'Zia Debora',
      houseType: 'house',
      color: 'orange',
      zone: 'center',
      houseObjectName: 'house_debora',
      spriteKey: 'debora',
      nearbyObjects: [
        { type: 'sign',   variant: 'shop', offsetTile: { x:  0, y: 2 } },
        { type: 'barrel', variant: 'wood', offsetTile: { x: -2, y: 1 } },
        { type: 'crate',  variant: 'wood', offsetTile: { x:  2, y: 1 } },
      ],
      npc: {
        personality: 'allegra e intraprendente, sempre con nuove idee per giocare e divertirsi',
        catchphrase: 'Affare fatto!',
        firstDialog: 'Benvenuta a casa di Zia Debora! Cosa posso fare per te? 🛍️',
      },
      welcomeMessage: 'Casa di Zia Debora. "Ehi Cece, giochiamo?"',
      pet: [{
        name: 'Blue',
        animal: 'cat',        // 'cat' | 'dog' | 'rabbit' | 'hamster'
        behavior: 'wander_near_home',
        spriteKey: 'blue',
      }],
    },
    {
      id: 'mamma_chiara',
      residentName: 'Mamma Chiara',
      houseType: 'house',
      color: 'white',
      zone: 'center',
      houseObjectName: 'house_cece',
      spriteKey: 'chiara',
      npc: {
        personality: 'allegra e spiritosa, sempre pronta a darti un abbraccio',
        catchphrase: 'Dai un bacino a mamma?',
        firstDialog: 'Bentornata Cece! Com\'è andato il giro?',
      },
      welcomeMessage: 'Casa di Cece e Mamma Chiara. Cecilia, vieni a dare un bacino a mamma! 😘',
      
    },
    {
      id: 'babbo_ale',
      residentName: 'Babbo Alessandro',
      houseType: 'house',
      color: 'gray',
      zone: 'center',
      houseObjectName: 'house_anna',
      spriteKey: 'ale',
      npc: {
        personality: 'allegro e caloroso, sempre pronto a dare un bacino a Cece',
        catchphrase: 'Dai un bacino a babbo?',
        firstDialog: 'Bentornata Cece! Com\'è andato il giro?',
      },
      welcomeMessage: 'Ciao Cece! Come stai? 😘',
      
    },
  ],

  nature: {
    trees:     { count: 35, variants: ['oak', 'pine', 'apple', 'cherry'] },
    flowers:   { count: 50, variants: ['red', 'yellow', 'pink', 'white', 'purple'] },
    rocks:     { count: 12 },
    mushrooms: { count: 8 },
    river: {
      enabled: true,
      direction: 'horizontal',  // 'horizontal'|'vertical'
      bridgeCount: 2,
    },
    beach: {
      enabled: true,
      side: 'south',
      shellCount: 15,
    },
  },

  paths: {
    style: 'cobblestone',  // 'cobblestone'|'dirt'|'stone'|'wood'
    autoConnect: true,     // genera percorsi tra tutte le case automaticamente
  },
}