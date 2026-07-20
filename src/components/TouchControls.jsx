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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { touchInput }     from '@game/utils/touchInput.js';
import { useDialogStore } from '@store/useDialogStore.js';
import './TouchControls.css';

/**
 * Rileva se il dispositivo supporta il touch.
 *
 * Tre vie:
 *  1. API touch presenti (ontouchstart / maxTouchPoints)
 *  2. Media query '(any-pointer: coarse)' — copre l'emulazione DevTools
 *  3. Override manuale '?touch=1' nell'URL, per debug da desktop
 *
 * Nota: con la device toolbar dei DevTools, maxTouchPoints si aggiorna
 * solo dopo un reload; per questo il componente ascolta anche il primo
 * evento 'touchstart' reale (vedi useEffect) e si attiva al volo.
 *
 * @returns {boolean}
 */
function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('touch')) return true;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(any-pointer: coarse)').matches
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
  const [enabled, setEnabled] = useState(isTouchDevice);

  // Fallback: se il check iniziale è false ma arriva un tocco reale
  // (es. emulazione attivata a pagina già caricata, o detection
  // fallita su qualche browser), attiva i controlli al primo touch.
  useEffect(() => {
    if (enabled) return;
    const onFirstTouch = () => setEnabled(true);
    window.addEventListener('touchstart', onFirstTouch, { once: true, passive: true });
    return () => window.removeEventListener('touchstart', onFirstTouch);
  }, [enabled]);

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
    const thumb = thumbRef.current;
    if (!pad) return;

    const rect = pad.getBoundingClientRect();
    // Corsa massima della levetta dal centro, in px: raggio del pad meno
    // raggio della levetta, così si adatta alla dimensione renderizzata
    // (segue la media query in TouchControls.css invece di una costante).
    const thumbRadius = thumb ? thumb.getBoundingClientRect().width / 2 : 0;
    const travel = rect.width / 2 - thumbRadius;

    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);

    // Normalizza rispetto alla corsa massima, con clamp al bordo
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, travel);
    const nx = dist > 0 ? (dx / dist) * (clamped / travel) : 0;
    const ny = dist > 0 ? (dy / dist) * (clamped / travel) : 0;

    touchInput.setDirection(nx, ny);

    if (thumb) {
      const px = nx * travel;
      const py = ny * travel;
      thumb.style.transform =
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
    if (useDialogStore.getState().isOpen) {
      // Dialogo aperto: B = annulla/chiudi, come Escape
      dispatchSyntheticKey('Escape');
    } else {
      // Nessun dialogo: B = raccogli oggetto vicino
      touchInput.queueB();
    }
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
