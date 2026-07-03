// Simula: localStorage + flusso completo delle quest
globalThis.localStorage = (() => { const m = new Map(); return {
  getItem: k => m.get(k) ?? null, setItem: (k,v) => m.set(k,v), removeItem: k => m.delete(k),
};})();
globalThis.window = { localStorage: globalThis.localStorage, dispatchEvent: (e) => events.push(e), addEventListener(){}, removeEventListener(){}, setTimeout };
globalThis.CustomEvent = class { constructor(type, opts){ this.type = type; this.detail = opts?.detail; } };
const events = [];

const { useQuestStore } = await import('./bundle-quest.mjs');
const { usePlayerStore } = await import('./bundle-quest.mjs');

const q = () => useQuestStore.getState();
const p = () => usePlayerStore.getState();

// ── Test 1: q01 torta (collect 3 fruit → talk nonna) ──
console.assert(q().startQuest('q01_torta_nonna_anna') === true, 'start q01');
console.assert(q().startQuest('q01_torta_nonna_anna') === false, 'no doppio start');
q().recordCollect('fruit'); q().recordCollect('flower'); q().recordCollect('fruit');
console.assert(q().active['q01_torta_nonna_anna'].count === 2, 'count=2 (flower ignorato)');
q().recordCollect('fruit');
console.assert(q().active['q01_torta_nonna_anna'].stepIndex === 1, 'step avanzato a talk');
const res = q().recordTalk('nonna_anna');
console.assert(res.length === 1 && res[0].kind === 'completed', 'completata al talk');
console.assert(q().completed.includes('q01_torta_nonna_anna'), 'in completed');
console.assert(p().coins === 80, `coins=80, got ${p().coins}`);
console.assert(events.some(e => e.type === 'quest:completed'), 'evento toast emesso');

// ── Test 2: q05 giro dei saluti (3 talk in sequenza) ──
q().startQuest('q05_il_giro_dei_saluti');
console.assert(q().recordTalk('nonna_anna').length === 0, 'nonna NON è il primo step');
console.assert(q().recordTalk('nonno_daniele')[0].kind === 'advanced', 'step1 nonno');
console.assert(q().recordTalk('nonna_anna')[0].kind === 'advanced', 'step2 nonna');
console.assert(q().recordTalk('zia_debora')[0].kind === 'completed', 'step3 zia completa');
console.assert(p().coins === 80 + 150, `coins=230, got ${p().coins}`);

// ── Test 3: reward item (q04 conchiglie) ──
q().startQuest('q04_affare_delle_conchiglie');
for (let i = 0; i < 4; i++) q().recordCollect('shell');
q().recordTalk('zia_debora');
console.assert(q().items.includes('collana_di_conchiglie'), 'item collana ricevuto');

// ── Test 4: persistenza ──
const saved = JSON.parse(localStorage.getItem('villaggio-quests'));
console.assert(saved.state.completed.length === 3, 'stato persistito');

console.log('✅ Tutti i test passati — coins finali:', p().coins, '— items:', q().items);
