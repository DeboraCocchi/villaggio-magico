/**
 * @file TouchControls.jsx
 * Controlli touch standard per tablet/telefono, sovrapposti al canvas:
 *
 *  - Pad circolare (basso a sinistra): movimento a 8 direzioni.
 *    Scrive i boolean su touchInput, letti dalle scene in update()
 *    accanto a cursors/wasd.
 *
 *  - Tasto A (basso a destra, primario): interagisci.
 *      • dialogo APERTO  → avanza/salta typewriter (equivale a Spazio:
 *        dispatcha un KeyboardEvent sintetico, DialogBox lo gestisce
 *        già senza modifiche)
 *      • dialogo CHIUSO  → touchInput.queueA(), consumato da
 *        NPCManager/InteriorScene come il tasto E
 *
 *  - Tasto B (secondario): annulla/chiudi (equivale a Escape).
 *
 * Il componente si monta solo su dispositivi touch: su desktop non
 * viene renderizzato nulla.
 *
 * @module TouchControls
 */

import React, { useCallback, useRef, useState } from 'react';
import { touchInput }     from '@game/utils/touchInput.js';
import { useDialogStore } from '@store/useDialogStore.js';
import './TouchControls.css';

/** Corsa massima della levetta dal centro, in px. */
const THUMB_TRAVEL_PX = 42;

/**
 * Rileva se il dispositivo supporta il touch.
 * @returns {boolean}
 */
function isTouchDevice() {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
}

/**
 * Dispatcha un KeyboardEvent sintetico su window, così i listener
 * React esistenti (DialogBox: Spazio/Escape) funzionano senza modifiche.
 *
 * @param {string} code - e.code da simulare (es. 'Space', 'Escape').
 * @returns {void}
 */
function dispatchSyntheticKey(code) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
}

/**
 * Controlli touch: pad circolare + tasti A/B.
 * @returns {JSX.Element|null}
 */
export default function TouchControls() {
  const [enabled] = useState(isTouchDevice);

  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const padRef = useRef(null);
  /** @type {React.MutableRefObject<HTMLDivElement|null>} */
  const thumbRef = useRef(null);
  /** ID del pointer che sta controllando il pad (multi-touch safe). */
  const padPointerId = useRef(null);

  // ── Pad: helpers ───────────────────────────────────────────────

  const resetPad = useCallback(() => {
    padPointerId.current = null;
    touchInput.setDirection(0, 0);
    if (thumbRef.current) {
      thumbRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, []);

  const updatePad = useCallback((clientX, clientY) => {
    const pad = padRef.current;
    if (!pad) return;

    const rect = pad.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);

    // Normalizza rispetto alla corsa massima, con clamp al bordo
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, THUMB_TRAVEL_PX);
    const nx = dist > 0 ? (dx / dist) * (clamped / THUMB_TRAVEL_PX) : 0;
    const ny = dist > 0 ? (dy / dist) * (clamped / THUMB_TRAVEL_PX) : 0;

    touchInput.setDirection(nx, ny);

    if (thumbRef.current) {
      const px = nx * THUMB_TRAVEL_PX;
      const py = ny * THUMB_TRAVEL_PX;
      thumbRef.current.style.transform =
        `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
    }
  }, []);

  // ── Pad: pointer events ────────────────────────────────────────

  const onPadPointerDown = useCallback((e) => {
    if (padPointerId.current !== null) return; // già controllato da un altro dito
    padPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePad(e.clientX, e.clientY);
  }, [updatePad]);

  const onPadPointerMove = useCallback((e) => {
    if (e.pointerId !== padPointerId.current) return;
    updatePad(e.clientX, e.clientY);
  }, [updatePad]);

  const onPadPointerUp = useCallback((e) => {
    if (e.pointerId !== padPointerId.current) return;
    resetPad();
  }, [resetPad]);

  // ── Tasti A / B ────────────────────────────────────────────────

  const onPressA = useCallback((e) => {
    e.preventDefault();
    if (useDialogStore.getState().isOpen) {
      // Dialogo aperto: A avanza (o salta il typewriter), come Spazio
      dispatchSyntheticKey('Space');
    } else {
      // Nessun dialogo: A = interagisci (tasto E), consumato dalla scena
      touchInput.queueA();
    }
  }, []);

  const onPressB = useCallback((e) => {
    e.preventDefault();
    // B = annulla/chiudi, come Escape (DialogBox lo gestisce già)
    dispatchSyntheticKey('Escape');
  }, []);

  // Cleanup su unmount: nessuna direzione "fantasma"
  React.useEffect(() => () => touchInput.reset(), []);

  if (!enabled) return null;

  return (
    <div className="touch-controls" aria-hidden="true">
      {/* Pad circolare di movimento */}
      <div
        ref={padRef}
        className="touch-pad"
        data-interactive
        onPointerDown={onPadPointerDown}
        onPointerMove={onPadPointerMove}
        onPointerUp={onPadPointerUp}
        onPointerCancel={onPadPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div ref={thumbRef} className="touch-pad-thumb" />
      </div>

      {/* Tasti azione A / B */}
      <div className="touch-buttons">
        <button
          type="button"
          className="touch-btn touch-btn-b"
          data-interactive
          onPointerDown={onPressB}
          onContextMenu={(e) => e.preventDefault()}
        >
          B
        </button>
        <button
          type="button"
          className="touch-btn touch-btn-a"
          data-interactive
          onPointerDown={onPressA}
          onContextMenu={(e) => e.preventDefault()}
        >
          A
        </button>
      </div>
    </div>
  );
}
