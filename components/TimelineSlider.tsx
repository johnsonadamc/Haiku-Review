'use client';

import type { CSSProperties, MouseEvent } from 'react';

type Haiku = { id: string | number; created_at?: string };

type Props = {
  placeHaikus: Haiku[];
  activeIndex: number;
  onSelect: (index: number) => void;
  visible: boolean;
};

function haikuYear(h: Haiku): string {
  return h.created_at ? new Date(h.created_at).getFullYear().toString() : '';
}

const GOLD = '#8a6a2a';
const GOLD_FAINT = 'rgba(139,106,42,0.28)';
// Track sits 14px from the right edge of the 80px container = 14px from the screen edge.
const TRACK_RIGHT = 14;

export default function TimelineSlider({ placeHaikus, activeIndex, onSelect, visible }: Props) {
  const n = placeHaikus.length;
  if (n < 2) return null;

  // Map click Y position to nearest tick index.
  // Slider is newest-at-top: pct=0 (top) → newest (n-1), pct=1 (bottom) → oldest (0).
  const handleTrackClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const { top, height } = el.getBoundingClientRect();
    if (height === 0) return;
    const pct = Math.max(0, Math.min(1, (e.clientY - top) / height));
    onSelect(Math.round((1 - pct) * (n - 1)));
  };

  const labelBase: CSSProperties = {
    fontFamily: "'Shippori Mincho', serif",
    color: 'var(--ink-faint)',
    letterSpacing: '0.15em',
  };

  return (
    <div style={{
      position: 'fixed', right: 0, top: 80,
      zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      pointerEvents: visible ? 'all' : 'none',
      opacity: visible ? 1 : 0, transition: 'opacity 0.4s',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      {/* Track — click anywhere to jump to nearest haiku */}
      <div
        onClick={handleTrackClick}
        style={{
          position: 'relative',
          height: 'min(45vh, 360px)',
          width: 80,
          cursor: 'pointer',
        }}
      >
        {/* Track line */}
        <div style={{
          position: 'absolute',
          right: TRACK_RIGHT, top: 0, bottom: 0,
          width: 1, background: GOLD_FAINT,
        }} />

        {placeHaikus.map((h, i) => {
          // Newest at top (0%), oldest at bottom (100%)
          const pct = n > 1 ? (1 - i / (n - 1)) * 100 : 50;
          const isActive = i === activeIndex;
          const yr = haikuYear(h);
          // Show year label at the top of each year group (highest-index haiku of that year)
          const nextH = i + 1 < n ? placeHaikus[i + 1] : null;
          const showYear = yr && (i === n - 1 || (nextH !== null && haikuYear(nextH) !== yr));
          const tickWidth = isActive ? 10 : 6;
          // Center tick on the track: tickRight + tickWidth/2 = TRACK_RIGHT
          const tickRight = TRACK_RIGHT - tickWidth / 2;

          return (
            <div key={String(h.id)}>
              {/* Year label — only when year changes from previous tick */}
              {showYear && (
                <div style={{
                  ...labelBase, fontSize: 8,
                  position: 'absolute', top: `${pct}%`, right: 30,
                  transform: 'translateY(-50%)',
                  opacity: isActive ? 0.78 : 0.42,
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.2s',
                }}>
                  {yr}
                </div>
              )}

              {/* Tick mark */}
              <div style={{
                position: 'absolute', top: `${pct}%`,
                right: tickRight,
                width: tickWidth,
                height: 1,
                background: isActive ? GOLD : GOLD_FAINT,
                transform: 'translateY(-50%)',
                transition: 'right 0.15s, width 0.15s, background 0.2s',
              }} />

              {/* Thumb circle — only at active tick */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: `${pct}%`,
                  right: TRACK_RIGHT - 3,
                  width: 6, height: 6, borderRadius: '50%',
                  background: GOLD,
                  transform: 'translateY(-50%)',
                  boxShadow: '0 0 0 3px rgba(138,106,42,0.13)',
                  transition: 'top 0.15s',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
