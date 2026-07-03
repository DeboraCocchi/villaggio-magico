/**
 * @file QuestPanel.jsx
 * Pannello missioni sovrapposto al canvas (alto a destra).
 *
 * Mostra:
 *  - la missione giornaliera di ItemManager (evento 'quest:dailyProgress');
 *  - le quest attive degli NPC (useQuestStore) con suggerimento e progresso;
 *  - un toast temporaneo al completamento (evento 'quest:completed').
 *
 * Montare in App.jsx dentro #ui-overlay, accanto a <HUD />.
 *
 * @module components/QuestPanel
 */

import React, { useState } from 'react';
import { useQuestStore }  from '@store/useQuestStore.js';
import { QUEST_BY_ID }    from '@data/quests.js';
import { usePhaserEvent } from '../hooks/usePhaserEvent.js';

/** Emoji per il tipo di collezionabile della missione del giorno. */
const TYPE_EMOJI = {
  flower:   '🌸',
  shell:    '🐚',
  fruit:    '🍎',
  mushroom: '🍄',
};

/** Nome italiano (plurale) del collezionabile. */
const TYPE_LABEL = {
  flower:   'fiori',
  shell:    'conchiglie',
  fruit:    'frutti',
  mushroom: 'funghetti',
};

/** Durata del toast di completamento (ms). */
const TOAST_DURATION = 4000;

/**
 * Pannello missioni.
 * @returns {JSX.Element}
 */
export default function QuestPanel() {
  // Quest attive: selettore sull'oggetto `active` → re-render a ogni progresso
  const active = useQuestStore((s) => s.active);
  const quests = Object.entries(active).map(([id, state]) => {
    const quest = QUEST_BY_ID.get(id);
    const step  = quest.steps[state.stepIndex];
    return {
      id,
      title:    quest.title,
      hint:     step.hint,
      progress: step.type === 'collect' ? `${state.count}/${step.amount ?? 1}` : null,
    };
  });

  /** Missione giornaliera (da ItemManager). */
  const [daily, setDaily] = useState(null);

  /** Toast di quest completata. */
  const [toast, setToast] = useState(null);

  usePhaserEvent('quest:dailyProgress', (data) => setDaily(data));

  usePhaserEvent('quest:completed', (data) => {
    setToast(data);
    window.setTimeout(() => setToast(null), TOAST_DURATION);
  });

  const showPanel = daily || quests.length > 0;

  return (
    <>
      {showPanel && (
        <div style={styles.container} aria-label="Missioni attive">
          <div style={styles.header}>📜 Missioni</div>

          {/* Missione del giorno (ItemManager) */}
          {daily && daily.type && (
            <div style={{ ...styles.quest, opacity: daily.complete ? 0.55 : 1 }}>
              <div style={styles.questTitle}>
                Missione del giorno {TYPE_EMOJI[daily.type] ?? ''}
              </div>
              <div style={styles.questHint}>
                Raccogli {daily.target} {TYPE_LABEL[daily.type] ?? daily.type}
              </div>
              <div style={styles.progress}>
                {daily.complete ? '✅ Completata!' : `${daily.collected}/${daily.target}`}
              </div>
            </div>
          )}

          {/* Quest degli NPC */}
          {quests.map((q) => (
            <div key={q.id} style={styles.quest}>
              <div style={styles.questTitle}>{q.title}</div>
              <div style={styles.questHint}>{q.hint}</div>
              {q.progress && <div style={styles.progress}>{q.progress}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Toast di completamento */}
      {toast && (
        <div style={styles.toast} role="status">
          <div style={styles.toastTitle}>🎉 {toast.title}</div>
          <div style={styles.toastReward}>
            +{toast.coins} 🔔{toast.item ? ` • hai ricevuto: ${toast.item.replaceAll('_', ' ')}!` : ''}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stili inline, coerenti con HUD.jsx (pastello, bordi rosa)
// ─────────────────────────────────────────────────────────────────

const styles = {
  container: {
    position:      'absolute',
    top:           12,
    right:         12,
    width:         210,
    display:       'flex',
    flexDirection: 'column',
    gap:           6,
    pointerEvents: 'none',
    fontFamily:    'Segoe UI, system-ui, sans-serif',
  },
  header: {
    alignSelf:    'flex-end',
    background:   'rgba(252, 228, 236, 0.92)',
    color:        '#ad1457',
    fontWeight:   700,
    fontSize:     13,
    padding:      '3px 10px',
    borderRadius: 20,
    border:       '2px solid #f48fb1',
    backdropFilter: 'blur(4px)',
  },
  quest: {
    background:   'rgba(255, 255, 255, 0.88)',
    border:       '1.5px solid #f48fb1',
    borderRadius: 12,
    padding:      '6px 10px',
    backdropFilter: 'blur(4px)',
  },
  questTitle: {
    fontWeight: 700,
    fontSize:   12,
    color:      '#ad1457',
  },
  questHint: {
    fontSize: 11,
    color:    '#6d4c41',
    marginTop: 2,
  },
  progress: {
    fontSize:   11,
    fontWeight: 700,
    color:      '#2e7d32',
    marginTop:  2,
  },
  toast: {
    position:     'absolute',
    top:          70,
    left:         '50%',
    transform:    'translateX(-50%)',
    background:   'rgba(255, 249, 196, 0.97)',
    border:       '2px solid #ffd54f',
    borderRadius: 14,
    padding:      '8px 18px',
    textAlign:    'center',
    fontFamily:   'Segoe UI, system-ui, sans-serif',
    pointerEvents:'none',
    boxShadow:    '0 4px 14px rgba(0,0,0,0.15)',
    animation:    'fadeIn 0.3s ease',
  },
  toastTitle: {
    fontWeight: 700,
    fontSize:   14,
    color:      '#6d4c41',
  },
  toastReward: {
    fontSize: 12,
    color:    '#8d6e63',
    marginTop: 2,
  },
};
