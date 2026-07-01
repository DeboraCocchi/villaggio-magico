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
      animal: 'dog',        // 'cat' | 'dog' | 'rabbit' | 'hamster'
      behavior: 'wander_near_home',
    },
  },

  // 6-10 abitanti — ognuno genera una casetta con nome sulla porta
  inhabitants: [
    {
      id: 'cecilia',
      residentName: 'Cecilia',
      houseType: 'player',    // 'player'|'elder'|'cozy'|'garden'|'shop'|'treehouse'
      color: 'pink',          // 'pink'|'blue'|'yellow'|'green'|'purple'|'orange'
      zone: 'center',         // 'center'|'north'|'south'|'east'|'west'|'forest'
      nearbyObjects: [
        { type: 'flower',  variant: 'red',    offsetTile: { x: -2, y: 0 } },
        { type: 'flower',  variant: 'yellow', offsetTile: { x: -1, y: 0 } },
        { type: 'mailbox', variant: 'pink',   offsetTile: { x:  2, y: 0 } },
      ],
      welcomeMessage: 'Bentornata a casa, Cecilia! 🏠 La tua stanza è in ordine.',
    },
    {
      id: 'daniele',
      residentName: 'Nonno Daniele',
      houseType: 'elder',
      color: 'blue',
      zone: 'north',
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
        },
        {
        name: 'Corrado',
        animal: 'cat',        // 'cat' | 'dog' | 'rabbit' | 'hamster'
        behavior: 'wander_near_home',
        }
        ]
    },
    {
      id: 'amichetta_giulia',
      residentName: 'Giulia',
      houseType: 'cozy',
      color: 'yellow',
      zone: 'east',
      nearbyObjects: [
        { type: 'flower', variant: 'pink',   offsetTile: { x: -1, y: 0 } },
        { type: 'flower', variant: 'purple', offsetTile: { x: -2, y: 0 } },
        { type: 'swing',  variant: 'wood',   offsetTile: { x:  3, y: 1 } },
      ],
      npc: {
        personality: 'allegra e birichina, ama i dolci e i giochi',
        catchphrase: 'Dai dai dai!',
        firstDialog: 'Sofia!! Finalmente! Stavo annoiandomi 😄 Giochiamo?',
      },
      welcomeMessage: 'Casa di Giulia. Si sentono risate da dentro.',
    },
    {
      id: 'amichetto_luca',
      residentName: 'Luca',
      houseType: 'treehouse',
      color: 'green',
      zone: 'forest',
      nearbyObjects: [
        { type: 'tree',   variant: 'oak',   offsetTile: { x: -3, y: -2 } },
        { type: 'tree',   variant: 'oak',   offsetTile: { x:  3, y: -1 } },
        { type: 'fossil', variant: 'stone', offsetTile: { x:  1, y:  2 } },
      ],
      npc: {
        personality: 'curioso, appassionato di natura e dinosauri',
        catchphrase: 'Lo sapevi che...?',
        firstDialog: 'Oh, Sofia! Guarda cosa ho trovato nel bosco! 🦕',
      },
      welcomeMessage: "La casa sull'albero di Luca. Scala di corda inclusa.",
    },
    {
      id: 'nonna_Anna',
      residentName: 'Nonna Anna',
      houseType: 'garden',
      color: 'purple',
      zone: 'south',
      nearbyObjects: [
        { type: 'flower', variant: 'red',    offsetTile: { x: -2, y: 1 } },
        { type: 'flower', variant: 'orange', offsetTile: { x: -1, y: 1 } },
        { type: 'flower', variant: 'pink',   offsetTile: { x:  0, y: 1 } },
        { type: 'flower', variant: 'yellow', offsetTile: { x:  1, y: 1 } },
      ],
      npc: {
        personality: 'dolcissima, conosce tutte le piante e prepara tisane magiche',
        catchphrase: 'Tesoro mio!',
        firstDialog: 'Amore! Ho fatto la crostata di marmellata! 🥧',
      },
      welcomeMessage: 'Casa della Nonna Anna. Il giardino è il più bello del villaggio.',
    },
    {
      id: 'negozio_tom',
      residentName: 'Tom il Mercante',
      houseType: 'shop',
      color: 'orange',
      zone: 'center',
      nearbyObjects: [
        { type: 'sign',   variant: 'shop', offsetTile: { x:  0, y: 2 } },
        { type: 'barrel', variant: 'wood', offsetTile: { x: -2, y: 1 } },
        { type: 'crate',  variant: 'wood', offsetTile: { x:  2, y: 1 } },
      ],
      npc: {
        personality: 'allegro commerciante, sempre con nuove offerte',
        catchphrase: 'Affare fatto!',
        firstDialog: 'Benvenuta nel negozio di Tom! Cosa posso fare per te? 🛍️',
      },
      welcomeMessage: 'Il negozio di Tom. "Tutto ciò che desideri!"',
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