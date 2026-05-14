'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { SEED_PLACES } from '@/lib/seed-data';

type HaikuPost = {
  id: string | number;
  place?: string;
  city?: string;
  places?: { name: string; city: string | null; lat?: number | null; lng?: number | null };
};

type MapPlace = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  count: number;
};

type Props = {
  open: boolean;
  posts: HaikuPost[];
  onClose: () => void;
  onPlaceSelect: (placeName: string, placeHaikus?: HaikuPost[]) => void;
};

const MW = 3200, MH = 1800;

function ll2xy(lng: number, lat: number) {
  const x = (lng + 180) / 360 * MW;
  const lr = lat * Math.PI / 180;
  const mn = Math.log(Math.tan(Math.PI / 4 + lr / 2));
  return { x, y: MH / 2 - MH * mn / (2 * Math.PI) };
}

const CONTINENTS = [
  [[0.08,0.18],[0.22,0.12],[0.28,0.15],[0.32,0.22],[0.28,0.35],[0.22,0.45],[0.18,0.52],[0.12,0.52],[0.06,0.42],[0.04,0.3]],
  [[0.18,0.52],[0.24,0.5],[0.28,0.55],[0.26,0.7],[0.22,0.78],[0.18,0.8],[0.16,0.72],[0.15,0.6]],
  [[0.42,0.18],[0.52,0.15],[0.56,0.2],[0.54,0.28],[0.48,0.32],[0.42,0.28],[0.4,0.22]],
  [[0.44,0.32],[0.54,0.3],[0.58,0.38],[0.56,0.55],[0.52,0.68],[0.46,0.7],[0.42,0.58],[0.4,0.42]],
  [[0.52,0.15],[0.72,0.12],[0.82,0.18],[0.88,0.28],[0.85,0.38],[0.78,0.42],[0.68,0.4],[0.58,0.35],[0.54,0.28]],
  [[0.72,0.55],[0.82,0.52],[0.88,0.58],[0.86,0.68],[0.78,0.7],[0.7,0.65],[0.68,0.58]],
];

export default function MapOverlay({ open, posts, onClose, onPlaceSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ px: 0, py: 0, z: 1, hovP: null as string | null });
  const [tooltip, setTooltip] = useState<{ place: MapPlace; sx: number; sy: number } | null>(null);
  const panRef = useRef({ active: false, moved: false, sx: 0, sy: 0, spx: 0, spy: 0, ltd: null as number | null });

  const buildPlaces = useCallback((): MapPlace[] => {
    if (posts.length === 0) {
      return SEED_PLACES.map(p => ({ id: p.id, name: p.name, city: p.city, lat: p.lat, lng: p.lng, count: p.pids.length }));
    }
    const map = new Map<string, MapPlace>();
    posts.forEach(p => {
      const name = p.places?.name || p.place || '';
      const city = p.places?.city || p.city || '';
      const lat = p.places?.lat ?? null;
      const lng = p.places?.lng ?? null;
      if (!name || lat === null || lng === null) return;
      const key = name;
      if (map.has(key)) { map.get(key)!.count++; }
      else map.set(key, { id: key, name, city, lat, lng, count: 1 });
    });
    if (map.size === 0) {
      return SEED_PLACES.map(p => ({ id: p.id, name: p.name, city: p.city, lat: p.lat, lng: p.lng, count: p.pids.length }));
    }
    return Array.from(map.values());
  }, [posts]);

  const drawMapBase = useCallback((ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    const { px, py, z } = stateRef.current;
    const ox = cw / 2 - MW * z / 2 + px;
    const oy = ch / 2 - MH * z / 2 + py;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(z, z);
    ctx.fillStyle = '#d2d6db';
    ctx.fillRect(0, 0, MW, MH);
    CONTINENTS.forEach(pts => {
      ctx.beginPath();
      pts.forEach(([cx2, cy2], i) => {
        const x = cx2 * MW, y = cy2 * MH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = '#f0ebe0';
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,26,20,0.16)';
      ctx.lineWidth = 0.8 / z;
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(30,26,20,0.055)';
    ctx.lineWidth = 0.5 / z;
    ctx.setLineDash([4 / z, 8 / z]);
    [0.2, 0.35, 0.5, 0.65, 0.8].forEach(gy => { ctx.beginPath(); ctx.moveTo(0, gy * MH); ctx.lineTo(MW, gy * MH); ctx.stroke(); });
    [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].forEach(gx => { ctx.beginPath(); ctx.moveTo(gx * MW, 0); ctx.lineTo(gx * MW, MH); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.restore();
  }, []);

  const renderPlaceDots = useCallback((ctx: CanvasRenderingContext2D, cw: number, ch: number, places: MapPlace[]) => {
    const { px, py, z, hovP } = stateRef.current;
    const ox = cw / 2 - MW * z / 2 + px;
    const oy = ch / 2 - MH * z / 2 + py;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(z, z);
    places.forEach(place => {
      const { x: mx, y: my } = ll2xy(place.lng, place.lat);
      const r = Math.max(6, 3 + place.count * 2) / z;
      const hov = hovP === place.id;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.shadowColor = hov ? 'rgba(139,42,26,0.3)' : 'transparent';
      ctx.shadowBlur = hov ? 8 / z : 0;
      ctx.fillStyle = hov ? '#8b2a1a' : 'rgba(30,26,20,0.6)';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = `${11 / z}px 'Shippori Mincho', serif`;
      ctx.fillStyle = hov ? '#8b2a1a' : 'rgba(30,26,20,0.5)';
      ctx.fillText(place.name, mx + r + 2 / z, my + 3.5 / z);
    });
    ctx.restore();
  }, []);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const places = buildPlaces();
    drawMapBase(ctx, cw, ch);
    renderPlaceDots(ctx, cw, ch, places);
  }, [buildPlaces, drawMapBase, renderPlaceDots]);

  const scrToMap = useCallback((sx: number, sy: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return { mx: 0, my: 0 };
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const { px, py, z } = stateRef.current;
    const ox = cw / 2 - MW * z / 2 + px;
    const oy = ch / 2 - MH * z / 2 + py;
    return { mx: (sx - ox) / z, my: (sy - oy) / z };
  }, []);

  const placeAt = useCallback((sx: number, sy: number, places: MapPlace[]): MapPlace | null => {
    const { mx, my } = scrToMap(sx, sy);
    let best: MapPlace | null = null, bd = Infinity;
    places.forEach(pl => {
      const { x: px2, y: py2 } = ll2xy(pl.lng, pl.lat);
      const d = Math.hypot(mx - px2, my - py2);
      const hit = Math.max(14, 6 + pl.count * 2) / stateRef.current.z;
      if (d < hit && d < bd) { bd = d; best = pl; }
    });
    return best;
  }, [scrToMap]);

  useEffect(() => {
    if (!open) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    stateRef.current.z = Math.min(cw / MW, ch / MH) * 1.15;
    stateRef.current.px = 0;
    stateRef.current.py = 0;
    setTimeout(() => drawMap(), 50);
  }, [open, drawMap]);

  useEffect(() => {
    if (!open) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const places = buildPlaces();

    const onMouseDown = (e: MouseEvent) => {
      panRef.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, spx: stateRef.current.px, spy: stateRef.current.py, ltd: null };
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      if (panRef.current.active) {
        const dx = e.clientX - panRef.current.sx, dy = e.clientY - panRef.current.sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panRef.current.moved = true;
        stateRef.current.px = panRef.current.spx + dx;
        stateRef.current.py = panRef.current.spy + dy;
        drawMap();
      } else {
        const pl = placeAt(sx, sy, places);
        wrap.style.cursor = pl ? 'pointer' : 'grab';
        const newHov = pl ? pl.id : null;
        if (stateRef.current.hovP !== newHov) {
          stateRef.current.hovP = newHov;
          drawMap();
        }
        if (pl) setTooltip({ place: pl, sx, sy });
        else setTooltip(null);
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (!panRef.current.moved) {
        const rect = wrap.getBoundingClientRect();
        const pl = placeAt(e.clientX - rect.left, e.clientY - rect.top, places);
        if (pl) {
          const placeHaikus = posts.filter(p => (p.places?.name || p.place) === pl.name);
          onPlaceSelect(pl.name, placeHaikus);
        }
      }
      panRef.current.active = false;
    };
    const onMouseLeave = () => { panRef.current.active = false; setTooltip(null); stateRef.current.hovP = null; drawMap(); };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const nz = Math.max(0.3, Math.min(4, stateRef.current.z * (1 - e.deltaY * 0.001)));
      const sc = nz / stateRef.current.z;
      const cw = wrap.clientWidth, ch = wrap.clientHeight;
      stateRef.current.px = (stateRef.current.px - (sx - cw / 2)) * sc + (sx - cw / 2);
      stateRef.current.py = (stateRef.current.py - (sy - ch / 2)) * sc + (sy - ch / 2);
      stateRef.current.z = nz;
      drawMap();
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        panRef.current = { active: true, moved: false, sx: e.touches[0].clientX, sy: e.touches[0].clientY, spx: stateRef.current.px, spy: stateRef.current.py, ltd: null };
      }
      if (e.touches.length === 2) {
        panRef.current.ltd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && panRef.current.active) {
        const dx = e.touches[0].clientX - panRef.current.sx, dy = e.touches[0].clientY - panRef.current.sy;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) panRef.current.moved = true;
        stateRef.current.px = panRef.current.spx + dx;
        stateRef.current.py = panRef.current.spy + dy;
        drawMap();
      }
      if (e.touches.length === 2 && panRef.current.ltd !== null) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        stateRef.current.z = Math.max(0.3, Math.min(4, stateRef.current.z * d / panRef.current.ltd));
        panRef.current.ltd = d;
        drawMap();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!panRef.current.moved && e.changedTouches.length === 1) {
        const rect = wrap.getBoundingClientRect();
        const pl = placeAt(e.changedTouches[0].clientX - rect.left, e.changedTouches[0].clientY - rect.top, places);
        if (pl) {
          const placeHaikus = posts.filter(p => (p.places?.name || p.place) === pl.name);
          onPlaceSelect(pl.name, placeHaikus);
        }
      }
      panRef.current.active = false;
      panRef.current.ltd = null;
    };

    wrap.addEventListener('mousedown', onMouseDown);
    wrap.addEventListener('mousemove', onMouseMove);
    wrap.addEventListener('mouseup', onMouseUp);
    wrap.addEventListener('mouseleave', onMouseLeave);
    wrap.addEventListener('wheel', onWheel, { passive: false });
    wrap.addEventListener('touchstart', onTouchStart, { passive: true });
    wrap.addEventListener('touchmove', onTouchMove, { passive: true });
    wrap.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      wrap.removeEventListener('mousedown', onMouseDown);
      wrap.removeEventListener('mousemove', onMouseMove);
      wrap.removeEventListener('mouseup', onMouseUp);
      wrap.removeEventListener('mouseleave', onMouseLeave);
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('touchstart', onTouchStart);
      wrap.removeEventListener('touchmove', onTouchMove);
      wrap.removeEventListener('touchend', onTouchEnd);
    };
  }, [open, buildPlaces, drawMap, placeAt, posts, onPlaceSelect]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'var(--parchment)',
      opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
      transition: 'opacity 0.5s ease', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '28px 36px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontFamily: "'Zen Old Mincho', serif", fontSize: 12, color: 'var(--ink)', opacity: 0.4, letterSpacing: '0.4em', textTransform: 'uppercase' }}>Places</span>
          <div style={{ width: 20, height: 1, background: 'var(--gold)', opacity: 0.55 }} />
          <span style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 9, color: 'var(--ink-soft)', letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.65 }}>tap a place · claude charts your journey</span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Shippori Mincho', serif",
          fontSize: 11, color: 'var(--ink-soft)', opacity: 0.35, letterSpacing: '0.18em',
          textTransform: 'uppercase', transition: 'opacity 0.2s', pointerEvents: 'all',
        }}>close</button>
      </div>

      {/* Canvas */}
      <div ref={wrapRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: 'grab' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.sx + 16, (wrapRef.current?.clientWidth || 400) - 240),
          top: Math.max(0, tooltip.sy - 10),
          zIndex: 20, pointerEvents: 'none',
          background: 'var(--parchment)', border: '1px solid rgba(30,26,20,0.12)',
          padding: '10px 16px', boxShadow: '0 2px 12px rgba(30,26,20,0.1)',
          opacity: 1, transition: 'opacity 0.2s', maxWidth: 220,
        }}>
          <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 14, color: 'var(--ink)', marginBottom: 3 }}>{tooltip.place.name}</div>
          <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{tooltip.place.city}</div>
          <div style={{ width: 16, height: 1, background: 'var(--gold)', opacity: 0.6, marginBottom: 8 }} />
          <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.12em' }}>{tooltip.place.count} {tooltip.place.count === 1 ? 'haiku' : 'haikus'} here</div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        fontFamily: "'Shippori Mincho', serif", fontSize: 10, color: 'var(--ink-faint)',
        letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.35, whiteSpace: 'nowrap', pointerEvents: 'none',
      }}>drag to explore · tap a place to begin a journey</div>
      <div style={{
        position: 'absolute', bottom: 24, right: 36,
        fontFamily: "'Shippori Mincho', serif", fontSize: 8, color: 'var(--ink-faint)',
        letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.25,
        border: '1px solid rgba(30,26,20,0.1)', padding: '4px 8px', pointerEvents: 'none',
      }}>map · mapbox ready</div>
    </div>
  );
}
