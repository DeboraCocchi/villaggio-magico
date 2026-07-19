import React, { useEffect, useRef } from 'react';
import HUD       from '@components/HUD.jsx';
import DialogBox from '@components/DialogBox.jsx';
import QuestPanel from '@components/QuestPanel.jsx';
import MagazzinoPanel from '@components/MagazzinoPanel.jsx';
import TouchControls from '@components/TouchControls.jsx';

/**
 * Root dell'applicazione.
 *
 * Phaser viene istanziato UNA SOLA VOLTA grazie al ref + guard.
 * La lazy-load di Phaser (import dinamico) sposta il bundle pesante
 * fuori dal chunk React iniziale, velocizzando il primo paint.
 *
 * @returns {JSX.Element}
 */
export default function App() {
  /** @type {React.MutableRefObject<import('phaser').Game|null>} */
  const gameRef = useRef(null);

  useEffect(() => {
    // Guard: evita doppio mount (React StrictMode in dev)
    if (gameRef.current) return;

    // Lazy-load parallela di Phaser e della config
    // (config importa Phaser, quindi entrambi risolvono dallo stesso chunk)
    Promise.all([
      import('phaser'),
      import('@game/config.js'),
    ]).then(([{ default: Phaser }, { phaserConfig }]) => {
      // Secondo guard per race condition nel callback asincrono
      if (gameRef.current) return;
      gameRef.current = new Phaser.Game(phaserConfig);
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div id="app-wrapper">
      <div id="game-container" />
      <div id="ui-overlay">
        <HUD />
        <QuestPanel />
        <DialogBox />
        <MagazzinoPanel />
        <TouchControls />
      </div>
    </div>
  );
}
