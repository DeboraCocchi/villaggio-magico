/**
 * @file HUD.jsx
 * Heads-Up Display React sovrapposto al canvas Phaser.
 *
 * Mostra:
 *  - Nome giocatrice
 *  - Monete campana 🔔
 *  - Cuori amicizia ❤️
 *  - Ora e stagione di gioco
 *
 * Si aggiorna automaticamente quando Phaser emette gli eventi:
 *  - 'player:coinCollected'  → { total: number }
 *  - 'player:heartChanged'   → { total: number }
 *  - 'world:timeChanged'     → { time: string, season: string }
 *
 * @module HUD
 */

import React from 'react';
import { usePlayerStore }  from '@store/usePlayerStore.js';
import { usePhaserEvent }  from '../hooks/usePhaserEvent.js';

/** Mappa stagione → emoji */
const SEASON_EMOJI = {
  primavera: '🌸',
  estate:    '☀️',
  autunno:   '🍂',
  inverno:   '❄️',
};

/**
 * Componente HUD principale.
 * Posizionato in alto a sinistra, mostra le statistiche della giocatrice.
 *
 * @returns {JSX.Element}
 */
export default function HUD() {
  const { name, coins, hearts, currentTime, season, musicEnabled,
          setCoins, setHearts, setTime, setSeason, setMusicEnabled } = usePlayerStore();

  // ── Bridge: eventi Phaser → aggiornamento store ────────────────
  usePhaserEvent('player:coinCollected', ({ total }) => setCoins(total));
  usePhaserEvent('player:heartChanged',  ({ total }) => setHearts(total));
  usePhaserEvent('world:timeChanged',    ({ time, season: s }) => {
    setTime(time);
    if (s) setSeason(s);
  });

  const seasonEmoji = SEASON_EMOJI[season] ?? '🌸';

  return (
    <div style={styles.container}>
      {/* Nome giocatrice */}
      <div style={styles.nameRow}>
        <span style={styles.name}>{name}</span>
        <span style={styles.badge}>{seasonEmoji} {season}</span>
      </div>

      {/* Statistiche */}
      <div style={styles.statsRow}>
        {/* Monete */}
        <StatChip icon="🔔" value={coins} label="campane" />

        {/* Cuori */}
        <StatChip icon="❤️" value={hearts} label="cuori" />

        {/* Ora */}
        <StatChip icon="🕐" value={currentTime} label="" />

        {/* Musica toggle */}
        <button
          onClick={() => {
            setMusicEnabled(!musicEnabled);
            window.dispatchEvent(new CustomEvent('audio:toggleMusic', {
              detail: { enabled: !musicEnabled }
            }));
          }}
          style={{
            ...styles.chip,
            cursor: 'pointer',
            border: '1.5px solid ' + (musicEnabled ? '#f48fb1' : '#999'),
            opacity: musicEnabled ? 1 : 0.5,
            transition: 'all 200ms ease',
          }}
          aria-label={musicEnabled ? 'Disattiva musica' : 'Attiva musica'}
        >
          <span>{musicEnabled ? '🔊' : '🔇'}</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-componente
// ─────────────────────────────────────────────────────────────────

/**
 * Piccola chip con icona e valore per l'HUD.
 *
 * @param {Object} props
 * @param {string}        props.icon  - Emoji icona.
 * @param {string|number} props.value - Valore da mostrare.
 * @param {string}        props.label - Label accessibile (sr-only).
 * @returns {JSX.Element}
 */
function StatChip({ icon, value, label }) {
  return (
    <div style={styles.chip} aria-label={`${label}: ${value}`}>
      <span>{icon}</span>
      <span style={styles.chipValue}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stili inline (no CSS-in-JS necessario per questo progetto)
// ─────────────────────────────────────────────────────────────────

const styles = {
  container: {
    position:     'absolute',
    top:          12,
    left:         12,
    display:      'flex',
    flexDirection:'column',
    gap:          6,
    pointerEvents:'none',
  },
  nameRow: {
    display:       'flex',
    alignItems:    'center',
    gap:           8,
  },
  name: {
    background:   'rgba(252, 228, 236, 0.92)',
    color:        '#ad1457',
    fontFamily:   'Segoe UI, system-ui, sans-serif',
    fontWeight:   700,
    fontSize:     15,
    padding:      '3px 10px',
    borderRadius: 20,
    border:       '2px solid #f48fb1',
    backdropFilter: 'blur(4px)',
  },
  badge: {
    background:   'rgba(255,255,255,0.80)',
    color:        '#6d4c41',
    fontFamily:   'Segoe UI, system-ui, sans-serif',
    fontSize:     12,
    padding:      '2px 8px',
    borderRadius: 12,
    border:       '1px solid #ffcc80',
    textTransform:'capitalize',
  },
  statsRow: {
    display: 'flex',
    gap:     6,
  },
  chip: {
    display:       'flex',
    alignItems:    'center',
    gap:           4,
    background:    'rgba(255, 255, 255, 0.85)',
    borderRadius:  16,
    padding:       '3px 10px',
    border:        '1.5px solid #f48fb1',
    backdropFilter:'blur(4px)',
    fontSize:      13,
    fontFamily:    'Segoe UI, system-ui, sans-serif',
  },
  chipValue: {
    fontWeight: 700,
    color:      '#ad1457',
    minWidth:   22,
    textAlign:  'center',
  },
};
