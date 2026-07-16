/**
 * @file MagazzinoPanel.jsx
 * Recap del magazzino: si apre quando il player si avvicina a un baule
 * del layer Tiled "magazzino" (proprietà magazzino=true) in house_cece.
 *
 * Lato Phaser: InteriorScene._setupMagazzino() emette
 *   'magazzino:open'  → apre il pannello
 *   'magazzino:close' → lo chiude (quando il player si allontana)
 *
 * Mostra:
 *  - totali storici raccolti per tipo (useMagazzinoStore);
 *  - oggetti speciali guadagnati dalle quest (useQuestStore.items);
 *  - quest completate e campane correnti (usePlayerStore.coins).
 *
 * Montare in App.jsx dentro #ui-overlay, accanto a <QuestPanel />.
 *
 * @module components/MagazzinoPanel
 */

import React, { useState } from 'react';
import { useMagazzinoStore } from '@store/useMagazzinoStore.js';
import { useQuestStore }     from '@store/useQuestStore.js';
import { usePlayerStore }    from '@store/usePlayerStore.js';
import { usePhaserEvent }    from '../hooks/usePhaserEvent.js';

/** Emoji per tipo (stesse di QuestPanel). */
const TYPE_EMOJI = {
  flower:   '🌸',
  shell:    '🐚',
  fruit:    '🍎',
  mushroom: '🍄',
};

/** Nome italiano (plurale) del collezionabile (stesse di QuestPanel). */
const TYPE_LABEL = {
  flower:   'fiori',
  shell:    'conchiglie',
  fruit:    'frutti',
  mushroom: 'funghetti',
};

/** Ordine di visualizzazione dei tipi. */
const TYPE_ORDER = ['flower', 'shell', 'fruit', 'mushroom'];

/**
 * Pannello recap magazzino.
 * @returns {JSX.Element|null}
 */
export default function MagazzinoPanel() {
  const [open, setOpen] = useState(false);

  const totals    = useMagazzinoStore((s) => s.totals);
  const items     = useQuestStore((s) => s.items);
  const completed = useQuestStore((s) => s.completed);
  const coins     = usePlayerStore((s) => s.coins);

  usePhaserEvent('magazzino:open',  () => setOpen(true));
  usePhaserEvent('magazzino:close', () => setOpen(false));

  if (!open) return null;

  const grandTotal = TYPE_ORDER.reduce((sum, t) => sum + (totals[t] ?? 0), 0);

  return (
    <div style={styles.backdrop} aria-label="Magazzino">
      <div style={styles.panel}>
        <div style={styles.header}>
          <span>📦 Magazzino di Cece</span>
          <button style={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Chiudi">
            ✕
          </button>
        </div>

        {/* Totali per tipo */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Tesori raccolti</div>
          {grandTotal === 0 ? (
            <div style={styles.empty}>Il magazzino è ancora vuoto... esplora il villaggio! 🌿</div>
          ) : (
            <div style={styles.grid}>
              {TYPE_ORDER.map((type) => (
                <div key={type} style={styles.cell}>
                  <span style={styles.cellEmoji}>{TYPE_EMOJI[type]}</span>
                  <span style={styles.cellCount}>{totals[type] ?? 0}</span>
                  <span style={styles.cellLabel}>{TYPE_LABEL[type]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Oggetti speciali delle quest */}
        {items.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Oggetti speciali</div>
            <div style={styles.itemList}>
              {items.map((item, i) => (
                <span key={`${item}-${i}`} style={styles.itemChip}>
                  ✨ {item.replaceAll('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Riepilogo */}
        <div style={styles.footer}>
          <span>🔔 {coins} campane</span>
          <span>📜 {completed.length} missioni completate</span>
          <span>🧺 {grandTotal} tesori in tutto</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stili inline, coerenti con QuestPanel.jsx / HUD.jsx (pastello, rosa)
// ─────────────────────────────────────────────────────────────────

const styles = {
  backdrop: {
    position:       'absolute',
    inset:          0,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'rgba(20, 10, 30, 0.35)',
    pointerEvents:  'auto',
    fontFamily:     'Segoe UI, system-ui, sans-serif',
    zIndex:         30,
  },
  panel: {
    width:         'min(360px, 86vw)',
    maxHeight:     '78vh',
    overflowY:     'auto',
    background:    'rgba(252, 228, 236, 0.97)',
    border:        '3px solid #f48fb1',
    borderRadius:  16,
    padding:       '12px 14px',
    boxShadow:     '0 8px 28px rgba(173, 20, 87, 0.35)',
    display:       'flex',
    flexDirection: 'column',
    gap:           10,
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    color:          '#ad1457',
    fontWeight:     700,
    fontSize:       17,
  },
  closeBtn: {
    border:       'none',
    background:   '#f48fb1',
    color:        '#fff',
    width:        28,
    height:       28,
    borderRadius: '50%',
    fontSize:     14,
    cursor:       'pointer',
    lineHeight:   1,
  },
  section: {
    background:   'rgba(255, 255, 255, 0.75)',
    borderRadius: 12,
    padding:      '8px 10px',
  },
  sectionTitle: {
    color:        '#c2185b',
    fontWeight:   700,
    fontSize:     13,
    marginBottom: 6,
  },
  empty: {
    color:     '#880e4f',
    fontSize:  13,
    fontStyle: 'italic',
  },
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap:                 6,
  },
  cell: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           2,
  },
  cellEmoji: { fontSize: 22 },
  cellCount: { color: '#ad1457', fontWeight: 700, fontSize: 15 },
  cellLabel: { color: '#880e4f', fontSize: 11 },
  itemList: {
    display:  'flex',
    flexWrap: 'wrap',
    gap:      6,
  },
  itemChip: {
    background:   '#f8bbd0',
    color:        '#880e4f',
    borderRadius: 12,
    padding:      '3px 9px',
    fontSize:     12,
    fontWeight:   600,
  },
  footer: {
    display:        'flex',
    justifyContent: 'space-between',
    flexWrap:       'wrap',
    gap:            6,
    color:          '#ad1457',
    fontSize:       12,
    fontWeight:     600,
    padding:        '2px 2px 0',
  },
};