/**
 * @file Toast.jsx
 * Notifica temporanea sovrapposta al canvas.
 *
 * Ascolta gli eventi Phaser:
 *  - 'item:limitReached' → mostra "Hai raggiunto il massimo di scorte per oggi!"
 *
 * Il toast scompare automaticamente dopo TOAST_DURATION ms.
 *
 * @module Toast
 */

import React, { useState, useEffect, useRef } from 'react';
import { usePhaserEvent } from '../hooks/usePhaserEvent.js';

const TOAST_DURATION = 3000;

/**
 * @returns {JSX.Element|null}
 */
export default function Toast() {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  const show = (msg) => {
    setMessage(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), TOAST_DURATION);
  };

  usePhaserEvent('item:limitReached', () => {
    show('Hai raggiunto il massimo di scorte per questa categoria per oggi!');
  });

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!message) return null;

  return (
    <div style={styles.container}>
      <span style={styles.text}>{message}</span>
    </div>
  );
}

const styles = {
  container: {
    position:        'fixed',
    bottom:          '80px',
    left:            '50%',
    transform:       'translateX(-50%)',
    backgroundColor: 'rgba(74, 55, 40, 0.92)',
    color:           '#fff8ec',
    borderRadius:    '12px',
    padding:         '10px 20px',
    fontSize:        '13px',
    fontFamily:      'Segoe UI, system-ui, sans-serif',
    pointerEvents:   'none',
    zIndex:          1000,
    textAlign:       'center',
    maxWidth:        '80vw',
    boxShadow:       '0 2px 8px rgba(0,0,0,0.4)',
  },
  text: {
    display: 'block',
  },
};
