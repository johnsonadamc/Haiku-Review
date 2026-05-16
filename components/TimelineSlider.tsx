'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Haiku = {
  id: string | number;
  created_at?: string;
};

type Props = {
  placeHaikus: Haiku[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onReturnToJourney: () => void;
  visible: boolean;
};

function haikusYear(h: Haiku): string {
  return h.created_at ? new Date(h.created_at).getFullYear().toString() : '';
}

const GOLD = '#8a6a2a';
const GOLD_FAINT = 'rgba(139,106,42,0.28)';

// Container is 80px wide. Track line sits at right: 14px.
// All ticks and thumb center at right: 14px from container edge = 14px from screen edge.
const TRACK_RIGHT = 14;

export default function TimelineSlider({
  placeHaikus, activeIndex, onSelect, onReturnToJourney, visible,
}: Props) {
  const n = placeHaikus.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Reset when slider hides (new place, etc.)
  useEffect(() => {
    if (!visible) { setHasInteracted(false); setDragging(false); }
  }, [visible]);

  const indexFromY = useCallback((clientY: number): number => {
    const el = trackRef.current;
    if (!el || n <= 1) return 0;
    const { top, height } = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientY - top) / height));
    return Math.round(pct * (n - 1));
  }, [n]);

  const startDrag = useCallback((clientY: number) => {
    setDragging(true);
    setDragIndex(indexFromY(clientY));
    setHasInteracted(true);
  }, [indexFromY]);

  // Attach move/up handlers to window during drag
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setDragIndex(indexFromY(y));
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      const y = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
      setDragging(false);
      onSelect(indexFromY(y));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, indexFromY, onSelect]);

  if (n < 2) return null;

  const displayIndex = dragging ? dragIndex : activeIndex;

  const years = placeHaikus.map(haikusYear);
  const firstYear = years.find(y => y) || '';
  const lastYear = [...years].reverse().find(y => y) || '';
  const yearRange = firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`;

  const labelBase: React.CSSProperties = {
    fontFamily: "'Shippori Mincho', serif",
    color: 'var(--ink-faint)',
    letterSpacing: '0.15em',
  };

  return (
    <div style={{
      position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
      zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      pointerEvents: visible ? 'all' : 'none',
      opacity: visible ? 1 : 0, transition: 'opacity 0.4s',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      {/* Header: count · year range, rotated vertical */}
      <div style={{
        ...labelBase, fontSize: 8, letterSpacing: '0.2em',
        writingMode: 'vertical-rl', opacity: 0.5,
        marginBottom: 10, paddingRight: TRACK_RIGHT - 1,
        whiteSpace: 'nowrap',
      }}>
        {n} haiku{n !== 1 ? 's' : ''} · {yearRange}
      </div>

      {/* Track area — drag target */}
      <div
        ref={trackRef}
        onMouseDown={e => { e.preventDefault(); startDrag(e.clientY); }}
        onTouchStart={e => { e.stopPropagation(); startDrag(e.touches[0].clientY); }}
        style={{
          position: 'relative',
          height: 'min(60vh, 480px)',
          width: 80,
          cursor: dragging ? 'grabbing' : 'ns-resize',
          touchAction: 'none',
        }}
      >
        {/* Track line */}
        <div style={{
          position: 'absolute',
          right: TRACK_RIGHT, top: 0, bottom: 0,
          width: 1, background: GOLD_FAINT,
        }} />

        {/* Ticks, year labels, thumb */}
        {placeHaikus.map((h, i) => {
          const pct = n > 1 ? (i / (n - 1)) * 100 : 50;
          const isActive = i === displayIndex;
          const yr = haikusYear(h);
          const showYear = yr && (i === 0 || haikusYear(placeHaikus[i - 1]) !== yr);

          // Tick: active is 10px wide, inactive is 6px. Both centered on TRACK_RIGHT.
          const tickWidth = isActive ? 10 : 6;
          const tickRight = TRACK_RIGHT - tickWidth / 2;

          return (
            <div key={String(h.id)}>
              {/* Year label — only when year changes */}
              {showYear && (
                <div style={{
                  ...labelBase, fontSize: 8,
                  position: 'absolute', top: `${pct}%`, right: 30,
                  transform: 'translateY(-50%)',
                  opacity: isActive ? 0.75 : 0.42,
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
                height: isActive ? 1 : 0.5,
                background: isActive ? GOLD : GOLD_FAINT,
                transform: 'translateY(-50%)',
                transition: dragging ? 'none' : 'right 0.15s, width 0.15s, background 0.2s',
              }} />

              {/* Thumb circle — only at active tick */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: `${pct}%`,
                  right: TRACK_RIGHT - 3,  // center: right + width/2 = TRACK_RIGHT - 3 + 3 = TRACK_RIGHT ✓
                  width: 6, height: 6, borderRadius: '50%',
                  background: GOLD,
                  transform: 'translateY(-50%)',
                  boxShadow: `0 0 0 3px rgba(138,106,42,0.13)`,
                  transition: dragging ? 'none' : 'top 0.15s',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Return label — appears after first interaction */}
      <button
        onClick={e => { e.stopPropagation(); onReturnToJourney(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          ...labelBase, fontSize: 8, letterSpacing: '0.18em',
          writingMode: 'vertical-rl',
          paddingRight: TRACK_RIGHT - 1, marginTop: 10,
          whiteSpace: 'nowrap', display: 'block',
          opacity: hasInteracted ? 0.45 : 0,
          transition: 'opacity 0.4s',
          pointerEvents: hasInteracted ? 'all' : 'none',
        }}
      >
        ← journey
      </button>
    </div>
  );
}
