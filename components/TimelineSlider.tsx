'use client';

import { useState, useRef, useEffect } from 'react';

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

function haikuYear(h: Haiku): string {
  return h.created_at ? new Date(h.created_at).getFullYear().toString() : '';
}

const GOLD = '#8a6a2a';
const GOLD_FAINT = 'rgba(139,106,42,0.28)';
// Track sits 14px from the right edge of the 80px container = 14px from the screen edge.
const TRACK_RIGHT = 14;

export default function TimelineSlider({
  placeHaikus, activeIndex, onSelect, onReturnToJourney, visible,
}: Props) {
  const n = placeHaikus.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const [liveIndex, setLiveIndex] = useState<number | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  // Holds the cleanup fn for any active drag so we can cancel on unmount/hide
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!visible) {
      setHasInteracted(false);
      setLiveIndex(null);
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    return () => { dragCleanupRef.current?.(); };
  }, []);

  // Always reads the live DOM rect so getBoundingClientRect is always fresh.
  const indexFromY = (clientY: number): number => {
    const el = trackRef.current;
    if (!el || n <= 1) return 0;
    const { top, height } = el.getBoundingClientRect();
    if (height === 0) return 0;
    const pct = Math.max(0, Math.min(1, (clientY - top) / height));
    return Math.round(pct * (n - 1));
  };

  // Attach window listeners synchronously so a fast tap (touchstart → touchend)
  // is always captured — no useEffect timing race.
  const startDrag = (clientY: number) => {
    dragCleanupRef.current?.(); // cancel any previous drag

    setHasInteracted(true);
    setLiveIndex(indexFromY(clientY));

    const onMove = (e: MouseEvent | TouchEvent) => {
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      setLiveIndex(indexFromY(y));
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      const y = 'changedTouches' in e
        ? e.changedTouches[0].clientY
        : (e as MouseEvent).clientY;
      cleanup();
      onSelect(indexFromY(y));
    };

    const cleanup = () => {
      setLiveIndex(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      if (dragCleanupRef.current === cleanup) dragCleanupRef.current = null;
    };

    dragCleanupRef.current = cleanup;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  if (n < 2) return null;

  const displayIndex = liveIndex !== null ? liveIndex : activeIndex;
  const isDragging = liveIndex !== null;

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
      {/* Track — the entire area is the drag target */}
      <div
        ref={trackRef}
        onMouseDown={e => { e.preventDefault(); startDrag(e.clientY); }}
        onTouchStart={e => { e.stopPropagation(); startDrag(e.touches[0].clientY); }}
        style={{
          position: 'relative',
          height: 'min(60vh, 480px)',
          width: 80,
          cursor: isDragging ? 'grabbing' : 'ns-resize',
          touchAction: 'none',
        }}
      >
        {/* Track line */}
        <div style={{
          position: 'absolute',
          right: TRACK_RIGHT, top: 0, bottom: 0,
          width: 1, background: GOLD_FAINT,
        }} />

        {placeHaikus.map((h, i) => {
          const pct = n > 1 ? (i / (n - 1)) * 100 : 50;
          const isActive = i === displayIndex;
          const yr = haikuYear(h);
          const showYear = yr && (i === 0 || haikuYear(placeHaikus[i - 1]) !== yr);
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

              {/* Tick mark — 1px min height so sub-pixel rendering doesn't hide it */}
              <div style={{
                position: 'absolute', top: `${pct}%`,
                right: tickRight,
                width: tickWidth,
                height: 1,
                background: isActive ? GOLD : GOLD_FAINT,
                transform: 'translateY(-50%)',
                transition: isDragging ? 'none' : 'right 0.15s, width 0.15s, background 0.2s',
              }} />

              {/* Thumb circle — only at active tick */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: `${pct}%`,
                  // right: TRACK_RIGHT - 3 → center at TRACK_RIGHT - 3 + 6/2 = TRACK_RIGHT ✓
                  right: TRACK_RIGHT - 3,
                  width: 6, height: 6, borderRadius: '50%',
                  background: GOLD,
                  transform: 'translateY(-50%)',
                  boxShadow: '0 0 0 3px rgba(138,106,42,0.13)',
                  transition: isDragging ? 'none' : 'top 0.15s',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Return label — fades in after first interaction */}
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
        ← back to journey
      </button>
    </div>
  );
}
