'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSvgScene, SEED_POSTS, type SeedPost } from '@/lib/seed-data';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import MapOverlay from '@/components/MapOverlay';
import SubmitPanel from '@/components/SubmitPanel';
import YourHaikus from '@/components/YourHaikus';
import TimelineSlider from '@/components/TimelineSlider';

type HaikuPost = {
  id: string | number;
  place_id?: string;
  created_at?: string;
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
  places?: { id?: string; name: string; city: string | null; lat?: number | null; lng?: number | null };
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

function getLocationLabel(p: HaikuPost): string {
  const place = getPlace(p);
  const city = p.places?.city || p.city || '';
  if (place && city && place !== city) return `${place} · ${city}`;
  return place || city;
}

function getBg(p: HaikuPost): string {
  if (p.photo_url) return p.photo_url;
  if (p.scene) return getSvgScene(p.scene);
  return getSvgScene('kyoto');
}

// Suppress unused warning for SeedPost — it's used via type import for SEED_POSTS
type _SeedPostRef = SeedPost;
// Suppress unused warning for getCity — used indirectly
type _getCityRef = typeof getCity;

const BRIDGES = ['the thread continues', 'another voice, same sky', 'silence answered', 'the mood deepens', 'worlds apart, same ache'];

// One haiku per place — the most recent (highest created_at). Journey always shows the "now".
function mostRecentPerPlace(posts: HaikuPost[]): HaikuPost[] {
  const map = new Map<string, HaikuPost>();
  for (const p of posts) {
    const key = p.place_id || getPlace(p);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing || (p.created_at || '') > (existing.created_at || '')) {
      map.set(key, p);
    }
  }
  return Array.from(map.values());
}

async function buildJourneyFromPool(haikus: HaikuPost[], placeName?: string): Promise<Journey> {
  const pool = mostRecentPerPlace(haikus);
  try {
    const res = await fetch('/api/journey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts: pool, placeName: placeName || '' }),
    });
    const data = await res.json();
    const seq = (data.seq || [])
      .map((id: string | number) => pool.find((p: HaikuPost) => String(p.id) === String(id)))
      .filter(Boolean) as HaikuPost[];
    if (seq.length === 0) throw new Error('empty');
    return { seq, conn: data.conn || [], type: data.type };
  } catch {
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(6, pool.length));
    return {
      seq: shuffled,
      conn: shuffled.map((_, i) => i === 0 ? '' : BRIDGES[i - 1] || 'the thread continues'),
      type: 'emotional resonance',
    };
  }
}

export default function Home() {
  const [posts, setPosts] = useState<HaikuPost[]>([]);
  const [ci, setCi] = useState(0);
  const [appReady, setAppReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wipeActive, setWipeActive] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [yourHaikusOpen, setYourHaikusOpen] = useState(false);
  const [journey, setJourney] = useState<Journey | null>(null);

  // The current global (full-pool) journey — restored when exiting a place journey
  const globalJourneyRef = useRef<Journey | null>(null);
  // Pre-built next journey, ready to load seamlessly at end of current
  const nextJourneyRef = useRef<Journey | null>(null);
  const journeyBuildingRef = useRef(false);
  // Mirrors ci — lets timeline callbacks read the current journey index without stale closures
  const journeyIndexRef = useRef(0);
  // CSS 3D curl state — set on navigate, cleared by onAnimationEnd
  const [curlState, setCurlState] = useState<{ direction: 'forward' | 'backward'; bgSrc: string } | null>(null);
  // Timeline vertical slide state — exit overlay slides out, enter class applied to haiku stage slides in
  const [timelineSlideState, setTimelineSlideState] = useState<{ exitClass: string; enterClass: string; bgSrc: string } | null>(null);
  // Ref so doNavigate/doTimelineNavigate captures current bgSrc without stale closure
  const bgSrcRef = useRef('');

  // Timeline slider state
  const [placeHaikus, setPlaceHaikus] = useState<HaikuPost[]>([]);
  const [placeHaikuIndex, setPlaceHaikuIndex] = useState(0);
  const [inTimelineMode, setInTimelineMode] = useState(false);
  const placeHaikusCacheRef = useRef<{ placeId: string; haikus: HaikuPost[] } | null>(null);

  // reveal states
  const [showLtag, setShowLtag] = useState(false);
  const [showL0, setShowL0] = useState(false);
  const [showL1, setShowL1] = useState(false);
  const [showL2, setShowL2] = useState(false);
  const [showAuthor, setShowAuthor] = useState(false);
  const [bgVisible, setBgVisible] = useState(false);

  // thread type/text kept in state for future left-edge hairline rule — not displayed
  const [threadType, setThreadType] = useState('');
  const [threadText, setThreadText] = useState('');

  // hold mechanic
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartedRef = useRef(false);
  const rippleRef = useRef<HTMLDivElement>(null);
  const [heldSet, setHeldSet] = useState<Set<string | number>>(new Set());

  // toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // post-submit moment ("someone else was here too")
  const [psm, setPsm] = useState<{ place: string; lines: [string, string, string] } | null>(null);
  const [psmVisible, setPsmVisible] = useState(false);

  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    setShowAuthor(false); setBgVisible(false);

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
  }, [clearRevealTimers]);

  // Atmospheric open: fetch haikus + build initial journey, then reveal after rule animation
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('hr_held') || '[]');
    setHeldSet(new Set(stored));

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('haikus') === 'mine') {
        setYourHaikusOpen(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    // Rule draws for 800ms then fades 400ms — hold reveal until both data and animation are done
    const ruleReady = new Promise<void>(resolve => setTimeout(resolve, 1200));

    const dataReady: Promise<Journey> = fetch('/api/haikus')
      .then(r => r.json())
      .then(async (d) => {
        const haikus: HaikuPost[] = d.haikus?.length ? d.haikus : SEED_POSTS;
        setPosts(haikus);
        return buildJourneyFromPool(haikus);
      })
      .catch(async () => {
        setPosts(SEED_POSTS);
        return buildJourneyFromPool(SEED_POSTS);
      });

    Promise.all([dataReady, ruleReady]).then(([j]) => {
      globalJourneyRef.current = j;
      setJourney(j);
      setCi(0);
      setAppReady(true);
      triggerReveal();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-build the next journey when reader reaches the last haiku in the current sequence
  useEffect(() => {
    if (!journey || !appReady || journeyBuildingRef.current || nextJourneyRef.current) return;
    if (ci < journey.seq.length - 1) return;
    journeyBuildingRef.current = true;
    buildJourneyFromPool(posts).then(j => {
      nextJourneyRef.current = j;
      journeyBuildingRef.current = false;
    });
  }, [ci, journey, posts, appReady]);

  // Keep journeyIndexRef in sync with ci state
  useEffect(() => { journeyIndexRef.current = ci; }, [ci]);

  // Fetch all haikus at the current journey post's place when place changes.
  // Cache by place_id — only fetches on place change, uses cache for same-place navigation.
  const journeyPost = journey ? journey.seq[ci] : undefined;
  useEffect(() => {
    if (!journeyPost?.place_id) { setPlaceHaikus([]); return; }
    const placeId = journeyPost.place_id;
    const postId = journeyPost.id;

    if (placeHaikusCacheRef.current?.placeId === placeId) {
      // Same place — journey post is the most recent; position thumb at the end (present)
      const cached = placeHaikusCacheRef.current.haikus;
      const idx = cached.findIndex(h => String(h.id) === String(postId));
      setPlaceHaikuIndex(idx >= 0 ? idx : cached.length - 1);
      return;
    }

    // New place — exit timeline mode and fetch fresh
    setInTimelineMode(false);
    setPlaceHaikus([]);
    const client = createSupabaseClient();
    (async () => {
      try {
        const { data } = await client
          .from('haikus')
          .select('*, places(name, city)')
          .eq('place_id', placeId)
          .order('created_at', { ascending: true });
        const haikus = (data || []) as HaikuPost[];
        placeHaikusCacheRef.current = { placeId, haikus };
        setPlaceHaikus(haikus);
        // Journey always shows most recent — thumb starts at the bottom (present)
        const idx = haikus.findIndex(h => String(h.id) === String(postId));
        setPlaceHaikuIndex(idx >= 0 ? idx : haikus.length - 1);
      } catch {
        setPlaceHaikus([]); setPlaceHaikuIndex(0);
      }
    })();
  }, [journeyPost?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timeline mode: displayed post comes from the place's full chronological list
  const currentPost = inTimelineMode
    ? (placeHaikus[placeHaikuIndex] as HaikuPost | undefined)
    : journeyPost;

  // CSS 3D curl + reveal a new journey haiku. Always clears timeline mode.
  // direction: 'forward' = swipe left/next, 'backward' = swipe right/prev.
  const doNavigate = useCallback((newIdx: number, conn?: string, journeyType?: string, direction: 'forward' | 'backward' = 'forward') => {
    if (conn) setThreadText(conn);
    if (journeyType) setThreadType(journeyType);
    setInTimelineMode(false);
    setIsTransitioning(true);
    setCurlState({ direction, bgSrc: bgSrcRef.current });
    setTimeout(() => {
      setCi(newIdx);
      triggerReveal();
    }, 210);
    setTimeout(() => setIsTransitioning(false), 430);
  }, [triggerReveal]);

  // Vertical card slide + show a different haiku from the same place (enters/stays in timeline mode).
  // direction: -1 = going to older haiku (exit up, enter from bottom)
  //            +1 = going to newer haiku (exit down, enter from top)
  const doTimelineNavigate = useCallback((newPlaceIdx: number, direction: 1 | -1) => {
    const exitClass = direction === -1 ? 'timeline-exit-up' : 'timeline-exit-down';
    const enterClass = direction === -1 ? 'timeline-enter-from-bottom' : 'timeline-enter-from-top';
    setIsTransitioning(true);
    setTimelineSlideState({ exitClass, enterClass, bgSrc: bgSrcRef.current });
    setTimeout(() => {
      setPlaceHaikuIndex(newPlaceIdx);
      setInTimelineMode(true);
      triggerReveal();
    }, 160);
    setTimeout(() => setIsTransitioning(false), 330);
  }, [triggerReveal]);

  // Core journey navigation — no isTransitioning guard so timeline boundary exits are seamless.
  // Reads journeyIndexRef so callers don't need ci in their closure.
  const advanceJourney = useCallback((dir: 1 | -1) => {
    if (!appReady || !journey) return;
    const direction = dir === 1 ? 'forward' : 'backward';
    const ni = journeyIndexRef.current + dir;
    if (ni < 0) return;
    if (ni >= journey.seq.length) {
      if (nextJourneyRef.current) {
        const newJ = nextJourneyRef.current;
        nextJourneyRef.current = null;
        globalJourneyRef.current = newJ;
        setJourney(newJ);
        doNavigate(0, '', newJ.type, direction);
      } else {
        setIsTransitioning(true);
        setWipeActive(true);
        const poll = () => {
          if (nextJourneyRef.current) {
            const newJ = nextJourneyRef.current;
            nextJourneyRef.current = null;
            globalJourneyRef.current = newJ;
            setJourney(newJ);
            setCi(0);
            journeyIndexRef.current = 0;
            setWipeActive(false);
            triggerReveal();
            setTimeout(() => setIsTransitioning(false), 420);
          } else {
            setTimeout(poll, 100);
          }
        };
        setTimeout(poll, 340);
      }
      return;
    }
    doNavigate(ni, journey.conn[ni], journey.type, direction);
  }, [appReady, journey, doNavigate, triggerReveal]);

  // Exit timeline mode.
  //   journeyDir = 0  → wipe back to current journey haiku ("← back to journey" button)
  //   journeyDir = 1  → advance to next journey haiku (swiped past newest place haiku)
  //   journeyDir = -1 → go to prev journey haiku (swiped past oldest place haiku)
  const doTimelineReturn = useCallback((journeyDir: 0 | 1 | -1 = 0) => {
    clearRevealTimers();
    setInTimelineMode(false);
    if (journeyDir !== 0) {
      advanceJourney(journeyDir);
    } else {
      setIsTransitioning(true);
      setWipeActive(true);
      setTimeout(() => {
        triggerReveal();
        setWipeActive(false);
        setTimeout(() => setIsTransitioning(false), 420);
      }, 340);
    }
  }, [clearRevealTimers, advanceJourney, triggerReveal]);

  // Called from TimelineSlider onSelect — enters timeline mode when user picks a different tick.
  const handleTimelineSelect = useCallback((index: number) => {
    if (!inTimelineMode && index === placeHaikuIndex) {
      // Tapped the tick for the current (most recent) haiku — arm timeline mode, no wipe
      setInTimelineMode(true);
      return;
    }
    const dir = index > placeHaikuIndex ? 1 : -1;
    doTimelineNavigate(index, dir);
  }, [inTimelineMode, placeHaikuIndex, doTimelineNavigate]);

  // Navigation within the place timeline.
  //   dir = +1: forward in time (toward present / newer). Boundary → advance AI journey.
  //   dir = -1: back in time (toward past / older).    Boundary → prev AI journey haiku.
  const navigateTimeline = useCallback((dir: 1 | -1) => {
    const ni = placeHaikuIndex + dir;
    if (ni >= placeHaikus.length) { doTimelineReturn(1); return; }
    if (ni < 0) { doTimelineReturn(-1); return; }
    if (isTransitioning) return;
    doTimelineNavigate(ni, dir);
  }, [isTransitioning, placeHaikuIndex, placeHaikus.length, doTimelineNavigate, doTimelineReturn]);

  // Journey navigation — isTransitioning guard lives here; advanceJourney is the unguarded core.
  const navigate = useCallback((dir: 1 | -1) => {
    if (isTransitioning || !appReady) return;
    advanceJourney(dir);
  }, [isTransitioning, appReady, advanceJourney]);

  // Keyboard nav:
  //   ArrowRight = swipe left = next haiku / forward in time (+1)
  //   ArrowLeft  = swipe right = prev haiku / back in time  (-1)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (inTimelineMode) navigateTimeline(1); else navigate(1);
      } else if (e.key === 'ArrowLeft') {
        if (inTimelineMode) navigateTimeline(-1); else navigate(-1);
      } else if (e.key === 'Escape') {
        setMapOpen(false); setSubmitOpen(false); setYourHaikusOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, navigateTimeline, inTimelineMode]);

  // Swipe nav:
  //   dx < 0 (finger moves left)  = next haiku / forward in time (+1)
  //   dx > 0 (finger moves right) = prev haiku / back in time   (-1)
  useEffect(() => {
    let startX: number | null = null;
    const onStart = (e: TouchEvent) => {
      if (mapOpen) return;
      startX = e.touches[0].clientX;
    };
    const onEnd = (e: TouchEvent) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) < 30) return;
      const dir = (dx < 0 ? 1 : -1) as 1 | -1;
      if (inTimelineMode) navigateTimeline(dir); else navigate(dir);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [navigate, navigateTimeline, inTimelineMode, mapOpen]);

  // hold mechanic
  const fireRipple = useCallback(() => {
    const el = rippleRef.current;
    if (!el) return;
    el.classList.remove('ripple-go');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add('ripple-go');
  }, []);

  const startHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdStartedRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      holdStartedRef.current = true;
      const p = currentPost;
      if (p && !heldSet.has(p.id)) {
        const newSet = new Set(heldSet);
        newSet.add(p.id);
        setHeldSet(newSet);
        localStorage.setItem('hr_held', JSON.stringify([...newSet]));
        fetch('/api/holds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ haiku_id: p.id }),
        }).catch(() => {});
      }
      fireRipple();
      showToast('remembered');
    }, 800);
  }, [currentPost, heldSet, showToast, fireRipple]);

  const endHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
  }, []);

  // Map dot click: build a place-seeded journey; exit restores the global one
  const handlePlaceClick = useCallback(async (placeName: string) => {
    setMapOpen(false);
    setIsTransitioning(true);
    setWipeActive(true);
    try {
      const j = await buildJourneyFromPool(posts, placeName);
      setJourney(j);
      setCi(0);
      setWipeActive(false);
      setTimeout(() => setIsTransitioning(false), 420);
      triggerReveal();
    } catch {
      setWipeActive(false);
      setTimeout(() => setIsTransitioning(false), 420);
    }
  }, [posts, triggerReveal]);

  const exitJourney = useCallback(() => {
    const global = globalJourneyRef.current;
    if (global) {
      setJourney(global);
      setCi(0);
      triggerReveal();
    }
  }, [triggerReveal]);

  const placeCount = new Set(posts.map((p: HaikuPost) => getPlace(p)).filter(Boolean)).size;

  const bgSrc = currentPost ? getBg(currentPost) : '';
  bgSrcRef.current = bgSrc;
  const lines = currentPost ? getLines(currentPost) : ['', '', ''];
  const locationText = currentPost ? getLocationLabel(currentPost) : '';
  const authorText = currentPost ? `— ${currentPost.author || 'anonymous'}` : '';

  const journeyProgress = journey ? ((ci + 1) / journey.seq.length * 100) : 0;

  // Exit button only appears during a place-specific journey (from map), not the global one
  const isPlaceJourney = journey && journey !== globalJourneyRef.current;

  // Slider visible when the current place has 2+ haikus and app is ready
  const sliderVisible = appReady && placeHaikus.length >= 2;

  // Suppress unused warning — stored for future hairline rule feature
  void threadType; void threadText;

  return (
    <>
      {/* Wipe transition — used for timeline navigation and edge cases */}
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--parchment-2)', zIndex: 49,
        opacity: wipeActive ? 1 : 0, pointerEvents: wipeActive ? 'all' : 'none',
        transition: 'opacity 0.38s ease',
      }} />

      {/* Clip-path diagonal peel — fires on journey navigation, clears when animation ends */}
      {curlState && (
        <div
          className={curlState.direction === 'forward' ? 'page-curl-exit-forward' : 'page-curl-exit-backward'}
          style={{
            backgroundImage: curlState.bgSrc ? `url(${curlState.bgSrc})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: 'var(--parchment)',
            filter: curlState.bgSrc
              ? 'saturate(0.6) brightness(1.12) contrast(0.88)'
              : undefined,
          }}
          onAnimationEnd={() => setCurlState(null)}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(245,240,232,0.97) 0%, rgba(245,240,232,0.88) 22%, rgba(245,240,232,0.62) 48%, rgba(245,240,232,0.2) 72%, rgba(245,240,232,0.04) 100%)',
            zIndex: 1,
          }} />
        </div>
      )}

      {/* Timeline vertical slide — exit overlay peels the departing card up or down */}
      {timelineSlideState && (
        <div
          className={timelineSlideState.exitClass}
          style={{
            backgroundImage: timelineSlideState.bgSrc ? `url(${timelineSlideState.bgSrc})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: 'var(--parchment)',
            filter: timelineSlideState.bgSrc ? 'saturate(0.6) brightness(1.12) contrast(0.88)' : undefined,
          }}
          onAnimationEnd={() => setTimelineSlideState(null)}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(245,240,232,0.97) 0%, rgba(245,240,232,0.88) 22%, rgba(245,240,232,0.62) 48%, rgba(245,240,232,0.2) 72%, rgba(245,240,232,0.04) 100%)',
            zIndex: 1,
          }} />
        </div>
      )}

      {/* Atmospheric open — gold rule draws left to right (800ms), then fades (400ms) */}
      {!appReady && (
        <div className="open-rule" style={{
          position: 'fixed', top: '50%', left: 0, zIndex: 300,
          height: 1, background: '#8a6a2a', pointerEvents: 'none',
        }} />
      )}

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
      <div className="wordmark" style={{ position: 'fixed', top: 30, left: 36, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5 }}>
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
          minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center',
        }}>+ Submit</button>
      </div>

      {/* Collection info — moved to left side to clear the right-edge timeline slider */}
      <div className="collection-info" style={{
        position: 'fixed', top: '50%', left: 32, transform: 'translateY(-50%)', zIndex: 10,
        writingMode: 'vertical-rl', fontFamily: "'Shippori Mincho', serif", fontSize: 9,
        letterSpacing: '0.25em', color: 'var(--ink-faint)',
        opacity: appReady ? 0.5 : 0, transition: 'opacity 0.6s',
        textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 1, height: 28, background: 'var(--gold)', opacity: 0.4, flexShrink: 0 }} />
        {posts.length} haikus · {placeCount} places
      </div>

      {/* Journey progress bar — always visible once ready */}
      <div style={{
        position: 'fixed', top: 0, left: 0, zIndex: 200, height: 2,
        background: 'var(--gold)', opacity: appReady ? 0.45 : 0,
        width: journey ? `${journeyProgress}%` : '0%',
        transition: 'width 0.6s ease, opacity 0.4s', pointerEvents: 'none',
      }} />

      {/* Hold ring — ref-based animation for reliable restart */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 12, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div ref={rippleRef} className="hold-ripple" />
      </div>

      {/* Timeline slider — right edge, fades in when place has 2+ haikus */}
      <TimelineSlider
        placeHaikus={placeHaikus}
        activeIndex={placeHaikuIndex}
        onSelect={handleTimelineSelect}
        onReturnToJourney={() => doTimelineReturn(0)}
        visible={sliderVisible}
      />

      {/* Haiku stage — hold mechanic targets this whole div */}
      <div
        className={`haiku-stage${timelineSlideState ? ` ${timelineSlideState.enterClass}` : ''}`}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        onTouchCancel={endHold}
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
            transition: showLtag ? 'opacity 0.9s' : 'none', letterSpacing: '0.28em', textTransform: 'uppercase',
            cursor: 'pointer', pointerEvents: 'all', minHeight: 44,
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
            transition: showL0 ? 'opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)' : 'none',
            lineHeight: 1.2, display: 'block', whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(245,240,232,0.55)',
            fontSize: 'clamp(22px, 3vw, 42px)', fontWeight: 500,
          }}>{lines[0]}</div>
          <div style={{
            fontFamily: "'Shippori Mincho', serif", color: 'var(--ink)',
            opacity: showL1 ? 1 : 0, transform: showL1 ? 'translateY(0)' : 'translateY(12px)',
            transition: showL1 ? 'opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)' : 'none',
            lineHeight: 1.2, display: 'block', whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(245,240,232,0.55)',
            fontSize: 'clamp(19px, 2.6vw, 37px)', fontWeight: 400,
            paddingLeft: 'clamp(10px, 1.4vw, 20px)',
          }}>{lines[1]}</div>
          <div style={{
            fontFamily: "'Shippori Mincho', serif", color: 'var(--ink)',
            opacity: showL2 ? 1 : 0, transform: showL2 ? 'translateY(0)' : 'translateY(12px)',
            transition: showL2 ? 'opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)' : 'none',
            lineHeight: 1.2, display: 'block', whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(245,240,232,0.55)',
            fontSize: 'clamp(17px, 2.3vw, 33px)', fontWeight: 400,
            paddingLeft: 'clamp(20px, 2.8vw, 38px)',
          }}>{lines[2]}</div>
        </div>

        {/* Author */}
        <div style={{
          fontFamily: "'Shippori Mincho', serif", fontSize: 11, color: 'var(--ink-soft)',
          opacity: showAuthor ? 0.5 : 0, transition: showAuthor ? 'opacity 0.8s' : 'none',
          letterSpacing: '0.2em', whiteSpace: 'nowrap', marginBottom: 8,
        }}>{authorText}</div>
      </div>

      {/* Nav — hidden until app is ready */}
      {appReady && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 30, transform: 'translateX(-50%)',
          zIndex: 20, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <button className="nb" onClick={() => inTimelineMode ? navigateTimeline(-1) : navigate(-1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
            color: 'var(--ink-soft)', opacity: 0.38,
            display: 'flex', alignItems: 'center', gap: 7,
            fontFamily: "'Shippori Mincho', serif", fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
            minHeight: 44,
          }}>
            <svg className="nb-al" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            prev
          </button>
          <div style={{ width: 1, height: 14, background: 'var(--gold)', opacity: 0.3 }} />
          <button className="nb" onClick={() => inTimelineMode ? navigateTimeline(1) : navigate(1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
            color: 'var(--ink-soft)', opacity: 0.38,
            display: 'flex', alignItems: 'center', gap: 7,
            fontFamily: "'Shippori Mincho', serif", fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
            minHeight: 44,
          }}>
            next
            <svg className="nb-ar" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}

      {/* Timeline position — only shown in timeline mode */}
      {appReady && inTimelineMode && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)',
          fontFamily: "'Shippori Mincho', serif", fontSize: 9, color: 'var(--ink-faint)',
          opacity: 0.5, zIndex: 20, whiteSpace: 'nowrap', letterSpacing: '0.28em',
        }}>
          {`${placeHaikuIndex + 1} of ${placeHaikus.length} at this place`}
        </div>
      )}

      {/* Journey exit button — only shown during a place-specific journey from map */}
      {appReady && isPlaceJourney && (
        <button className="jexit-btn" onClick={exitJourney} style={{
          position: 'fixed', left: 36, bottom: 30, zIndex: 20,
          background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer',
          fontFamily: "'Shippori Mincho', serif", fontSize: 10, color: 'var(--ink-soft)',
          letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.5,
          display: 'flex', alignItems: 'center', gap: 6,
          minHeight: 44,
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
        onViewYourHaikus={() => { setSubmitOpen(false); setYourHaikusOpen(true); }}
        onSubmitted={(newPost, prevHaiku) => {
          setPosts(prev => [newPost, ...prev]);
          setSubmitOpen(false);
          setInTimelineMode(false);
          setCi(0);
          const placeName = getPlace(newPost);
          const localPrev = prevHaiku || posts.find(p => getPlace(p) === placeName && p.id !== newPost.id);
          if (localPrev) {
            clearRevealTimers();
            setShowLtag(false); setShowL0(false); setShowL1(false); setShowL2(false);
            setShowAuthor(false);
            setPsm({ place: placeName, lines: getLines(localPrev) });
            setPsmVisible(true);
            setTimeout(() => {
              setPsmVisible(false);
              setTimeout(() => {
                setPsm(null);
                triggerReveal();
              }, 500);
            }, 3500);
          } else {
            showToast('published');
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

      {/* Your Haikus — magic-link identity view */}
      <YourHaikus open={yourHaikusOpen} onClose={() => setYourHaikusOpen(false)} />

    </>
  );
}
