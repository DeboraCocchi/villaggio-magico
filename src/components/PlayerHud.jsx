/**
 * @file PlayerHud.jsx
 * HUD della giocatrice.
 *
 * Due elementi ancorati agli angoli alti:
 *  - a sinistra il pannello giocatrice: header sempre visibile
 *    (avatar + nome + stagione) con un chevron che apre/chiude il corpo
 *    (campanella, cuori, orario);
 *  - a destra le missioni, collassate nel bottone "Missioni": un tocco
 *    espande il QuestPanel in un popover, un altro lo richiude.
 *
 * Il controllo audio è indipendente e resta sempre visibile.
 *
 * @module PlayerHud
 */

import { useState } from 'react';
import { usePlayerStore, PANEL } from '@/store/usePlayerStore';
import { useQuestStore } from '@/store/useQuestStore';
import QuestPanel from './QuestPanel';
import './PlayerHud.css';

/** @type {Record<string, { emoji: string, label: string }>} */
const SEASON_BADGE = {
  primavera: { emoji: '🌸', label: 'Primavera' },
  estate:    { emoji: '☀️', label: 'Estate' },
  autunno:   { emoji: '🍂', label: 'Autunno' },
  inverno:   { emoji: '❄️', label: 'Inverno' },
};

/**
 * Icona altoparlante, con onde variabili in base al volume.
 * @param {{ muted: boolean, volume: number }} props
 */
function SpeakerIcon({ muted, volume }) {
  return (
    <svg viewBox="0 0 24 24" className="hud-speaker" aria-hidden="true">
      <path
        d="M4 9.5h3.2L12 5.2v13.6L7.2 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"
        fill="currentColor"
      />
      {muted ? (
        <path d="M16 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" fill="none" />
      ) : (
        <>
          <path d="M15.4 9.4a3.6 3.6 0 0 1 0 5.2" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" fill="none" />
          {volume > 0.55 && (
            <path d="M18.1 7.2a7.2 7.2 0 0 1 0 9.6" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />
          )}
        </>
      )}
    </svg>
  );
}

/**
 * Chevron che ruota di 180° quando l'elemento associato è aperto.
 * @param {{ open: boolean }} props
 */
function Chevron({ open }) {
  return (
    <svg viewBox="0 0 24 24" className={`hud-chevron ${open ? 'is-open' : ''}`} aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * HUD principale.
 * @returns {JSX.Element}
 */
export default function PlayerHud() {
  const name         = usePlayerStore((s) => s.name);
  const coins        = usePlayerStore((s) => s.coins);
  const hearts       = usePlayerStore((s) => s.hearts);
  const currentTime  = usePlayerStore((s) => s.currentTime);
  const season       = usePlayerStore((s) => s.season);
  const musicEnabled = usePlayerStore((s) => s.musicEnabled);
  const volume       = usePlayerStore((s) => s.volume);
  const openPanel    = usePlayerStore((s) => s.openPanel);
  const togglePanel  = usePlayerStore((s) => s.togglePanel);
  const closePanel   = usePlayerStore((s) => s.closePanel);

  // ⚠️ Adatta questo selettore ai nomi reali dentro useQuestStore.js:
  // serve solo per il pallino col numero sul bottone Missioni.
  const questCount = useQuestStore(
    (s) => (s.quests ?? []).filter((q) => !q.completed).length
  );

  const [sliderActive, setSliderActive] = useState(false);

  const badge = SEASON_BADGE[season] ?? SEASON_BADGE.primavera;
  const volumePercent = Math.round(volume * 100);

  const playerOpen = openPanel === PANEL.PLAYER;
  const questsOpen = openPanel === PANEL.QUESTS;

  return (
    <div className="hud-root">
      {/* Scrim solo per il popover Missioni: un tocco fuori lo chiude.
          Il pannello giocatrice si chiude col chevron, non serve scrim. */}
      {questsOpen && (
        <div className="hud-scrim" onPointerDown={closePanel} aria-hidden="true" />
      )}

      {/* ---------- Pannello giocatrice: header sempre visibile + chevron ---------- */}
      <div className={`hud-player-panel ${playerOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="hud-player-header"
          onClick={() => togglePanel(PANEL.PLAYER)}
          aria-expanded={playerOpen}
          aria-label={playerOpen ? 'Chiudi la scheda di Cecilia' : 'Apri la scheda di Cecilia'}
        >
          <span className="hud-avatar" aria-hidden="true">🐱</span>
          <span className="hud-name">{name}</span>
          <span className="hud-season" title={badge.label}>
            {badge.emoji} {badge.label}
          </span>
          <Chevron open={playerOpen} />
        </button>

        <div className="hud-player-body" aria-hidden={!playerOpen}>
          <div className="hud-player-body-inner">
            <div className="hud-stat hud-stat--coins">
              <span className="hud-icon" aria-hidden="true">🔔</span>
              <span className="hud-value">{coins}</span>
            </div>

            <div className="hud-stat hud-stat--hearts" aria-label={`${hearts} cuori`}>
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={`hud-heart ${i < hearts ? 'is-full' : 'is-empty'}`}
                  aria-hidden="true"
                >
                  {i < hearts ? '💖' : '🤍'}
                </span>
              ))}
            </div>

            <span className="hud-time">🕒 {currentTime}</span>
          </div>
        </div>
      </div>

      {/* ---------- Missioni: collassate nel bottone, popover al toggle ---------- */}
      <div className={`hud-quests ${questsOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="hud-quests-btn"
          onClick={() => {
  togglePanel(PANEL.PLAYER);
  console.log('CLICK player → openPanel ora è:', usePlayerStore.getState().openPanel);
}}

          aria-expanded={questsOpen}
          aria-label="Missioni"
        >
          <span className="hud-quests-emoji" aria-hidden="true">📜</span>
          <span className="hud-quests-label">Missioni</span>
          {questCount > 0 && !questsOpen && (
            <span className="hud-quests-badge" aria-hidden="true">{questCount}</span>
          )}
          <Chevron open={questsOpen} />
        </button>

        <div className="hud-quests-popover" role="dialog" aria-hidden={!questsOpen}>
          <QuestPanel />
        </div>
      </div>

      {/* ---------- Controllo audio: indipendente dal resto ---------- */}
      <div className={`hud-audio ${musicEnabled ? '' : 'is-muted'}`}>
        <button
          type="button"
          className="hud-audio-btn"
          onClick={usePlayerStore.getState().toggleMusic}
          aria-pressed={musicEnabled}
          aria-label={musicEnabled ? 'Spegni la musica' : 'Accendi la musica'}
        >
          <SpeakerIcon muted={!musicEnabled} volume={volume} />
        </button>

        <div className={`hud-slider-wrap ${sliderActive ? 'is-active' : ''}`}>
          <input
            type="range"
            className="hud-slider"
            min="0"
            max="100"
            step="1"
            value={musicEnabled ? volumePercent : 0}
            style={{ '--vol': `${musicEnabled ? volumePercent : 0}%` }}
            onChange={(e) => usePlayerStore.getState().setVolume(Number(e.target.value) / 100)}
            onPointerDown={() => setSliderActive(true)}
            onPointerUp={() => setSliderActive(false)}
            onPointerCancel={() => setSliderActive(false)}
            aria-label="Volume della musica"
          />
          <span className="hud-slider-bubble" aria-hidden="true">
            {musicEnabled ? volumePercent : 0}
          </span>
        </div>
      </div>
    </div>
  );
}