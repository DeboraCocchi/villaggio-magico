/**
 * @file DialogBox.jsx
 * Finestra di dialogo NPC sovrapposta al canvas Phaser.
 *
 * Caratteristiche:
 *  - Si apre quando Phaser emette 'dialog:open' con { npcKey, messages }
 *  - Avanza con click/tap o tasto Spazio/Invio
 *  - Chiude automaticamente all'ultima riga o con Escape
 *  - Animazione testo typewriter (lettera per lettera)
 *
 * Phaser emette l'evento 'dialog:close' quando il dialogo è chiuso
 * (per sbloccare il movimento del giocatore).
 *
 * @module DialogBox
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDialogStore }  from '@store/useDialogStore.js';
import { usePhaserEvent }  from '../hooks/usePhaserEvent.js';

/** Velocità typewriter in ms per carattere */
const TYPEWRITER_SPEED_MS = 28;

/** Mappa npcKey → emoji avatar */
const NPC_AVATARS = {
  bunny: '🐰',
  fox:   '🦊',
  bear:  '🐻',
  cat:   '🐱',
  duck:  '🐥',
  // NPC umani (villageConfig.js inhabitants)
  daniele:          '👴',
  amichetta_giulia: '😄',
  negozio_tom:      '🛍️',
};

/** Mappa npcKey → colore accent */
const NPC_COLORS = {
  bunny: '#f06292',
  fox:   '#ff7043',
  bear:  '#8d6e63',
  cat:   '#ab47bc',
  duck:  '#ffd54f',
  // NPC umani (villageConfig.js inhabitants)
  daniele:          '#64b5f6',
  amichetta_giulia: '#ffd54f',
  negozio_tom:      '#ffb74d',
};

/**
 * Componente DialogBox.
 * Legge lo stato da useDialogStore e si aggiorna automaticamente.
 *
 * @returns {JSX.Element|null}
 */
export default function DialogBox() {
  const { isOpen, npcKey, npcName, text, advance, close } = useDialogStore();

  /** Testo visualizzato parzialmente dall'effetto typewriter */
  const [displayedText, setDisplayedText] = useState('');
  /** true se il typewriter ha finito → permette di avanzare */
  const [isComplete, setIsComplete]       = useState(false);

  const typewriterRef = useRef(null);

  // ── Bridge: apre il dialogo da Phaser ─────────────────────────
  usePhaserEvent('dialog:open', ({ npcKey: key, messages, npcName: name }) => {
    useDialogStore.getState().open(key, messages, name);
  });

  // ── Effetto typewriter ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !text) {
      setDisplayedText('');
      setIsComplete(false);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);

    let i = 0;
    typewriterRef.current = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typewriterRef.current);
        setIsComplete(true);
      }
    }, TYPEWRITER_SPEED_MS);

    return () => clearInterval(typewriterRef.current);
  }, [isOpen, text]);

  // ── Avanza o salta il typewriter ───────────────────────────────
  const handleAdvance = useCallback(() => {
    if (!isComplete) {
      // Salta typewriter: mostra tutto il testo subito
      clearInterval(typewriterRef.current);
      setDisplayedText(text);
      setIsComplete(true);
    } else {
      advance();
      // Notifica Phaser se il dialogo è ora chiuso
      if (!useDialogStore.getState().isOpen) {
        window.dispatchEvent(new CustomEvent('dialog:close'));
      }
    }
  }, [isComplete, text, advance]);

  // ── Chiude con Escape ──────────────────────────────────────────
  const handleClose = useCallback(() => {
    close();
    window.dispatchEvent(new CustomEvent('dialog:close'));
  }, [close]);

  // ── Tastiera ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    function onKey(e) {
      if (e.code === 'Space' || e.code === 'Enter')  handleAdvance();
      if (e.code === 'Escape')                        handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleAdvance, handleClose]);

  if (!isOpen) return null;

  const avatar      = NPC_AVATARS[npcKey] ?? '💬';
  const accentColor = NPC_COLORS[npcKey]  ?? '#f48fb1';

  return (
    <div style={styles.overlay}>
      <div
        style={{ ...styles.box, borderColor: accentColor }}
        role="dialog"
        aria-live="polite"
        aria-label="Dialogo con NPC"
        data-interactive
      >
        {/* Header: avatar + nome NPC */}
        <div style={{ ...styles.header, background: accentColor }}>
          <span style={styles.avatar}>{avatar}</span>
          <span style={styles.npcName}>{npcName || npcKey}</span>
          <button
            style={styles.closeBtn}
            onClick={handleClose}
            aria-label="Chiudi dialogo"
          >
            ✕
          </button>
        </div>

        {/* Testo dialogo */}
        <div style={styles.textArea}>
          <p style={styles.dialogText}>
            {displayedText}
            {!isComplete && <span style={styles.cursor}>▌</span>}
          </p>
        </div>

        {/* Footer: istruzione avanza */}
        <div style={styles.footer} onClick={handleAdvance}>
          {isComplete
            ? <span style={styles.hint}>Clicca o premi Spazio per continuare ▶</span>
            : <span style={styles.hint}>...</span>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stili
// ─────────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position:       'absolute',
    bottom:         24,
    left:           '50%',
    transform:      'translateX(-50%)',
    width:          'min(560px, 90vw)',
    pointerEvents:  'auto',
    zIndex:         20,
  },
  box: {
    background:     'rgba(255, 252, 248, 0.97)',
    borderRadius:   16,
    border:         '3px solid',
    boxShadow:      '0 8px 32px rgba(0,0,0,0.18)',
    overflow:       'hidden',
    fontFamily:     'Segoe UI, system-ui, sans-serif',
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    gap:            8,
    padding:        '6px 12px',
  },
  avatar: {
    fontSize:       22,
  },
  npcName: {
    flex:           1,
    fontWeight:     700,
    fontSize:       14,
    color:          '#fff',
    textTransform:  'capitalize',
  },
  closeBtn: {
    background:     'transparent',
    border:         'none',
    color:          'rgba(255,255,255,0.8)',
    fontSize:       14,
    cursor:         'pointer',
    lineHeight:     1,
    padding:        '2px 4px',
  },
  textArea: {
    padding:        '14px 16px 8px',
    minHeight:      64,
  },
  dialogText: {
    fontSize:       15,
    lineHeight:     1.6,
    color:          '#4a3728',
    margin:         0,
  },
  cursor: {
    animation:      'blink 1s step-end infinite',
    marginLeft:     1,
  },
  footer: {
    padding:        '6px 16px 10px',
    textAlign:      'right',
    cursor:         'pointer',
  },
  hint: {
    fontSize:       12,
    color:          '#aaa',
    userSelect:     'none',
  },
};
