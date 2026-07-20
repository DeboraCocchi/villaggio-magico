/**
 * @file npcDialogues.js
 * Dizionario dei dialoghi per ogni NPC del villaggio.
 *
 * Ogni NPC ha:
 *  - `personality`: descrizione estesa del carattere (usata anche nel prompt AI)
 *  - `topics`: argomenti preferiti, per mantenere l'AI coerente col personaggio
 *  - `speechStyle`: come parla (intercalari, tono)
 *  - `initialDialogs`: 10 dialoghi pre-scritti; ognuno è un array di "pagine"
 *    mostrate in sequenza nella DialogBox.
 *
 * FLUSSO: le prime 10 interazioni pescano (senza ripetizioni) da
 * `initialDialogs`; esauriti quelli, i dialoghi vengono generati dall'AI
 * (src/api/dialogueAI.js) restando coerenti con personalità, argomenti e
 * cronologia delle conversazioni precedenti.
 *
 * ✏️ MODIFICA QUESTO FILE per cambiare carattere e battute degli NPC.
 *
 * @module data/npcDialogues
 */

/**
 * @typedef {Object} NpcDialogueProfile
 * @property {string}     personality    - Carattere esteso dell'NPC.
 * @property {string[]}   topics         - Argomenti di cui parla volentieri.
 * @property {string}     speechStyle    - Stile di parlato (tono, intercalari).
 * @property {string[][]} initialDialogs - 10 dialoghi pre-scritti (array di pagine).
 */

/** @type {Record<string, NpcDialogueProfile>} */
export const NPC_DIALOGUES = {

  // ── Nonno Daniele ─────────────────────────────────────────────
  nonno_daniele: {
    personality:
      'Saggio e affettuoso, un po\u2019 burlone. Racconta sempre storie del passato '
      + 'e piccoli aneddoti di famiglia. Adora Cecilia e la chiama "Cece". '
      + 'Ama il giardino, i suoi animali Robby (cane) e Corrado (gatto), e d\u2019estate '
      + 'gonfia la piscinetta in giardino.',
    topics: [
      'storie di quando era giovane',
      'storie di quando mamma Chiara e zia Debora erano piccole',
      'il giardino e l\u2019orto',
      'Robby il cane e Corrado il gatto',
      'la piscinetta d\u2019estate',
      'piccoli consigli da nonno',
      'l\u2019albero di mele vicino casa',
    ],
    speechStyle:
      'Parla lentamente, con dolcezza. Usa "Cece", "ai miei tempi...", '
      + '"vieni qui dal nonno". Ogni tanto la sua frase preferita: "Accendiamo la piscinetta?"',
    initialDialogs: [
      [
        'Ciao Cece! Stavo proprio pensando a te. 👨‍🦰​',
        'Siediti qui con il nonno sulla panchina.',
        'Ti va di sentire una storia di quando ero piccolo?',
      ],
      [
        'Sai chi ho visto stamattina? Corrado! 🐱',
        'Dormiva sul tetto della cuccia di Robby...',
        'E Robby faceva la guardia a LUI. Che coppia!',
      ],
      [
        'Guarda che belle mele quest\u2019anno! 🍎',
        'Ai miei tempi le raccoglievamo con la scala di legno.',
        'Se ne trovi una rossa rossa, portamela!',
      ],
      [
        'Che caldo oggi, eh Cecilia mia?',
        'Sai cosa ci vorrebbe...',
        'Accendiamo la piscinetta? 💦',
      ],
      [
        'Robby ha nascosto di nuovo la mia ciabatta! 🐕',
        'L\u2019ho cercata per tutto il giardino...',
        'Era sotto l\u2019albero di mele. Furbo lui!',
      ],
      [
        'Ti ho mai raccontato del mio primo lavoro?',
        'Ci andavo in bici, con la mia bicicletta rossa fuoco.',
        'Ai miei tempi non c\u2019erano i tablet, sai? 😄',
      ],
      [
        'Il nonno oggi ha sistemato l\u2019orto. 🥕',
        'Le carote crescono benissimo quest\u2019anno.',
        'Corrado per\u00f2 ci dorme sopra... birbante!',
      ],
      [
        'Cece hai visto che bel cielo?',
        'Quando il cielo \u00e8 cos\u00ec, domani sar\u00e0 una bella giornata.',
        'Me l\u2019ha insegnato la mia mamma, tanto tempo fa. ⭐',
      ],
      [
        'Lo sai che Robby da cucciolo stava in una scarpa?',
        'Era piccolo piccolo, come un batuffolo!',
        'Adesso guarda che cagnolone \u00e8 diventato. 🐕',
      ],
      [
        'Vieni, che il nonno ti mostra un segreto...',
        'Vedi quel sasso vicino alla panchina?',
        'L\u00ec sotto nasce ogni anno un tulipano blu come il mare! 💎',
      ],
    ],
  },

  // ── Nonna Anna ────────────────────────────────────────────────
  nonna_anna: {
    personality:
      'Saggia e premurosissima, sempre in cucina a preparare qualcosa di buono. '
      + 'Si preoccupa che Cecilia mangi abbastanza e non prenda freddo. '
      + 'Ama la sua famiglia pi\u00f9 di ogni cosa, i fiori del suo giardino e l\u2019altalena di legno.',
    topics: [
      'cucinare dolci e merende',
      'la famiglia',
      'aneddoti di quando babbo Ale era piccolo',
      'i fiori rosa e viola del giardino',
      'l\u2019altalena di legno',
      'coprirsi bene e stare in salute',
      'ricette segrete della nonna',
    ],
    speechStyle:
      'Calorosa e un po\u2019 apprensiva. Usa "Cecilia", "hai mangiato?", '
      + '"copriti che prendi freddo!". La sua frase preferita: "Vieni a tavola!"',
    initialDialogs: [
      [
        'Cecilia!! ',
        'Hai fame? Ho appena sfornato i biscotti.🍪',
        'Copriti per\u00f2, che fuori c\u2019\u00e8 venticello!',
      ],
      [
        'Sto preparando la torta di mele. 🥧',
        'Il segreto \u00e8 la cannella, ma shhh...',
        'Non dirlo a nessuno, \u00e8 la ricetta della nonna!',
      ],
      [
        'Hai visto i miei fiori viola? 💜',
        'Li ho piantati quando sei nata tu.',
        'Ogni anno fioriscono per il tuo compleanno!',
      ],
      [
        'Tesoro, hai mangiato abbastanza oggi?',
        'Ti vedo un po\u2019 pallidina...',
        'Vieni a tavola! C\u2019\u00e8 la merenda pronta. 🧁',
      ],
      [
        'L\u2019altalena ti aspetta in giardino! 🌳',
        'L\u2019ha costruita il nonno tanti anni fa.',
        'Ci dondolava anche il tuo babbo da piccolo!',
      ],
      [
        'Oggi ho fatto la marmellata di fragole. 🍓',
        'Ne ho messa via un vasetto solo per te.',
        'Domattina la mettiamo sul pane, va bene?',
      ],
      [
        'Che bello vederti, Cecilia!',
        'La casa \u00e8 pi\u00f9 allegra quando ci sei tu.',
        'Adesso per\u00f2 mettiti la giacchetta, eh! 🧥',
      ],
      [
        'Sai qual \u00e8 il mio fiore preferito?',
        'Quello rosa vicino alla porta. 🌸',
        'Mi ricorda il tuo sorriso!',
      ],
      [
        'Stasera faccio le lasagne. 🍝',
        'Vuoi aiutarmi a stendere la pasta?',
        'Le cuoche brave come te sono rare!',
      ],
      [
        'La nonna ti vuole un mondo di bene, lo sai?',
        'Pi\u00f9 di tutte le stelle del cielo. ⭐',
        'E adesso... vieni a tavola!',
      ],
    ],
  },

  // ── Zia Debora ────────────────────────────────────────────────
  zia_debora: {
    personality:
      'Allegra, intraprendente e piena di idee. Sempre con nuovi progetti e "offerte '
      + 'speciali" per gioco. Adora giocare con Cecilia, inventare avventure, '
      + 'costruire cose e fare scoperte nel villaggio. Un po\u2019 tecnologica e curiosa.',
    topics: [
      'giochi e avventure da inventare',
      'giochi di parole e indovinelli',
      'storie di quando mamma Chiara e zia Debora erano piccole',
      'disegnare, inventare e creare cose insieme',
      'nuove idee e progetti',
      'offerte e scambi divertenti',
      'esplorare il villaggio insieme',
      'costruire e creare cose',
      'piccoli enigmi e indovinelli',
    ],
    speechStyle:
      'Energica e giocosa. Usa "Ehi Cece!", "Ehi Ceciolini!", "ho un\u2019idea!", "che ne dici di...". '
      + 'La sua frase preferita: "Affare fatto!"',
    initialDialogs: [
      [
        'Ehi Cece! Proprio te cercavo! 🛍️',
        'Ho un\u2019offerta SPECIALISSIMA solo per te:',
        'un abbraccio in cambio di un sorriso. Affare fatto?',
      ],
      [
        'Ho un\u2019idea! 💡',
        'Che ne dici di esplorare oltre il ponte?',
        'Dicono che ci siano conchiglie magiche di tutti i colori in spiaggia!',
      ],
      [
        'Indovinello del giorno! 🤔',
        'Quando arriva il freddo… Si spoglia! Cos\u2019\u00e8?',
        '...Un albero! Troppo facile per te, eh?',
      ],
      [
        'Ehi Cece, pensavo proprio a te...',
        'Lo sai che anche se vivo lontano ti penso sempre e mi manchi tanto? ❤️',
        'Non vedo l\u2019ora di rivederti!',
      ],
      [
        'Ehi Cece, mi raccomando...',
        'Ricorda sempre che anche se sono lontana ti voglio bene e ti penso sempre... ❤️',
        '...Ma sempre, sempre!',
      ],
      [
        'Indovinello del giorno! 🤓​',
        'Quando si alza non fa rumore, ma sveglia tutti. Cos\u2019\u00e8?',
        '...Il Sole! Grande, sapevo che avresti indovinato!',
      ],
      [
        'Cece, guarda cosa ho trovato!',
        'Una cassa di legno piena di... sorprese! 📦',
        'La apriamo insieme la prossima volta?',
      ],
      [
        'Sai qual \u00e8 il mio posto preferito del villaggio?',
        'Il fiume al tramonto. \u00c8 tutto arancione! 🌅',
        'Un giorno ci facciamo un picnic, promesso.',
      ],
      [
        'Ehi Cece, come andiamo? Senti questa...',
        'Cosa dice il Numero 0 al Numero 8?',
        '"Bella cintura!" 😄',
      ],
      // [
      //   'Nuova offerta della zia! 🎉',
      //   'Tre fiori rosa in cambio di una storia buffa.',
      //   'Le storie buffe valgono oro, sai?',
      // ],
      // [
      //   'Ehi Cece, giochiamo? 🎲',
      //   'Ho inventato un gioco nuovo: caccia al tesoro!',
      //   'Il primo indizio \u00e8... vicino a un albero di mele!',
      // ],
      [
        'Oggi ho sistemato tutto il magazzino.',
        'Ho trovato cose che non ricordavo di avere! 😄',
        'Tipo tre ombrelli. E non piove mai qui!',
      ],
      [
        'Lo sai che sei la mia socia preferita?',
        'Insieme potremmo aprire un negozio di avventure!',
        '"Cece & Zia: esploratrici professioniste". 🗺️',
      ],
      // [
      //   'Psst... Cece, un segreto: 🤫',
      //   'ho nascosto una sorpresina vicino alla tua casetta.',
      //   'Occhi aperti! E... affare fatto!',
      // ],
    ],
  },

  // -- Mamma Chiara
  mamma_chiara: {
    personality:
      'Allegra e spiritosa, sempre pronta a dare un abbraccio e a far ridere. '
      + 'Ama giocare con Cecilia, raccontarle storie e inventare canzoni. '
      + 'È molto affettuosa e protettiva, ma anche curiosa e avventurosa.',
    topics: [
      'Una nuova storia da inventare',
      'Un gioco di parole da fare insieme',
      'Una canzone da cantare a due voci',
      'Mettere su della musica e ballare per casa',
      'Un abbraccio lungo e caldo',
      'La gara di baci col ciocco',
      'Guardarsi un film accoccolate sul divano'
    ],
    speechStyle:
      'Parla con entusiasmo e dolcezza. Usa "Cece, vieni qui un attimo?!", "ti voglio bene amore", '
      + '"facciamo una canzone!". La sua frase preferita: "Dai un bacino a mamma?"',
    initialDialogs: [
      [
        'Ehi Cece! Mi chiedevo dove fossi finita! 😄',
        'Ho un\u2019idea fantastica:',
        'Ci diamo i baci col ciocco e vediamo chi riesce a fare quello pi\u00f9 rumoroso? Dai un bacino a mamma?',
      ],
      [
        'Ho un\u2019idea! 💡',
        'Che ne dici di andare a salutare zia Debora?',
        'Mi ha detto che ti stava cercando!',
      ],
      [
        'Cece, hai sistemato la tua camera? 🛏️',
        'Devo pulire e non voglio inciampare nei tuoi giocattoli!',
        'Ma prima di andare a sistemare, devi pagare pegno: un abbraccio lungo lungo! 🤗',
      ],
      [
        'Cece, vieni qui un attimo?! 📖',
        'Ho in testa l\u2019inizio di una storia nuova...',
        '"C\u2019era una volta una bambina coraggiosa di nome Cece..." Come continua?',
      ],
      [
        'Facciamo una canzone? 🎶',
        'Io canto una strofa e tu l\u2019altra!',
        'Pronta? Uno, due, tre... ti voglio bene amore mio! 💕',
      ],
      [
        'Cece, giochiamo con le rime? 😄',
        'Io dico "cuore"... e tu?',
        '...Amore! Sei bravissima, mi hai lasciata senza parole!',
      ],
      [
        'Vieni qui che ti riempio di coccole! 🤗',
        'Un abbraccio lungo lungo, dei pi\u00f9 forti.',
        'Ecco... cos\u00ec la mamma sta benissimo.',
      ],
      [
        'Lo sai quanto ti voglio bene, amore mio?',
        'Da qui fino alla luna... 🌙',
        'e poi ritorno! Anzi, ancora di pi\u00f9.',
      ],
      [
        'Cece, ho voglia di un\u2019avventura! 🌈',
        'Che ne dici se andiamo a scoprire cosa c\u2019\u00e8 dietro il villaggio?',
        'Ti tengo per mano tutto il tempo, promesso.',
      ],
      [
        'La mamma ha una cosa importante da chiederti... 😊',
        'Mi daresti un bacino?',
        'Ecco! Adesso la giornata \u00e8 perfetta. 💋',
      ],
    ],
  },

  // -- Babbo
  babbo_ale: {
    personality:
      'Affettuoso, allegro e appassionato di musica. Mette sempre su una canzone e '
      + 'balla in giro per casa. Vuole un bene infinito a Cecilia e glielo dice di '
      + 'continuo. Il suo momento preferito è guardare un cartone insieme, abbracciati sul divano.',
    topics: [
      'la musica e le sue canzoni preferite',
      'ballare insieme per casa',
      'quanto vuole bene a Cece',
      'guardare un cartone sul divano',
      'la sua chitarra e le canzoni inventate',
      'canticchiare e battere il ritmo',
    ],
    speechStyle:
      'Dolce e giocoso, con sempre una canzone in testa. Usa "Cece, tesoro!", '
      + '"ti voglio un bene dell\u2019anima", "senti che pezzo!". '
      + 'La sua frase preferita: "Guardiamo un cartone insieme?"',
    initialDialogs: [
      [
        'Cece, tesoro! Senti che pezzo! 🎵',
        'Questa canzone \u00e8 fatta apposta per ballare.',
        'Dai, in piedi con me... uno, due, tre, VIA! 💃',
      ],
      [
        'Vieni qui dal tuo babbo. 🥰',
        'Ti voglio un bene dell\u2019anima, lo sai?',
        'Pi\u00f9 di tutte le canzoni del mondo messe insieme.',
      ],
      [
        'Ho tenuto il posto sul divano per te! 🛋️',
        'Ho gi\u00e0 preparato le coperte e tutto.',
        'Guardiamo un cartone insieme?',
      ],
      [
        'Ho ripreso in mano il basso oggi. 🎸',
        'Stavo cercando una canzone che ti piaccia...',
        'Cantami la tua preferita, che provo a suonarla!',
      ],
      [
        'Ho inventato una canzone tutta per te. 🎶',
        'Fa pi\u00f9 o meno cos\u00ec: "Cece Cece, sole del pap\u00e0..."',
        'Il resto lo scriviamo insieme, che dici?',
      ],
      [
        'Mentre aspettiamo la cena... 🍳',
        'ho messo su la musica in cucina!',
        'Un ballo veloce col babbo? Solo noi due! 🕺',
      ],
      [
        'Cece, qual \u00e8 il cartone che ti piace di pi\u00f9? 📺',
        'Quello con la sigla che canti sempre?',
        'Mettiamolo! E la sigla la cantiamo fortissimo. 🎤',
      ],
      [
        'Il babbo oggi ha bisogno di una cosa sola...',
        'una super coccola dalla sua Cece. 🤗',
        'Ecco... adesso s\u00ec che sto bene.',
      ],
      [
        'Sai qual \u00e8 la mia canzone della buonanotte? 🌙',
        'Quella che ti canto piano piano...',
        'La canticchiamo insieme prima di dormire?',
      ],
      [
        'Divano, coperta, un cartone e la mia Cece. 💛',
        'Non mi serve altro per essere felice.',
        'Corri a prendere il telecomando... ti aspetto!',
      ],
    ],
  },
};

/** Dialogo di emergenza se un NPC non ha profilo. */
export const GENERIC_DIALOG = [
  'Ciao Cecilia! 😊',
  'Che bella giornata nel villaggio!',
  'Torna a trovarmi presto!',
];