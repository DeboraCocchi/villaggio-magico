/**
 * @file PlayerHud.jsx
 * HUD della giocatrice.
 *
 * Unico elemento sempre presente: il dock di bottoni tondi a sinistra.
 * Ogni bottone funziona come switch — il pannello si espande dal bottone
 * e vi ricollassa dentro. A pannello chiuso lo schermo di gioco è libero.
 *
 * Il controllo audio è indipendente dal dock e resta sempre visibile.
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
 * Bottone tondo del dock.
 * @param {{ emoji: string, label: string, badge?: number, active: boolean, onClick: Function }} props
 */
function DockButton({ emoji, label, badge, active, onClick }) {
  return (
    <button
      type="button"
      className={`hud-dock-btn ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-expanded={active}
      aria-label={label}
    >
      <span className="hud-dock-emoji" aria-hidden="true">{emoji}</span>
      {badge > 0 && !active && (
        <span className="hud-dock-badge" aria-hidden="true">{badge}</span>
      )}
    </button>
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

  return (
    <div className="hud-root">
      {/* Velo trasparente: un tocco fuori chiude tutto. Esiste solo a pannello aperto. */}
      {openPanel && (
        <div className="hud-scrim" onPointerDown={closePanel} aria-hidden="true" />
      )}

      {/* ---------- Dock: unico elemento permanente ---------- */}
      <div className="hud-dock">
        <div className="hud-dock-slot">
          <DockButton
            emoji="🐱"
            label="Scheda di Cecilia"
            active={openPanel === PANEL.PLAYER}
            onClick={() => togglePanel(PANEL.PLAYER)}
          />
          <div
            className={`hud-bubble ${openPanel === PANEL.PLAYER ? 'is-open' : ''}`}
            role="dialog"
            aria-hidden={openPanel !== PANEL.PLAYER}
          >
            <div className="hud-card">
              <div className="hud-name-row">
                <span className="hud-avatar" aria-hidden="true">🐱</span>
                <span className="hud-name">{name}</span>
              </div>

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

              <div className="hud-bottom-row">
                <span className="hud-time">🕒 {currentTime}</span>
                <span className="hud-season" title={badge.label}>
                  {badge.emoji} {badge.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="hud-dock-slot">
          <DockButton
            emoji="📜"
            label="Missioni"
            badge={questCount}
            active={openPanel === PANEL.QUESTS}
            onClick={() => togglePanel(PANEL.QUESTS)}
          />
          <div
            className={`hud-bubble hud-bubble--quests ${openPanel === PANEL.QUESTS ? 'is-open' : ''}`}
            role="dialog"
            aria-hidden={openPanel !== PANEL.QUESTS}
          >
            <div className="hud-card hud-card--quests">
              <QuestPanel />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Controllo audio: indipendente dal dock ---------- */}
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