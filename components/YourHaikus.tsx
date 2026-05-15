'use client';

import { useEffect, useState } from 'react';

type MyHaiku = {
  id: string;
  line_1: string;
  line_2: string;
  line_3: string;
  created_at: string;
  places?: { name: string; city: string | null } | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Shippori Mincho', serif",
  fontSize: 9,
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-faint)',
};

export default function YourHaikus({ open, onClose }: Props) {
  const [haikus, setHaikus] = useState<MyHaiku[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/my-haikus')
      .then(r => r.json())
      .then(d => setHaikus(d.haikus || []))
      .catch(() => setHaikus([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(237,230,214,0.94)', backdropFilter: 'blur(24px)',
      opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
      transition: 'opacity 0.32s',
    }}>
      <div style={{
        background: 'var(--parchment)', border: '1px solid rgba(30,26,20,0.1)',
        width: 'min(480px, 94vw)', maxHeight: '80vh', overflowY: 'auto',
        padding: '40px 40px 36px',
        boxShadow: '0 2px 0 rgba(30,26,20,0.05), 0 24px 64px rgba(30,26,20,0.12)',
      }}>
        <div style={{ width: 24, height: 1, background: 'var(--gold)', marginBottom: 16, opacity: 0.75 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "'Zen Old Mincho', serif", fontSize: 18, color: 'var(--ink)', fontWeight: 400, letterSpacing: '0.32em', textTransform: 'uppercase' }}>Your Haikus</h2>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Shippori Mincho', serif", fontSize: 11,
            color: 'var(--ink-soft)', opacity: 0.4, letterSpacing: '0.18em',
            textTransform: 'uppercase', transition: 'opacity 0.2s',
          }}>close</button>
        </div>

        {loading && (
          <div style={{ ...labelStyle, opacity: 0.5, textAlign: 'center', padding: '24px 0' }}>
            finding your words…
          </div>
        )}

        {!loading && haikus.length === 0 && (
          <div style={{ ...labelStyle, opacity: 0.45, lineHeight: 1.8 }}>
            no haikus found for this account
          </div>
        )}

        {!loading && haikus.map((h, i) => (
          <div key={h.id} style={{
            paddingBottom: 20,
            marginBottom: 20,
            borderBottom: i < haikus.length - 1 ? '1px solid rgba(30,26,20,0.06)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 14, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
              <span style={{ ...labelStyle, opacity: 0.55 }}>
                {h.places?.name || 'unknown place'}
                {h.places?.city ? ` · ${h.places.city}` : ''}
              </span>
            </div>
            <div style={{
              fontFamily: "'Shippori Mincho', serif",
              fontSize: 'clamp(14px, 2vw, 18px)',
              color: 'var(--ink)',
              lineHeight: 1.7,
            }}>
              {h.line_1}
            </div>
            <div style={{ ...labelStyle, opacity: 0.35, marginTop: 8 }}>
              {new Date(h.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
