'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSvgScene, SEED_POSTS, type SeedPost } from '@/lib/seed-data';
import MapOverlay from '@/components/MapOverlay';
import SubmitPanel from '@/components/SubmitPanel';

type HaikuPost = {
  id: string | number;
  author?: string | null;
  place?: string;
  city?: string;
  line_1?: string;
  line_2?: string;
  line_3?: string;
  lines?: [string, string, string];
  photo_url?: string | null;
  held_count?: number;
  scene?: string;
  places?: { name: string; city: string | null; lat?: number | null; lng?: number | null };
};

type Journey = {
  seq: HaikuPost[];
  conn: string[];
  type: string;
};

function getLines(p: HaikuPost): [string, string, string] {
  if (p.lines) return p.lines;
  return [p.line_1 || '', p.line_2 || '', p.line_3 || ''];
}

function getPlace(p: HaikuPost): string {
  return p.places?.name || p.place || '';
}

function getCity(p: HaikuPost): string {
  return p.places?.city || p.city || getPlace(p);
}

function getBg(p: HaikuPost): string {
  if (p.photo_url) return p.photo_url;
  if (p.scene) return getSvgScene(p.scene);
  return getSvgScene('kyoto');
}

// Suppress unused warning for SeedPost — it's used via type import for SEED_POSTS
type _SeedPostRef = SeedPost;

export default function Home() {
  const [posts, setPosts] = useState<HaikuPost[]>([]);
  const [ci, setCi] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wipeActive, setWipeActive] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);

  // reveal states
  const [showLtag, setShowLtag] = useState(false);
  const [showL0, setShowL0] = useState(false);
  const [showL1, setShowL1] = useState(false);
  const [showL2, setShowL2] = useState(false);
  const [showAuthor, setShowAuthor] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [bgVisible, setBgVisible] = useState(false);

  // thread label
  const [threadVisible, setThreadVisible] = useState(false);
  const [threadType, setThreadType] = useState('');
  const [threadText, setThreadText] = useState('');

  // hold mechanic
  const [holdHintVisible, setHoldHintVisible] = useState(false);
  const [rippleActive, setRippleActive] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartedRef = useRef(false);
  const [heldSet, setHeldSet] = useState<Set<string | number>>(new Set());

  // toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // post-submit moment ("someone else was here too")
  const [psm, setPsm] = useState<{ place: string; lines: [string, string, string] } | null>(null);
  const [psmVisible, setPsmVisible] = useState(false);

  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('hr_held') || '[]');
    setHeldSet(new Set(stored));
    fetch('/api/haikus')
      .then(r => r.json())
      .then(d => { if (d.haikus?.length) setPosts(d.haikus); })
      .catch(() => setPosts(SEED_POSTS));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }, []);

  const clearRevealTimers = useCallback(() => {
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
  }, []);

  const triggerReveal = useCallback(() => {
    clearRevealTimers();
    setShowLtag(false); setShowL0(false); setShowL1(false); setShowL2(false);
    setShowAuthor(false); setShowHint(false); setBgVisible(false);

    const t = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      revealTimers.current.push(id);
      return id;
    };
    t(50, () => setBgVisible(true));
    t(180, () => setShowLtag(true));
    t(400, () => setShowL0(true));
    t(760, () => setShowL1(true));
    t(1100, () => setShowL2(true));
    t(1540, () => setShowAuthor(true));
    t(2400, () => setShowHint(true));
  }, [clearRevealTimers]);

  const currentList = journey ? journey.seq : posts;
  const currentPost = currentList[ci];

  const doNavigate = useCallback((newIdx: number, _post: HaikuPost, conn?: string) => {
    setIsTransitioning(true);
    setWipeActive(true);
    setTimeout(() => {
      setCi(newIdx);
      if (conn && conn.length > 0) {
        setThreadType(journey?.type || '');
        setThreadText(conn);
        setThreadVisible(true);
        setTimeout(() => {
          setThreadVisible(false);
          triggerReveal();
        }, 2000);
      } else {
        triggerReveal();
      }
      setWipeActive(false);
      setTimeout(() => setIsTransitioning(false), 420);
    }, 340);
  }, [journey, triggerReveal]);

  const navigate = useCallback((dir: number) => {
    if (isTransitioning) return;
    const list = journey ? journey.seq : posts;
    if (!list.length) return;
    if (journey) {
      const ni = ci + dir;
      if (ni < 0 || ni >= journey.seq.length) {
        if (ni >= journey.seq.length) showToast('end of journey');
        return;
      }
      doNavigate(ni, journey.seq[ni], journey.conn[ni]);
    } else {
      const ni = ((ci + dir) % list.length + list.length) % list.length;
      doNavigate(ni, list[ni]);
    }
  }, [isTransitioning, journey, posts, ci, doNavigate, showToast]);

  useEffect(() => {
    if (posts.length > 0 && !journey) triggerReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  useEffect(() => {
    if (journey) triggerReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey]);

  // keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate(-1);
      if (e.key === 'Escape') { setMapOpen(false); setSubmitOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  // swipe
  useEffect(() => {
    let tx: number | null = null;
    const onStart = (e: TouchEvent) => {
      if (mapOpen) return;
      tx = e.touches[0].clientX;
    };
    const onEnd = (e: TouchEvent) => {
      if (tx === null) return;
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
      tx = null;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd); };
  }, [navigate, mapOpen]);

  // hold mechanic
  const startHold = useCallback(() => {
    holdStartedRef.current = false;
    setHoldHintVisible(true);
    holdTimerRef.current = setTimeout(() => {
      holdStartedRef.current = true;
      const p = currentPost;
      if (p && !heldSet.has(p.id)) {
        const newSet = new Set(heldSet);
        newSet.add(p.id);
        setHeldSet(newSet);
        localStorage.setItem('hr_held', JSON.stringify([...newSet]));
        fetch('/api/holds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ haiku_id: p.id }) }).catch(() => {});
      }
      setRippleActive(true);
      setTimeout(() => setRippleActive(false), 800);
      setHoldHintVisible(false);
      showToast('remembered');
    }, 800);
  }, [currentPost, heldSet, showToast]);

  const endHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (!holdStartedRef.current) setHoldHintVisible(false);
  }, []);

  const handlePlaceClick = useCallback(async (placeName: string) => {
    setMapOpen(false);
    setJourneyLoading(true);
    try {
      const res = await fetch('/api/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts, placeName }),
      });
      const data = await res.json();
      const seq = (data.seq || [])
        .map((id: string | number) => posts.find((p: HaikuPost) => String(p.id) === String(id)))
        .filter(Boolean) as HaikuPost[];
      if (seq.length === 0) throw new Error('empty');
      setJourney({ seq, conn: data.conn || [], type: data.type });
      setCi(0);
    } catch {
      const shuffled = [...posts].sort(() => Math.random() - 0.5).slice(0, Math.min(6, posts.length));
      const bridges = ['the thread continues', 'another voice, same sky', 'silence answered', 'the mood deepens', 'worlds apart, same ache'];
      setJourney({
        seq: shuffled,
        conn: shuffled.map((_, i) => i === 0 ? '' : bridges[i - 1] || 'the thread continues'),
        type: 'emotional resonance',
      });
      setCi(0);
    } finally {
      setJourneyLoading(false);
    }
  }, [posts]);

  const exitJourney = useCallback(() => {
    setJourney(null);
    setCi(0);
    triggerReveal();
  }, [triggerReveal]);

  const placeCount = new Set(posts.map((p: HaikuPost) => getPlace(p)).filter(Boolean)).size;

  const bgSrc = currentPost ? getBg(currentPost) : '';
  const lines = currentPost ? getLines(currentPost) : ['', '', ''];
  const locationText = currentPost ? getCity(currentPost) : '';
  const authorText = currentPost ? `— ${currentPost.author || 'anonymous'}` : '';

  const journeyProgress = journey ? ((ci + 1) / journey.seq.length * 100) : 0;

  return (
    <>
      {/* Wipe transition */}
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--parchment-2)', zIndex: 50,
        opacity: wipeActive ? 1 : 0, pointerEvents: wipeActive ? 'all' : 'none',
        transition: 'opacity 0.38s ease',
      }} />

      {/* Stage */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <img
          src={bgSrc || undefined}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: bgVisible ? 1 : 0, transition: 'opacity 1.4s ease',
            filter: 'saturate(0.6) brightness(1.12) contrast(0.88)',
          }}
        />
        {/* Parchment wash — z-index 1, above photo */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to top, rgba(245,240,232,0.97) 0%, rgba(245,240,232,0.88) 22%, rgba(245,240,232,0.62) 48%, rgba(245,240,232,0.2) 72%, rgba(245,240,232,0.04) 100%)',
        }} />
      </div>

      {/* Wordmark */}
      <div style={{ position: 'fixed', top: 30, left: 36, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5 }}>
        <span style={{ fontFamily: "'Zen Old Mincho', serif", fontSize: 13, color: 'var(--ink)', opacity: 0.5, letterSpacing: '0.38em', textTransform: 'uppercase' }}>Haiku</span>
        <div style={{ width: 24, height: 1, background: 'var(--gold)', opacity: 0.6 }} />
        <span style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 10, color: 'var(--ink-soft)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Review</span>
      </div>

      {/* Submit button */}
      <div style={{ position: 'fixed', top: 28, right: 36, zIndex: 100 }}>
        <button className="cb-submit" onClick={() => setSubmitOpen(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Shippori Mincho', serif",
          fontSize: 11, color: 'var(--ink-soft)', opacity: 0.65, transition: 'opacity 0.2s',
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>+ Submit</button>
      </div>

      {/* Collection info */}
      <div className="collection-info" style={{
        position: 'fixed', top: '50%', right: 32, transform: 'translateY(-50%)', zIndex: 10,
        writingMode: 'vertical-rl', fontFamily: "'Shippori Mincho', serif", fontSize: 9,
        letterSpacing: '0.25em', color: 'var(--ink-faint)', opacity: 0.5, textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 1, height: 28, background: 'var(--gold)', opacity: 0.4, flexShrink: 0 }} />
        {posts.length} haikus · {placeCount} places
      </div>

      {/* Journey progress bar — always in DOM, fades in/out */}
      <div style={{
        position: 'fixed', top: 0, left: 0, zIndex: 200, height: 2,
        background: 'var(--gold)', opacity: journey ? 0.45 : 0,
        width: journey ? `${journeyProgress}%` : '0%',
        transition: 'width 0.6s ease, opacity 0.4s', pointerEvents: 'none',
      }} />

      {/* Thread label */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 15, pointerEvents: 'none', textAlign: 'center',
        opacity: threadVisible ? 1 : 0, transition: 'opacity 0.6s',
      }}>
        <span style={{ display: 'block', fontFamily: "'Shippori Mincho', serif", fontSize: 9, letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 8, opacity: 0.9 }}>{threadType}</span>
        <span style={{ display: 'block', fontFamily: "'Shippori Mincho', serif", fontSize: 12, letterSpacing: '0.18em', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>{threadText}</span>
      </div>

      {/* Hold ring */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 12, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', border: '1px solid var(--gold)',
          position: 'absolute', opacity: 0, transform: 'scale(0.5)',
          animation: rippleActive ? 'ripout 0.7s ease-out forwards' : 'none',
        }} />
      </div>
      <style>{`@keyframes ripout{0%{opacity:0.5;transform:scale(0.5);}100%{opacity:0;transform:scale(2.8);}}`}</style>

      {/* Journey loading */}
      {journeyLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(245,240,232,0.88)', backdropFilter: 'blur(12px)',
          flexDirection: 'column', gap: 16,
        }}>
          <span style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ink-soft)', opacity: 0.7 }}>Finding connections</span>
          <div style={{ width: 48, height: 1, background: 'var(--gold)', animation: 'jlp 1.5s ease-in-out infinite' }} />
          <style>{`@keyframes jlp{0%,100%{opacity:0.2;width:20px;}50%{opacity:1;width:56px;}}`}</style>
        </div>
      )}

      {/* Haiku stage — hold mechanic targets this whole div */}
      <div
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10,
          padding: '0 60px 58px 52px', pointerEvents: 'auto',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        {/* Location tag */}
        <div
          className="ltag"
          onClick={() => setMapOpen(true)}
          style={{
            fontFamily: "'Shippori Mincho', serif", fontSize: 10, color: 'var(--ink-soft)',
            opacity: showLtag ? 0.68 : 0, marginBottom: 16,
            display: 'inline-flex', alignItems: 'center', gap: 10,
            transition: 'opacity 0.9s', letterSpacing: '0.28em', textTransform: 'uppercase',
            cursor: 'pointer', pointerEvents: 'all',
          }}
        >
          <div className="ltag-rule" style={{ width: 20, height: 1, background: 'var(--gold)', flexShrink: 0, opacity: 0.9 }} />
          {locationText}
          <span className="ltag-arrow" style={{ opacity: 0, marginLeft: -4 }}>›</span>
        </div>

        {/* Haiku lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
          <div style={{
            fontFamily: "'Shippori Mincho', serif", color: 'var(--ink)',
            opacity: showL0 ? 1 : 0, transform: showL0 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)',
            lineHeight: 1.2, display: 'block', whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(245,240,232,0.55)',
            fontSize: 'clamp(22px, 3vw, 42px)', fontWeight: 500,
          }}>{lines[0]}</div>
          <div style={{
            fontFamily: "'Shippori Mincho', serif", color: 'var(--ink)',
            opacity: showL1 ? 1 : 0, transform: showL1 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)',
            lineHeight: 1.2, display: 'block', whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(245,240,232,0.55)',
            fontSize: 'clamp(19px, 2.6vw, 37px)', fontWeight: 400,
            paddingLeft: 'clamp(10px, 1.4vw, 20px)',
          }}>{lines[1]}</div>
          <div style={{
            fontFamily: "'Shippori Mincho', serif", color: 'var(--ink)',
            opacity: showL2 ? 1 : 0, transform: showL2 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)',
            lineHeight: 1.2, display: 'block', whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(245,240,232,0.55)',
            fontSize: 'clamp(17px, 2.3vw, 33px)', fontWeight: 400,
            paddingLeft: 'clamp(20px, 2.8vw, 38px)',
          }}>{lines[2]}</div>
        </div>

        {/* Author */}
        <div style={{
          fontFamily: "'Shippori Mincho', serif", fontSize: 11, color: 'var(--ink-soft)',
          opacity: showAuthor ? 0.5 : 0, transition: 'opacity 0.8s',
          letterSpacing: '0.2em', whiteSpace: 'nowrap', marginBottom: 8,
        }}>{authorText}</div>

        {/* Hold hint embedded in stage */}
        <div style={{
          fontFamily: "'Shippori Mincho', serif", fontSize: 9, color: 'var(--ink-faint)',
          opacity: showHint ? 0.32 : 0, transition: 'opacity 1s',
          letterSpacing: '0.18em', textTransform: 'uppercase', pointerEvents: 'none',
        }}>hold anywhere · to remember this</div>
      </div>

      {/* Hold hint overlay — appears immediately on press start */}
      <div style={{
        position: 'fixed', bottom: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 12,
        pointerEvents: 'none', fontFamily: "'Shippori Mincho', serif", fontSize: 9,
        letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)',
        opacity: holdHintVisible ? 0.65 : 0, transition: 'opacity 0.3s', whiteSpace: 'nowrap',
      }}>hold to remember</div>

      {/* Nav */}
      <div style={{
        position: 'fixed', left: '50%', bottom: 30, transform: 'translateX(-50%)',
        zIndex: 20, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <button className="nb" onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
          color: 'var(--ink-soft)', opacity: 0.38,
          display: 'flex', alignItems: 'center', gap: 7,
          fontFamily: "'Shippori Mincho', serif", fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>
          <svg className="nb-al" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          prev
        </button>
        <div style={{ width: 1, height: 14, background: 'var(--gold)', opacity: 0.3 }} />
        <button className="nb" onClick={() => navigate(1)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
          color: 'var(--ink-soft)', opacity: 0.38,
          display: 'flex', alignItems: 'center', gap: 7,
          fontFamily: "'Shippori Mincho', serif", fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>
          next
          <svg className="nb-ar" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* Position counter */}
      <div style={{
        position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)',
        fontFamily: "'Shippori Mincho', serif", fontSize: 9, color: 'var(--ink-faint)',
        opacity: 0.5, zIndex: 20, whiteSpace: 'nowrap', letterSpacing: '0.28em',
      }}>
        {journey
          ? `${ci + 1} of ${journey.seq.length} · ${journey.type}`
          : `${ci + 1} — ${posts.length}`
        }
      </div>

      {/* Journey exit button */}
      {journey && (
        <button className="jexit-btn" onClick={exitJourney} style={{
          position: 'fixed', left: 36, bottom: 30, zIndex: 20,
          background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer',
          fontFamily: "'Shippori Mincho', serif", fontSize: 10, color: 'var(--ink-soft)',
          letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.5,
          display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.4s',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          all haikus
        </button>
      )}

      {/* Toast */}
      <div style={{
        position: 'fixed', top: 28, left: '50%',
        transform: `translateX(-50%) translateY(${toastVisible ? 0 : -14}px)`,
        background: 'var(--parchment)', border: '1px solid rgba(30,26,20,0.1)',
        boxShadow: '0 4px 20px rgba(30,26,20,0.09)', padding: '8px 24px',
        fontFamily: "'Shippori Mincho', serif", fontSize: 11, letterSpacing: '0.25em',
        textTransform: 'uppercase', color: 'var(--ink-soft)',
        opacity: toastVisible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        zIndex: 1000, pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>{toastMsg}</div>

      {/* Map overlay */}
      <MapOverlay open={mapOpen} posts={posts} onClose={() => setMapOpen(false)} onPlaceSelect={handlePlaceClick} />

      {/* Submit panel */}
      <SubmitPanel
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onError={showToast}
        onSubmitted={(newPost, prevHaiku) => {
          setPosts(prev => [newPost, ...prev]);
          setSubmitOpen(false);
          setJourney(null);
          const placeName = getPlace(newPost);
          const localPrev = prevHaiku || posts.find(p => getPlace(p) === placeName && p.id !== newPost.id);
          if (localPrev) {
            clearRevealTimers();
            setShowLtag(false); setShowL0(false); setShowL1(false); setShowL2(false);
            setShowAuthor(false); setShowHint(false);
            setPsm({ place: placeName, lines: getLines(localPrev) });
            setPsmVisible(true);
            setTimeout(() => {
              setPsmVisible(false);
              setTimeout(() => {
                setPsm(null);
                setCi(0);
                triggerReveal();
              }, 500);
            }, 3500);
          } else {
            showToast('published');
            setCi(0);
            triggerReveal();
          }
        }}
      />

      {/* Post-submit moment — "someone else was here too" */}
      {psm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 310, display: 'flex',
          alignItems: 'flex-end', justifyContent: 'flex-start',
          padding: '0 0 80px 52px', background: 'rgba(245,240,232,0.0)',
          pointerEvents: 'none', opacity: psmVisible ? 1 : 0, transition: 'opacity 0.5s',
        }}>
          <div style={{ pointerEvents: 'none' }}>
            <div style={{
              fontFamily: "'Shippori Mincho', serif", fontSize: 10, letterSpacing: '0.28em',
              textTransform: 'uppercase', color: 'var(--ink-soft)', opacity: 0.6,
              marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ display: 'block', width: 20, height: 1, background: 'var(--gold)' }} />
              {psm.place}
            </div>
            <div style={{
              fontFamily: "'Shippori Mincho', serif", color: 'var(--ink)',
              fontSize: 'clamp(18px, 2.5vw, 32px)', lineHeight: 1.3, fontStyle: 'italic',
              whiteSpace: 'pre-line',
            }}>{psm.lines.join('\n')}</div>
          </div>
        </div>
      )}
    </>
  );
}
