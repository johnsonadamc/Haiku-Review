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

// 12 distinct loading paths — cycled sequentially, never repeated back-to-back.
// All paths use cubic bezier C commands only. ViewBox 0 0 400 600.
const LOADING_PATHS: string[] = [
  // 0: River — lazy S from top-left, drifts right, exits bottom-right
  'M 20,60 C 100,20 230,90 260,170 C 290,250 240,330 280,400 C 320,470 420,455 440,540 C 450,585 440,615 450,660',
  // 1: Loop — left-center, broad loop through middle, exits right
  'M 10,280 C 80,195 210,165 290,200 C 370,235 405,325 340,395 C 275,465 145,460 95,390 C 45,320 95,235 205,248 C 305,260 395,300 450,340',
  // 2: Spiral drift — top-center, loose clockwise spiral, exits bottom-left
  'M 210,10 C 315,30 375,115 330,200 C 285,285 165,305 125,248 C 85,190 125,105 210,105 C 290,105 355,180 310,260 C 265,340 155,358 105,315 C 55,272 25,365 10,465 C -5,545 -10,595 -20,645',
  // 3: Mountain — bottom-left, arcs to near top, descends, exits bottom-right
  'M 30,580 C 70,455 115,325 175,215 C 235,105 315,45 335,70 C 355,95 365,175 320,275 C 275,375 205,455 248,535 C 278,590 365,605 450,645',
  // 4: Wander — top-right, drifts unpredictably left and right, exits bottom-left
  'M 380,20 C 305,68 195,58 165,130 C 135,202 210,262 158,322 C 106,382 25,370 48,442 C 71,514 185,522 142,592 C 118,633 45,642 -20,665',
  // 5: Return — starts left, travels far right, curves back, exits left side lower
  'M 10,160 C 105,98 255,88 348,152 C 435,212 465,315 380,385 C 295,455 155,452 75,398 C 25,362 18,432 -20,532',
  // 6: Diagonal — broad sweeping diagonal, two gentle curves, top-left to bottom-right
  'M 20,20 C 115,72 162,172 222,222 C 282,272 365,252 385,335 C 405,415 362,495 402,562 C 422,602 448,628 452,645',
  // 7: Drift up — starts bottom-center, meanders upward with side-to-side curves, exits top
  'M 200,590 C 272,542 335,468 282,408 C 228,348 125,358 148,288 C 172,218 285,198 262,128 C 238,58 148,28 138,-20',
  // 8: Figure — loose figure-8 across the screen, exits bottom-right
  'M 40,40 C 155,8 318,62 322,152 C 326,242 195,292 178,220 C 162,148 252,98 325,142 C 395,182 412,282 342,342 C 272,402 148,402 138,472 C 128,538 202,578 292,598 C 362,612 422,618 452,642',
  // 9: Coastal — top-right, hugs right edge with irregular curves, exits bottom-right
  'M 370,20 C 422,72 442,142 390,202 C 338,262 278,272 312,342 C 342,412 422,422 412,492 C 402,556 328,572 355,628 C 372,662 422,668 452,685',
  // 10: Cross — starts left-center, curves to top-right, back down to bottom-right
  'M -10,300 C 72,228 185,148 272,118 C 362,88 422,122 402,202 C 382,282 268,302 248,382 C 228,462 302,522 382,548 C 422,560 452,570 462,582',
  // 11: Meander — bottom-left, crosses the screen three times, exits top-right
  'M 20,580 C 82,542 205,512 272,450 C 338,388 318,308 228,278 C 138,248 48,288 68,218 C 88,148 222,128 302,170 C 362,202 382,272 308,322 C 235,372 115,362 108,290 C 100,218 192,168 282,148 C 362,130 432,88 452,-20',
];

const THREAD_COLORS: Record<string, string> = {
  'emotional resonance':          '#8b2a1a',
  'time of day':                  '#8a6a2a',
  'the texture of silence':       '#6b6050',
  'figures seen from a distance': '#4a6a7a',
  'the weight of memory':         '#5a4a6a',
  'threshold moments':            '#6a7a4a',
  'what is left unsaid':          '#9e9080',
  'light and its quality':        '#c8a84a',
  'solitude in crowds':           '#6a4a4a',
  'the presence of absence':      '#7a8a8a',
};

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
  const [clientReady, setClientReady] = useState(false); // prevents SSR-rendered overlay (eliminates path flash)
  const [appReady, setAppReady] = useState(false);
  const [qrMode, setQrMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wipeActive, setWipeActive] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [yourHaikusOpen, setYourHaikusOpen] = useState(false);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(true); // starts true; unmounted after initial-load fade

  // The current global (full-pool) journey — restored when exiting a place journey
  const globalJourneyRef = useRef<Journey | null>(null);
  // Pre-built next journey, ready to load seamlessly at end of current
  const nextJourneyRef = useRef<Journey | null>(null);
  const journeyBuildingRef = useRef(false);
  // Pre-built journey when user opens a map dot tooltip — consumed by handlePlaceClick
  const pendingPlaceJourneyRef = useRef<Journey | null>(null);
  const pendingPlaceIdRef = useRef<string | null>(null);
  // Mirrors ci — lets timeline callbacks read the current journey index without stale closures
  const journeyIndexRef = useRef(0);
  // Depth push transition state — set on navigate, cleared after 420ms
  const [depthState, setDepthState] = useState<{ exitClass: string; enterClass: string; bgSrc: string; lines: string[]; locationText: string; authorText: string } | null>(null);
  // Timeline vertical slide state — exit overlay slides out, enter class applied to haiku stage slides in
  const [timelineSlideState, setTimelineSlideState] = useState<{ exitClass: string; enterClass: string; bgSrc: string } | null>(null);
  // Refs so doNavigate captures current card content without stale closures
  const bgSrcRef = useRef('');
  const linesRef = useRef<string[]>(['', '', '']);
  const locationTextRef = useRef('');
  const authorTextRef = useRef('');
  // Loading path index — cycles sequentially through LOADING_PATHS on each overlay mount.
  // Initialized randomly so users see variety across sessions.
  const loadingPathRef = useRef(Math.floor(Math.random() * LOADING_PATHS.length));
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

  // Initial load: fetch haikus and build journey in parallel with the loading animation.
  // setAppReady fires only when BOTH are done — whichever finishes last.
  // QR/place-mode skips the animation wait so content shows as soon as data arrives.
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('hr_held') || '[]');
    setHeldSet(new Set(stored));

    const params = new URLSearchParams(window.location.search);
    if (params.get('haikus') === 'mine') {
      setYourHaikusOpen(true);
    }

    const placeParam = params.get('place');
    if (params.get('haikus') || placeParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (placeParam) setQrMode(true);

    // Two flags — reveal fires when both are true.
    const state = { animComplete: !!placeParam, journey: null as Journey | null };
    const tryReveal = () => {
      if (!state.animComplete || !state.journey) return;
      const j = state.journey;
      globalJourneyRef.current = j;
      setJourney(j);
      setCi(0);
      setAppReady(true);
      triggerReveal();
    };

    // Animation gate: 2s minimum before content can reveal.
    // Path-draw animation is 6s but overlay fades out underneath it — looks natural.
    // Immediate in QR/place-mode — no animation wait.
    const animTimer = placeParam ? null : setTimeout(() => {
      state.animComplete = true;
      tryReveal();
    }, 2000);

    // Data fetch fires immediately — not gated on animation or any timer.
    fetch('/api/haikus')
      .then(r => r.json())
      .then(async (d) => {
        const haikus: HaikuPost[] = d.haikus?.length ? d.haikus : SEED_POSTS;
        setPosts(haikus);

        if (placeParam) {
          // QR entry: look up place by google_place_id, build a 3-haiku chronological intro
          try {
            const supabase = createSupabaseClient();
            const { data: placeData } = await supabase
              .from('places')
              .select('id, name')
              .eq('google_place_id', placeParam)
              .maybeSingle();

            if (placeData) {
              const introHaikus = haikus
                .filter(h => h.place_id === placeData.id)
                .sort((a, b) => (a.created_at || '') < (b.created_at || '') ? -1 : 1)
                .slice(0, 3);

              if (introHaikus.length > 0) {
                const introJourney: Journey = {
                  seq: introHaikus,
                  conn: introHaikus.map((_, i) => i === 0 ? '' : BRIDGES[Math.min(i - 1, BRIDGES.length - 1)]),
                  type: 'threshold moments',
                };
                // Pre-build the seeded AI journey — picked up seamlessly at end of intro.
                journeyBuildingRef.current = true;
                buildJourneyFromPool(haikus, placeData.name).then(j => {
                  nextJourneyRef.current = j;
                  journeyBuildingRef.current = false;
                });
                state.journey = introJourney;
                tryReveal();
                return;
              }
            }
          } catch { /* fall through to normal journey */ }
        }

        return buildJourneyFromPool(haikus);
      })
      .then(j => {
        if (!j) return; // QR path already called tryReveal above
        state.journey = j;
        tryReveal();
      })
      .catch(() => {
        setPosts(SEED_POSTS);
        buildJourneyFromPool(SEED_POSTS).then(j => {
          state.journey = j;
          tryReveal();
        });
      });

    return () => { if (animTimer) clearTimeout(animTimer); };
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

  // Gate the loading overlay to client-only — prevents SSR rendering the SVG path and
  // avoids the hydration mismatch flash caused by the random path index.
  useEffect(() => { setClientReady(true); }, []);

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

  // Depth push + reveal a new journey haiku. Always clears timeline mode.
  // direction: 'forward' = swipe left/next, 'backward' = swipe right/prev.
  const doNavigate = useCallback((newIdx: number, conn?: string, journeyType?: string, direction: 'forward' | 'backward' = 'forward') => {
    if (conn) setThreadText(conn);
    if (journeyType) setThreadType(journeyType);
    setInTimelineMode(false);
    setIsTransitioning(true);
    const exitClass = 'depth-exit';
    const enterClass = direction === 'forward' ? 'depth-enter-from-right' : 'depth-enter-from-left';
    setDepthState({
      exitClass, enterClass,
      bgSrc: bgSrcRef.current,
      lines: linesRef.current,
      locationText: locationTextRef.current,
      authorText: authorTextRef.current,
    });
    setCi(newIdx);
    triggerReveal();
    setTimeout(() => {
      setDepthState(null);
      setIsTransitioning(false);
    }, 420);
  }, [triggerReveal]);

  // iOS-style simultaneous push — both cards animate at once, no midpoint swap.
  // direction: -1 = going to older haiku (exit up, enter from bottom)
  //            +1 = going to newer haiku (exit down, enter from top)
  const doTimelineNavigate = useCallback((newPlaceIdx: number, direction: 1 | -1) => {
    const exitClass = direction === -1 ? 'timeline-exit-up' : 'timeline-exit-down';
    const enterClass = direction === -1 ? 'timeline-enter-from-bottom' : 'timeline-enter-from-top';
    setIsTransitioning(true);
    // Capture bgSrc of departing card for the exit overlay before state updates
    setTimelineSlideState({ exitClass, enterClass, bgSrc: bgSrcRef.current });
    // New content renders immediately, pre-rendered beneath the exiting overlay
    setPlaceHaikuIndex(newPlaceIdx);
    setInTimelineMode(true);
    triggerReveal();
    // Clear after both animations finish (exit 320ms + enter 380ms + 30ms delay = ~410ms)
    setTimeout(() => {
      setTimelineSlideState(null);
      setIsTransitioning(false);
    }, 420);
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
        setJourneyLoading(true);
        setOverlayMounted(true);
        const poll = () => {
          if (nextJourneyRef.current) {
            const newJ = nextJourneyRef.current;
            nextJourneyRef.current = null;
            globalJourneyRef.current = newJ;
            setJourney(newJ);
            setCi(0);
            journeyIndexRef.current = 0;
            setJourneyLoading(false);
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
  //   dir = -1: back in time (toward past / older). Clamps at oldest — does nothing at boundary.
  //   dir = +1: forward in time (toward present / newer). Silently exits timeline at newest.
  const navigateTimeline = useCallback((dir: 1 | -1) => {
    if (isTransitioning) return;
    const ni = placeHaikuIndex + dir;
    if (ni < 0) return;
    if (ni >= placeHaikus.length) { setInTimelineMode(false); return; }
    doTimelineNavigate(ni, dir);
  }, [isTransitioning, placeHaikuIndex, placeHaikus.length, doTimelineNavigate]);

  // Journey navigation — isTransitioning guard lives here; advanceJourney is the unguarded core.
  const navigate = useCallback((dir: 1 | -1) => {
    if (isTransitioning || !appReady) return;
    advanceJourney(dir);
  }, [isTransitioning, appReady, advanceJourney]);

  // Keyboard nav:
  //   ArrowLeft/Right = journey nav (always; if in timeline on an older haiku, ignored for journey)
  //   ArrowUp/Down    = timeline nav (only when place has 2+ haikus)
  //   ArrowLeft/Right also allowed in timeline mode only when at the most-recent (journey) haiku
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!appReady || journeyLoading || overlayMounted) return;
      if (e.key === 'ArrowRight') {
        navigate(1);
      } else if (e.key === 'ArrowLeft') {
        navigate(-1);
      } else if (e.key === 'ArrowUp') {
        if (placeHaikus.length > 1) navigateTimeline(-1);
      } else if (e.key === 'ArrowDown') {
        if (placeHaikus.length > 1) navigateTimeline(1);
      } else if (e.key === 'Escape') {
        setMapOpen(false); setSubmitOpen(false); setYourHaikusOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [appReady, journeyLoading, overlayMounted, navigate, navigateTimeline, inTimelineMode, placeHaikuIndex, placeHaikus.length]);

  // Swipe nav — whole-screen gestures with horizontal/vertical intent split:
  //   Horizontal (|dx| > |dy|): journey nav. Blocked in timeline unless at most-recent haiku.
  //   Vertical   (|dy| >= |dx|): timeline nav. Only active when place has 2+ haikus.
  useEffect(() => {
    let startX: number | null = null;
    let startY: number | null = null;
    const onStart = (e: TouchEvent) => {
      if (mapOpen) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      if (!appReady || journeyLoading || overlayMounted) return;
      if (startX === null || startY === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      startX = null; startY = null;
      const isHorizontal = Math.abs(dx) > Math.abs(dy);
      if (isHorizontal) {
        if (Math.abs(dx) < 30) return;
        // Left/right always exits timeline mode and advances the journey
        navigate(dx < 0 ? 1 : -1);
      } else {
        if (Math.abs(dy) < 30 || placeHaikus.length < 2) return;
        // dy < 0 = finger moved up = back in time (-1); dy > 0 = down = forward in time (+1)
        navigateTimeline(dy < 0 ? -1 : 1);
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [appReady, journeyLoading, overlayMounted, navigate, navigateTimeline, inTimelineMode, placeHaikuIndex, placeHaikus.length, mapOpen]);

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
  const handlePlaceClick = useCallback(async (place: { id: string; name: string; city: string; google_place_id: string }) => {
    setMapOpen(false);
    setJourneyLoading(true);
    setOverlayMounted(true);
    try {
      const prebuilt = pendingPlaceIdRef.current === place.id ? pendingPlaceJourneyRef.current : null;
      pendingPlaceJourneyRef.current = null;
      pendingPlaceIdRef.current = null;
      const j = prebuilt || await buildJourneyFromPool(posts, place.name);

      // Find the most recent haiku from the tapped place and force it to position 0.
      // buildJourneyFromPool passes placeName as an AI hint — not a filter — so the
      // first haiku in the returned sequence may be from a different place.
      const placeHaikus = posts.filter(p =>
        (p.place_id && p.place_id === place.id) || (p.places?.id && p.places.id === place.id)
      );
      if (placeHaikus.length > 0) {
        const mostRecent = placeHaikus.reduce((best, p) =>
          (p.created_at || '') > (best.created_at || '') ? p : best
        );
        const withoutSelected = j.seq.filter(h => String(h.id) !== String(mostRecent.id));
        j.seq = [mostRecent, ...withoutSelected];
        // conn is parallel to seq; bridges are never shown — rebuild as empty strings
        j.conn = j.seq.map(() => '');
        j.conn[0] = '';
      }

      setThreadType(j.type);
      setJourney(j);
      setCi(0);
      setJourneyLoading(false);
      triggerReveal();
    } catch {
      setJourneyLoading(false);
    }
  }, [posts, triggerReveal]);

  // Map tooltip open: fire-and-forget pre-build so journey is ready when user taps Go
  const handleTooltipOpen = useCallback((place: { id: string; name: string }) => {
    pendingPlaceIdRef.current = place.id;
    pendingPlaceJourneyRef.current = null;
    buildJourneyFromPool(posts, place.name).then(j => {
      if (pendingPlaceIdRef.current === place.id) {
        pendingPlaceJourneyRef.current = j;
      }
    });
  }, [posts]);

  const placeCount = new Set(posts.map((p: HaikuPost) => getPlace(p)).filter(Boolean)).size;

  const currentPlace = currentPost?.places?.lat != null && currentPost?.places?.lng != null
    ? { lat: currentPost.places.lat, lng: currentPost.places.lng, name: currentPost.places.name }
    : undefined;

  const bgSrc = currentPost ? getBg(currentPost) : '';
  bgSrcRef.current = bgSrc;
  const lines = currentPost ? getLines(currentPost) : ['', '', ''];
  const locationText = currentPost ? getLocationLabel(currentPost) : '';
  const authorText = currentPost ? `— ${currentPost.author || 'anonymous'}` : '';
  linesRef.current = lines;
  locationTextRef.current = locationText;
  authorTextRef.current = authorText;

  const journeyProgress = journey ? ((ci + 1) / journey.seq.length * 100) : 0;

  // Slider visible when the current place has 2+ haikus and app is ready
  const sliderVisible = appReady && placeHaikus.length >= 2;

  // Timeline position counter: 1 = newest (top of slider), N = oldest (bottom)
  const atNewest = placeHaikuIndex === placeHaikus.length - 1;
  const showNavArrows = appReady && (!inTimelineMode || atNewest);
  const showTimelineCounter = appReady && inTimelineMode && !atNewest;
  const timelinePosition = placeHaikus.length - placeHaikuIndex;

  const threadColor = threadType ? (THREAD_COLORS[threadType] ?? 'rgba(139,106,42,0.15)') : 'rgba(139,106,42,0.15)';
  void threadText;

  return (
    <>
      {/* Wipe transition — used for timeline navigation and edge cases */}
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--parchment-2)', zIndex: 49,
        opacity: wipeActive ? 1 : 0, pointerEvents: wipeActive ? 'all' : 'none',
        transition: 'opacity 0.38s ease',
      }} />

      {/* Loading overlay — client-only to prevent SSR path flash. Initial load and between-journey gaps. */}
      {clientReady && overlayMounted && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'var(--parchment)',
            opacity: (!appReady || journeyLoading) ? 1 : 0,
            pointerEvents: (!appReady || journeyLoading) ? 'all' : 'none',
            transition: 'opacity 800ms ease',
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && appReady && !journeyLoading) {
              loadingPathRef.current = (loadingPathRef.current + 1) % LOADING_PATHS.length;
              setOverlayMounted(false);
            }
          }}
        >
          <svg
            viewBox="0 0 400 600"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
          >
            <path
              d={LOADING_PATHS[loadingPathRef.current]}
              suppressHydrationWarning
              stroke="#8a6a2a"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeDasharray: 3000, strokeDashoffset: 3000, animation: 'path-draw 6s linear forwards' }}
            />
          </svg>
        </div>
      )}

      {/* Depth push exit — departing card (full content) scales/fades out while new card slides in beneath */}
      {depthState && (
        <div
          className={depthState.exitClass}
          style={{
            backgroundImage: depthState.bgSrc ? `url(${depthState.bgSrc})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: 'var(--parchment)',
            filter: depthState.bgSrc ? 'saturate(0.85) brightness(1.02) contrast(0.95)' : undefined,
          }}
        >
          {/* Parchment wash */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(245,240,232,0.98) 0%, rgba(245,240,232,0.95) 8%, rgba(245,240,232,0.85) 16%, rgba(245,240,232,0.65) 26%, rgba(245,240,232,0.30) 36%, rgba(245,240,232,0.08) 48%, rgba(245,240,232,0.0) 60%, rgba(245,240,232,0.0) 100%)',
            zIndex: 1,
          }} />
          {/* Outgoing haiku content — mirrors haiku-stage layout */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
            padding: '0 60px 58px 52px',
          }}>
            {/* Location tag */}
            <div style={{
              fontFamily: "'Shippori Mincho', serif", fontSize: 10, color: 'var(--ink-soft)',
              opacity: 0.68, marginBottom: 16,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              letterSpacing: '0.28em', textTransform: 'uppercase',
            }}>
              <div style={{ width: 20, height: 1, background: 'var(--gold)', flexShrink: 0, opacity: 0.9 }} />
              {depthState.locationText}
            </div>
            {/* Haiku lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              <div style={{
                fontFamily: "'Shippori Mincho', serif", color: 'var(--ink)',
                lineHeight: 1.2, display: 'block', whiteSpace: 'nowrap',
                textShadow: '0 1px 4px rgba(245,240,232,0.55)',
                fontSize: 'clamp(22px, 3vw, 42px)', fontWeight: 500,
              }}>{depthState.lines[0]}</div>
              <div style={{
                fontFamily: "'Shippori Mincho', serif", color: 'var(--ink)',
                lineHeight: 1.2, display: 'block', whiteSpace: 'nowrap',
                textShadow: '0 1px 4px rgba(245,240,232,0.55)',
                fontSize: 'clamp(19px, 2.6vw, 37px)', fontWeight: 400,
                paddingLeft: 'clamp(10px, 1.4vw, 20px)',
              }}>{depthState.lines[1]}</div>
              <div style={{
                fontFamily: "'Shippori Mincho', serif", color: 'var(--ink)',
                lineHeight: 1.2, display: 'block', whiteSpace: 'nowrap',
                textShadow: '0 1px 4px rgba(245,240,232,0.55)',
                fontSize: 'clamp(17px, 2.3vw, 33px)', fontWeight: 400,
                paddingLeft: 'clamp(20px, 2.8vw, 38px)',
              }}>{depthState.lines[2]}</div>
            </div>
            {/* Author */}
            <div style={{
              fontFamily: "'Shippori Mincho', serif", fontSize: 11, color: 'var(--ink-soft)',
              opacity: 0.5, letterSpacing: '0.2em', whiteSpace: 'nowrap', marginBottom: 8,
            }}>{depthState.authorText}</div>
          </div>
        </div>
      )}

      {/* Timeline exit overlay — animates away while new card is pre-rendered beneath it */}
      {timelineSlideState && (
        <div
          className={timelineSlideState.exitClass}
          style={{
            backgroundImage: timelineSlideState.bgSrc ? `url(${timelineSlideState.bgSrc})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: 'var(--parchment)',
            filter: timelineSlideState.bgSrc ? 'saturate(0.85) brightness(1.02) contrast(0.95)' : undefined,
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(245,240,232,0.98) 0%, rgba(245,240,232,0.95) 8%, rgba(245,240,232,0.85) 16%, rgba(245,240,232,0.65) 26%, rgba(245,240,232,0.30) 36%, rgba(245,240,232,0.08) 48%, rgba(245,240,232,0.0) 60%, rgba(245,240,232,0.0) 100%)',
            zIndex: 1,
          }} />
        </div>
      )}

      {/* Left-edge thread color hairline — 1px rule, color maps to current thread type, crossfades 800ms */}
      <div style={{
        position: 'fixed', left: 0, top: 0, width: 1, height: '100%',
        zIndex: 5, pointerEvents: 'none',
        backgroundColor: threadColor,
        transition: 'background-color 800ms ease',
      }} />

      {/* Stage */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <img
          src={bgSrc || undefined}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: bgVisible ? 1 : 0, transition: 'opacity 1.4s ease',
            filter: 'saturate(0.85) brightness(1.02) contrast(0.95)',
          }}
        />
        {/* Parchment wash — z-index 1, above photo */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to top, rgba(245,240,232,0.98) 0%, rgba(245,240,232,0.95) 8%, rgba(245,240,232,0.85) 16%, rgba(245,240,232,0.65) 26%, rgba(245,240,232,0.30) 36%, rgba(245,240,232,0.08) 48%, rgba(245,240,232,0.0) 60%, rgba(245,240,232,0.0) 100%)',
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
        visible={sliderVisible}
      />

      {/* Haiku stage — hold mechanic targets this whole div */}
      <div
        className={`haiku-stage${timelineSlideState ? ` ${timelineSlideState.enterClass}` : ''}${depthState ? ` ${depthState.enterClass}` : ''}`}
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

      {/* Nav arrows — hidden in timeline mode unless at the newest (position 1) haiku */}
      {showNavArrows && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 30, transform: 'translateX(-50%)',
          zIndex: 20, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <button className="nb" onClick={() => navigate(-1)} style={{
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
          <button className="nb" onClick={() => navigate(1)} style={{
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

      {/* Timeline position counter — replaces nav arrows while in timeline mode (position 2+) */}
      {showTimelineCounter && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 30, transform: 'translateX(-50%)',
          zIndex: 20, pointerEvents: 'none',
          fontFamily: "'Shippori Mincho', serif", fontSize: 13,
          color: 'var(--ink-faint)', letterSpacing: '0.2em',
          textTransform: 'uppercase', opacity: 0.6,
        }}>
          {timelinePosition} of {placeHaikus.length}
        </div>
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
      <MapOverlay open={mapOpen} onClose={() => setMapOpen(false)} onPlaceSelect={handlePlaceClick} onTooltipOpen={handleTooltipOpen} currentPlace={currentPlace} />

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

