'use client';

import { useState, useRef } from 'react';
import { countLineSyllables } from '@/lib/syllables';

type HaikuPost = {
  id: string | number;
  author?: string | null;
  place?: string;
  city?: string;
  line_1?: string;
  line_2?: string;
  line_3?: string;
  photo_url?: string | null;
};

type PlaceResult = { n: string; c: string; place_id?: string; lat?: number; lng?: number };

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted: (newPost: HaikuPost, previousHaiku: HaikuPost | null) => void;
  onError?: (msg: string) => void;
};

const EXPECTED = [5, 7, 5];

export default function SubmitPanel({ open, onClose, onSubmitted, onError }: Props) {
  const toast = (m: string) => { if (onError) onError(m); else alert(m); };
  const [author, setAuthor] = useState('');
  const [haiku, setHaiku] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeData, setPlaceData] = useState<PlaceResult | null>(null);
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const lines = haiku.split('\n');
  const syllableStates = [0, 1, 2].map(i => {
    const l = lines[i] || '';
    if (!l.trim()) return 'empty';
    return countLineSyllables(l) === EXPECTED[i] ? 'ok' : 'bad';
  });

  const searchPlace = async (q: string) => {
    setPlaceQuery(q);
    setPlaceData(null);
    if (!q || q.length < 2) { setPlaceResults([]); setShowResults(false); return; }
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPlaceResults(data.results || []);
      setShowResults(true);
    } catch { setPlaceResults([]); }
  };

  const selectPlace = (p: PlaceResult) => {
    setPlaceQuery(p.n);
    setPlaceData(p);
    setShowResults(false);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const resetForm = () => {
    setAuthor(''); setHaiku(''); setPlaceQuery(''); setPlaceData(null);
    setPhotoPreview(null); setPhotoFile(null);
  };

  const doSubmit = async () => {
    const trimmed = haiku.trim();
    if (!trimmed) { toast('write the haiku first'); return; }
    const raw = haiku.split('\n').filter(l => l.trim());
    if (raw.length < 2) { toast('needs at least two lines'); return; }
    if (!placeQuery) { toast('where was this?'); return; }
    setSubmitting(true);
    const photoUrl: string | null = photoFile ? photoPreview : null;
    const placeName = placeData?.n || placeQuery;
    const placeCity = placeData?.c || '';
    const body = {
      line_1: raw[0] || '', line_2: raw[1] || '', line_3: raw[2] || '',
      author: author || null,
      place_name: placeName,
      place_city: placeCity,
      google_place_id: placeData?.place_id || null,
      photo_url: photoUrl,
    };
    try {
      const res = await fetch('/api/haikus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      resetForm();
      const dbHaiku = data.haiku ? {
        ...data.haiku,
        place: data.place?.name || placeName,
        city: data.place?.city || placeCity,
        places: data.place ? { name: data.place.name, city: data.place.city, lat: data.place.lat, lng: data.place.lng } : undefined,
      } : null;
      onSubmitted(dbHaiku || {
        id: Date.now(), author: author || null, line_1: raw[0] || '', line_2: raw[1] || '', line_3: raw[2] || '',
        place: placeName, city: placeCity, photo_url: photoUrl,
      }, data.previousHaiku || null);
    } catch {
      resetForm();
      onSubmitted({
        id: Date.now(), author: author || null, line_1: raw[0] || '', line_2: raw[1] || '', line_3: raw[2] || '',
        place: placeName, city: placeCity, photo_url: photoUrl,
      }, null);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(30,26,20,0.16)', color: 'var(--ink)',
    fontFamily: "'Shippori Mincho', serif", fontSize: 18, padding: '8px 0',
    outline: 'none', transition: 'border-color 0.25s',
    appearance: 'none' as const, borderRadius: 0, letterSpacing: '0.03em',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: "'Shippori Mincho', serif", fontSize: 9,
    letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(237,230,214,0.94)', backdropFilter: 'blur(24px)',
      opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none', transition: 'opacity 0.32s',
    }}>
      <div style={{
        background: 'var(--parchment)', border: '1px solid rgba(30,26,20,0.1)',
        width: 'min(520px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
        padding: '44px 42px 36px',
        boxShadow: '0 2px 0 rgba(30,26,20,0.05), 0 24px 64px rgba(30,26,20,0.12)',
      }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', marginBottom: 18, opacity: 0.75 }} />
        <h2 style={{ fontFamily: "'Zen Old Mincho', serif", fontSize: 22, color: 'var(--ink)', marginBottom: 4, fontWeight: 400, letterSpacing: '0.35em', textTransform: 'uppercase' }}>Submit</h2>
        <span style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 11, letterSpacing: '0.2em', color: 'var(--ink-soft)', marginBottom: 32, display: 'block' }}>5 · 7 · 5 — one photo, one place, one moment</span>

        {/* Photo upload */}
        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Photo</label>
          <div
            className="pz-zone"
            onClick={() => fileRef.current?.click()}
            style={{
              border: `1px solid ${photoPreview ? 'rgba(139,42,26,0.28)' : 'rgba(30,26,20,0.11)'}`,
              padding: photoPreview ? 0 : '26px', textAlign: 'center', cursor: 'pointer',
              transition: 'border-color 0.25s', overflow: 'hidden', position: 'relative',
              background: 'rgba(30,26,20,0.015)',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="preview" style={{ width: '100%', maxHeight: 190, objectFit: 'cover', display: 'block' }} />
            ) : (
              <>
                <div style={{ fontSize: 16, opacity: 0.16, marginBottom: 5, color: 'var(--ink)' }}>◻</div>
                <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 10, letterSpacing: '0.25em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>tap to upload</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
        </div>

        {/* Name + Place row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
          <div>
            <label style={labelStyle}>Your name</label>
            <input type="text" placeholder="anonymous" maxLength={30} value={author} onChange={e => setAuthor(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Specific place</label>
            <input
              type="text" placeholder="Fushimi Inari Shrine…" autoComplete="off"
              value={placeQuery} onChange={e => searchPlace(e.target.value)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              style={inputStyle}
            />
            {showResults && placeResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'var(--parchment)', border: '1px solid rgba(30,26,20,0.12)',
                borderTop: 'none', zIndex: 10, maxHeight: 200, overflowY: 'auto',
              }}>
                {placeResults.map((p, i) => (
                  <div key={i} className="psi-item" onMouseDown={(e) => { e.preventDefault(); selectPlace(p); }} style={{
                    padding: '10px 12px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(30,26,20,0.06)', transition: 'background 0.15s',
                  }}>
                    <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 16, color: 'var(--ink)' }}>{p.n}</div>
                    <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.12em', marginTop: 2 }}>{p.c}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Haiku textarea */}
        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Haiku — three lines</label>
          <textarea
            value={haiku}
            onChange={e => setHaiku(e.target.value)}
            placeholder={"first gate, still shut\na child counts stone lanterns\nthe moss does not wait"}
            rows={3}
            style={{
              ...inputStyle, resize: 'none', lineHeight: 2.1, minHeight: 112,
              backgroundImage: 'repeating-linear-gradient(transparent, transparent calc(2.1em - 1px), rgba(30,26,20,0.065) calc(2.1em - 1px), rgba(30,26,20,0.065) 2.1em)',
              backgroundAttachment: 'local', padding: '4px 0',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
            {syllableStates.map((state, i) => (
              <div key={i} style={{
                flex: 1, height: 1.5, borderRadius: 1,
                background: state === 'ok' ? '#5a8040' : state === 'bad' ? 'var(--seal)' : 'rgba(30,26,20,0.1)',
                transition: 'background 0.35s',
              }} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, paddingTop: 22, borderTop: '1px solid rgba(30,26,20,0.07)' }}>
          <button className="bcnc" onClick={onClose} style={{
            background: 'none', border: 'none', fontFamily: "'Shippori Mincho', serif",
            fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--ink-soft)', cursor: 'pointer', transition: 'color 0.2s',
          }}>never mind</button>
          <button className="bpub" onClick={doSubmit} disabled={submitting} style={{
            background: 'none', border: '1px solid rgba(139,42,26,0.4)', color: 'var(--seal)',
            fontFamily: "'Shippori Mincho', serif", fontSize: 11, padding: '10px 28px',
            cursor: 'pointer', transition: 'all 0.25s', letterSpacing: '0.28em', textTransform: 'uppercase',
            opacity: submitting ? 0.6 : 1,
          }}>{submitting ? 'Publishing…' : 'Publish'}</button>
        </div>
      </div>
    </div>
  );
}
