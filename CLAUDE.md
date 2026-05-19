# CLAUDE.md — Haiku Review

Last updated: May 2026

---

## What This Is

Haiku Review is a place-memory art project disguised as an app. People leave three lines — 5-7-5 — about a specific named place. Those lines accumulate over time, layered like sediment. Someone else reads them standing in the same spot, months or years later.

It is not a social media app. It is not trying to grow aggressively. It is deliberate slowcial media — the antithesis of dopamine-driven engagement. The experience should feel like discovering something left behind, not like a feed.

It is also, straightforwardly, an art project. Build it like one.

---

## Current Build Status

The app is deployed and live at **haikureview.online** (Vercel). Dev environment is GitHub Codespaces (`johnsonadamc/Haiku-Review`), branch `main`.

**Working and deployed:**
- Next.js 16 App Router with TypeScript
- Supabase connected (places, haikus, holds tables live with RLS)
- AI-threaded journey as default entry experience
- Depth push transition between journey haikus (left/right)
- iOS-style vertical card slide for timeline navigation (up/down)
- Vertical timeline slider (right edge, newest at top, oldest at bottom, tap-to-jump)
- Whole-screen swipe gestures (left/right = journey, up/down = timeline)
- Swipe left/right works at ANY point in timeline — immediately exits and advances journey
- Timeline mode shows position counter ("2 of 4") instead of prev/next arrows; arrows return at newest
- Syllable counter with pip bars (green/red/grey, uses `syllable` npm package)
- Hold mechanic (800ms long-press, gold ripple, silent held_count increment)
- Submit panel with photo upload, place search, magic-link email auth
- Google Places API (New) connected — proxied server-side via `/api/places/search` and `/api/places/details`
- Optional magic-link email auth (Supabase Auth, no passwords)
- "Your Haikus" overlay for returning magic-link users
- Map explorer: Stadia Maps Stamen Watercolor tiles via MapLibre GL JS
- Map shows place dots sized by haiku_count, tap dot → tooltip → Go → seeds AI journey
- Map pre-builds journey when tooltip opens (not when Go pressed) for faster transition
- QR/place-mode entry (`?place=<google_place_id>` URL param → skips atmospheric pause)
- Left-edge thread color hairline (1px, crossfades 800ms on thread change)
- Loading animation: 12 rotating SVG paths, gold wandering line, cycles sequentially
- Loading animation shows on: initial load, between-journey gaps, map→journey transition
- Seed script with rich haiku data and stock images
- Mobile-first responsive design
- Deployed to Vercel at haikureview.online
- Domain: haikureview.online (Squarespace DNS → Vercel)

**Needs attention / in progress:**
- Photo upload to Supabase storage (wired but real-file persistence unverified)
- Resend email integration not yet configured (Supabase still sending default magic-link emails)
- Loading animation occasionally glitchy on some transitions (known, low priority)

**Not yet built:**
- QR code generation for physical placement
- Resend SMTP connected to Supabase for branded magic-link emails

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database + Auth + Storage:** Supabase (`lopfvramjhsowjfkynrp`)
- **Styling:** Tailwind CSS with custom CSS variables — no component libraries
- **Map:** MapLibre GL JS + Stadia Maps Stamen Watercolor tiles (`NEXT_PUBLIC_STADIA_API_KEY`)
- **AI Journeys:** Anthropic API (`claude-sonnet-4-6`) — server-side only via `/api/journey`, max_tokens 300, 2s timeout with random shuffle fallback
- **Place Search:** Google Places API (New) — `places.googleapis.com/v1/places:searchText` and `/v1/places/{id}` — proxied server-side, never client-exposed
- **Syllable counting:** `syllable` npm package (ESM, in `transpilePackages` in next.config.ts)
- **Deployment:** Vercel (live at haikureview.online)
- **Dev:** GitHub Codespaces (`johnsonadamc/Haiku-Review`), branch `main`

---

## Core Philosophy — Never Violate These

**The constraint is the product.** 5-7-5 is not a suggestion. It filters for intention. Every feature decision should ask: does this make the experience faster or slower, noisier or quieter? Slower and quieter is almost always right.

**Specific places, not cities.** Locations are *Fushimi Inari Shrine, Kyoto* and *Café de Flore, Paris* — not "Japan" or "Paris." Place specificity is the whole point. Use Google Places API for location search and resolution. Never a city dropdown.

**No engagement metrics shown to users.** No like counts, no follower counts, no view counts. The "held" mechanic (long-press to remember) is invisible — the holder knows they held it, the author sees a quiet count privately, nobody sees a ranking.

**The haiku is always the primary surface.** Full-bleed photo background, parchment wash, ink-on-paper text. Everything else — map, submit, journey — is a mode you enter and return from. Never let chrome compete with the poem.

**The AI journey shows the most recent haiku per place.** This is a strict rule. The journey pool is filtered to one haiku per place_id — the one with the highest created_at. This keeps the experience ephemeral, always moving, a live feed regardless of quality.

**The map is secondary.** It opens from the location tag tap. It's beautiful but it's not the homepage.

**The timeline is a detour, not a trap.** Swiping left/right at any point in the timeline immediately exits timeline mode and advances the journey. Users are never stuck.

---

## Navigation Model

### Default: AI-Threaded Journey
- App opens with loading animation (SVG wandering path draws, ~4s overlay)
- First haiku reveals with stagger timing when both animation and data are ready
- Journey pool = most recent haiku per place, filtered before calling `/api/journey`
- AI sequences haikus by a randomly selected thread type (invisible to user)
- Swiping left (finger moves left) = next haiku in journey (depth push transition)
- Swiping right (finger moves right) = previous haiku in journey (depth push transition)
- Journey is endless — next journey pre-fetched in background as user nears the end
- Between journeys: loading animation shows, new journey loads, fades in

### Timeline Mode (place with 2+ haikus)
- Vertical slider appears on right edge when current place has 2+ haikus
- Slider: newest at TOP, oldest at BOTTOM
- Thumb starts at top (position 1 = most recent)
- Swiping UP = go to older haiku (thumb moves down)
- Swiping DOWN = go to newer haiku (thumb moves up)
- At oldest haiku: swipe up does nothing
- At newest haiku: swipe down exits timeline mode silently
- **Swiping LEFT or RIGHT at any timeline position:** immediately exits timeline and advances journey (depth push)
- Position counter shows "2 of 4" (1 = newest, N = oldest) — replaces prev/next arrows
- Arrows return when back at position 1 (newest)
- Tap any tick on slider to jump directly to that haiku

### Transitions
- **Journey navigation (left/right):** Depth push — outgoing card scales to 0.94 and fades, incoming card slides in from the side. Exit: 320ms `cubic-bezier(0.4,0,1,1)`. Enter: 380ms `cubic-bezier(0.25,0.46,0.45,0.94)`, 20ms delay.
- **Timeline navigation (up/down):** iOS-style vertical push — both cards animate simultaneously. Exiting card accelerates out, entering card decelerates in with parallax offset. Exit: 320ms. Enter: 380ms, 30ms delay, `animation-fill-mode: both`.
- **Loading overlay:** SVG path draws on parchment background, fades out over 800ms when content ready.

### Loading Animation
- 12 distinct SVG paths stored in `LOADING_PATHS` array in `page.tsx`
- Cycles sequentially (not randomly) — initialized at random index, then +1 mod 12 each time
- Path index advances inside `onTransitionEnd` (after fade) — never during animation
- `clientReady` state prevents SSR rendering — overlay only mounts client-side
- Shows during: initial load, between-journey gap, map→journey (`handlePlaceClick`)
- `animTimer`: 2000ms — overlay starts fading at 2s, 800ms fade, content appears ~2.8s
- `tryReveal` gates on both `animComplete` AND `contentReady` — whichever is last
- `journeyLoading` + `overlayMounted` drive the overlay — never merged with `isTransitioning`

### Map Explorer
- Opens from location tag tap (bottom-left) — only entry point
- Centered on the place the user was just viewing (`currentPlace` prop)
- Stadia Maps Stamen Watercolor tiles via MapLibre GL JS
- Place dots: `Math.min(12 + haiku_count * 3, 32)px`, seal red, 44px touch targets
- Tooltip opens on dot tap (not hover — mobile): place name, city, haiku count, distance in miles (if geolocation granted)
- Journey pre-builds when tooltip opens (`onTooltipOpen` prop → `pendingPlaceJourneyRef`)
- Go button: closes map, uses pre-built journey if ready, otherwise builds then
- `handlePlaceClick`: always forces most recent haiku from tapped place to `seq[0]`
- `increment_haiku_count` RPC uses admin client (bypasses RLS) with parameter `p_place_id`

### Keyboard Equivalents
- ArrowLeft = swipe right (prev journey)
- ArrowRight = swipe left (next journey)
- ArrowUp = swipe up (back in time)
- ArrowDown = swipe down (forward in time)
- All keyboard/swipe handlers guard: `if (!appReady || journeyLoading || overlayMounted) return`

---

## Design System

### Palette
```css
--parchment:   #f5f0e8;   /* primary background */
--parchment-2: #ede6d6;   /* wipe/transition */
--parchment-3: #e4daca;   /* map land */
--ink:         #1e1a14;   /* primary text */
--ink-soft:    #6b6050;   /* secondary text, labels */
--ink-faint:   #9e9080;   /* hints, metadata */
--seal:        #8b2a1a;   /* vermillion — action, focus */
--seal-light:  rgba(139,42,26,0.1);
--gold:        #8a6a2a;   /* rules, structure, accent lines */
--water:       #d4d8dc;   /* map ocean */
```

### Typography
- **Haiku lines:** Shippori Mincho — the primary expressive font. Weighted 400–600.
- **Wordmark / headings:** Zen Old Mincho — sparse, structural
- **UI labels / metadata:** Shippori Mincho — same family, smaller, more letter-spacing
- Never use system fonts. Never use sans-serif for anything visible to the reader.
- Letter-spacing: 0.2em–0.38em on all uppercase labels
- All caps: uppercase only for UI labels, never for haiku content

### Key Measurements
- Haiku stage padding: `0 60px 58px 52px`
- Line sizes: line-0 `clamp(22px,3.0vw,42px)`, line-1 `clamp(19px,2.6vw,37px)`, line-2 `clamp(17px,2.3vw,33px)`
- Progressive indent: line-0 0px, line-1 ~15px, line-2 ~30px — like a hanging scroll composition
- All haiku lines: `white-space: nowrap` — never wrap
- Wipe transition: parchment-2 fade, never black

### Photo Treatment
```css
filter: saturate(0.85) brightness(1.02) contrast(0.95);
```
Parchment wash concentrated in bottom third only — upper photo shows full color:
```css
background: linear-gradient(to top,
  rgba(245,240,232,0.98) 0%,
  rgba(245,240,232,0.95) 8%,
  rgba(245,240,232,0.85) 16%,
  rgba(245,240,232,0.65) 26%,
  rgba(245,240,232,0.30) 36%,
  rgba(245,240,232,0.08) 48%,
  rgba(245,240,232,0.0) 60%,
  rgba(245,240,232,0.0) 100%);
```
Apply identically to main viewer, depth exit overlay, and timeline exit overlay.

### Text Legibility
- Haiku lines: `color: var(--ink)`, `fontWeight: 500/400`
- Location tag and author: `color: var(--ink)`, full opacity (not ink-soft, not reduced opacity)
- No text-shadow on any element

### Stagger Timing
- Location tag: 180ms
- Line 0: 400ms
- Line 1: 760ms
- Line 2: 1100ms
- Author: 1540ms

---

## Features

### 1. Haiku Viewer (Primary Surface)
- Full-bleed photo background with parchment wash overlay (concentrated at bottom)
- Haiku lines reveal staggered (see timings above)
- Whole-screen swipe gestures (left/right = journey, up/down = timeline)
- **Hold mechanic:** long-press (800ms) anywhere on haiku stage → gold ripple → silent held_count increment. No count shown. No hint. Discovered organically.
- Wordmark top-left: "Haiku" (Zen Old Mincho, opacity 0.5, letter-spacing 0.38em) / gold rule / "Review" (Shippori Mincho)
- `+ Submit` button top-right
- Location tag bottom-left: "Place Name · City" format — `color: var(--ink)`, full opacity
- Author bottom: `color: var(--ink)`, full opacity
- Collection info vertical label left side: "N haikus · N places", writing-mode: vertical-rl
- Left-edge thread color hairline: 1px fixed, full height, color from `THREAD_COLORS[threadType]`, crossfades 800ms

### 2. Vertical Timeline Slider
- Appears on right edge when current place has 2+ haikus
- Position: `fixed`, `right: 0`, `top: 80px`, height `45vh` max
- **Newest at TOP, oldest at BOTTOM**
- `pct = (1 - i/(n-1)) * 100` — index n-1 (newest) maps to 0% (top)
- Click handler: `Math.round((1 - pct) * (n-1))`
- Track: 1px gold line; ticks: one per haiku; year labels at year boundaries
- Thumb: 6px gold circle at active position
- Tap any tick to jump to that haiku
- No drag interaction

### 3. Location Tag → Map Entry
- Location tag at bottom-left tapped → opens MapOverlay
- Only map entry point — no "Places" button elsewhere
- `›` arrow slides in on hover/focus

### 4. Map (MapOverlay.tsx)
- MapLibre GL JS with Stadia Maps Stamen Watercolor tiles
- Tile URL: `https://tiles.stadiamaps.com/styles/stamen_watercolor.json?api_key=${NEXT_PUBLIC_STADIA_API_KEY}`
- Centered on `currentPlace` (place user was just viewing) via `easeTo`
- Rotation disabled
- Places fetched fresh from Supabase on mount
- Dot markers: seal red, sized `Math.min(12 + haiku_count*3, 32)px`, 44px touch targets
- `touchEl.dataset.placeId` stores place ID — click handler reads `e.currentTarget.dataset.placeId`
- `placesRef` mirrors `places` state for stable DOM handler lookups
- `selectedPlace` React state drives tooltip (not a ref — prevents stale closure)
- Tooltip: place name, city, haiku count, distance in miles (Haversine, geolocation optional)
- `onTooltipOpen` prop fires when tooltip opens → `page.tsx` pre-builds journey
- Go button: `selectedPlace` from state (never stale), calls `onPlaceSelect`
- Map click guard: only clears tooltip if click target is not a marker

### 5. AI Journeys
- Default experience — app opens into a journey
- Journey pool: `mostRecentPerPlace()` — one haiku per place_id, highest created_at
- Calls `claude-sonnet-4-6` via `/api/journey` — NEVER from client
- `max_tokens: 300`, `Promise.race` with 2s timeout → random shuffle fallback
- Thread types (randomly selected, never shown): `'emotional resonance' | 'time of day' | 'the texture of silence' | 'figures seen from a distance' | 'the weight of memory' | 'threshold moments' | 'what is left unsaid' | 'light and its quality' | 'solitude in crowds' | 'the presence of absence'`
- No bridge labels shown between haikus — transitions are silent
- Journey is endless — next journey pre-fetched before current ends
- `handlePlaceClick` always forces most recent haiku from tapped place to `seq[0]`

### 6. Submit
- `+ Submit` button top-right → full-screen overlay
- Fields: photo upload, name (optional), email (optional, for magic-link), place search, haiku textarea
- Place search: `/api/places/search` → Google Places API (New) `searchText` endpoint, up to 8 results
- Place details: `/api/places/details` → `/v1/places/{id}`, returns lat/lng/city/name
- City extracted from `formattedAddress` (everything after first comma) as fallback
- `selectPlace` uses details city if search result had empty city: `c: p.c || geo.city || ''`
- Syllable indicator: three pip bars, green/red/grey, shows count/target after 3+ syllables
- After submit: shows one previous haiku from same place, returns to viewer
- `increment_haiku_count` called via admin client with `{ p_place_id: place.id }`

### 7. Magic-Link Auth (Optional)
- Email field in submit panel — optional, never required
- Supabase `signInWithOtp` → magic link → `/auth/callback` → `/?haikus=mine`
- "Your Haikus" overlay: lists place · city, date, first line. No counts.
- Resend SMTP not yet configured — still using Supabase default sender

---

## Database Schema (Supabase)

Live at: `https://lopfvramjhsowjfkynrp.supabase.co`

```sql
places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  google_place_id text unique,
  lat float, lng float,
  haiku_count int default 0,
  created_at timestamptz default now()
)

haikus (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references places(id),
  author text,
  line_1 text not null,
  line_2 text not null,
  line_3 text not null,
  photo_url text,
  held_count int default 0,
  user_id uuid references auth.users,   -- nullable
  created_at timestamptz default now()
)

holds (
  id uuid primary key default gen_random_uuid(),
  haiku_id uuid references haikus(id),
  session_id text,
  created_at timestamptz default now(),
  unique(haiku_id, session_id)
)
```

RLS enabled on all tables. Haikus and places: publicly readable, open insert. Holds: insert-only per session.

Helper functions:
- `increment_held(haiku_id uuid)` — increments held_count
- `increment_haiku_count(p_place_id uuid)` — increments haiku_count on places (parameter is `p_place_id`, not `place_id` — renamed to avoid column name conflict). Called via admin client only.

---

## API Routes

```
GET  /api/haikus?place_id=&order=asc   — temporal feed, falls back to seed data if empty
POST /api/haikus                        — create haiku + find-or-create place
POST /api/holds                         — record hold, deduplicate by session_id
GET  /api/places/search?q=             — Google Places (New) proxy, up to 8 results
GET  /api/places/details?place_id=     — Google Place Details (New) for lat/lng/city/name
POST /api/journey                       — build AI journey server-side only
GET  /api/my-haikus                     — fetch haikus for authenticated user
/auth/callback                          — Supabase magic-link exchange route
```

---

## Journey API Prompt Pattern

```
System: You are a JSON API. Respond with ONLY valid JSON — no markdown, no backticks, no explanations.

User: Curate a journey through these haikus connected by "{threadType}".
Starting near "{placeName}". Available haikus: {JSON}.
Return {n} IDs ordered by this theme. For each after the first, write a 5-8 word poetic bridge.
{"threadType":"...","sequence":[ids...],"connections":["","bridge",...]}
Use only these IDs: [...]. Exactly {n} IDs, exactly {n} connections (first always empty string).
```

Bridge labels are NOT displayed to the user. Thread type stored in state, never shown.
Always fallback to random shuffle with empty connections if API call fails or times out (2s).

---

## Key CSS — Transitions

```css
/* Depth push — journey navigation (left/right) */
@keyframes depth-exit {
  from { transform: scale(1);    opacity: 1; }
  to   { transform: scale(0.94); opacity: 0; }
}
@keyframes depth-enter-from-right {
  from { transform: translateX(100vw) scale(0.98); opacity: 0.6; }
  to   { transform: translateX(0)     scale(1);    opacity: 1; }
}
@keyframes depth-enter-from-left {
  from { transform: translateX(-100vw) scale(0.98); opacity: 0.6; }
  to   { transform: translateX(0)      scale(1);    opacity: 1; }
}
.depth-exit { position:fixed;inset:0;z-index:40;animation:depth-exit 320ms cubic-bezier(0.4,0,1,1) forwards;pointer-events:none; }
.depth-enter-from-right { position:fixed;inset:0;z-index:39;animation:depth-enter-from-right 380ms cubic-bezier(0.25,0.46,0.45,0.94) forwards;animation-delay:20ms;animation-fill-mode:both;pointer-events:none; }
.depth-enter-from-left  { position:fixed;inset:0;z-index:39;animation:depth-enter-from-left  380ms cubic-bezier(0.25,0.46,0.45,0.94) forwards;animation-delay:20ms;animation-fill-mode:both;pointer-events:none; }

/* Vertical iOS push — timeline navigation (up/down) */
/* Both cards animate simultaneously. Exit accelerates out, enter decelerates in with parallax. */
/* Cleared by 420ms setTimeout — not onAnimationEnd */

/* Loading path */
@keyframes path-draw {
  from { stroke-dashoffset: 3000; }
  to   { stroke-dashoffset: 0; }
}
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://lopfvramjhsowjfkynrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=           # in .env.local
SUPABASE_SERVICE_ROLE_KEY=               # in .env.local — never commit
ANTHROPIC_API_KEY=                       # in .env.local — required for AI journeys
NEXT_PUBLIC_STADIA_API_KEY=              # Stadia Maps — for Stamen Watercolor map tiles
GOOGLE_PLACES_API_KEY=                   # Google Places API (New) — server-side only, unrestricted by HTTP referrer
NEXT_PUBLIC_MAPBOX_TOKEN=                # not used — MapLibre + Stadia instead
```

All must also be set in Vercel dashboard → Environment Variables for production.
`.env.local` is gitignored. Never commit it.

---

## Key Gotchas

**Never call the Anthropic API from the client.** Journey building must go through `/api/journey` server route only.

**Journey pool = most recent per place.** `mostRecentPerPlace()` filters by highest `created_at` per `place_id`. Never pass the full pool.

**`white-space: nowrap` on all haiku lines.** Without this, long lines wrap and ruin the composition.

**`src={bgSrc || undefined}` on the background img tag.** Never pass an empty string to src.

**The photo wash layer is z-index 1, above the photo.** The parchment gradient sits over the image — intentional and critical.

**Do not put `filter` in depth-exit keyframes.** It overrides the inline `filter: saturate(0.85) brightness(1.02) contrast(0.95)` on the overlay div.

**Hold mechanic uses `mousedown`/`touchstart` on the haiku stage div.** Clear timer on `mouseup`, `mouseleave`, `touchend`, `touchcancel`.

**No hold hint shown.** Intentionally undiscoverable.

**Timeline slider top anchored at 80px** to avoid submit button overlap.

**Swipe detection: dx vs dy magnitude first.** 30px minimum threshold. Vertical only fires when `placeHaikus.length > 1`.

**Timeline is a detour.** Left/right swipe exits timeline and advances journey from ANY position — not just atNewest.

**`overlayMounted` is set directly alongside `journeyLoading`.** No watcher effect — the old `useEffect` watching `journeyLoading` was removed to prevent double-mount. Every call site sets both states synchronously together.

**`loadingPathRef` advances in `onTransitionEnd` only** — not on mount. This prevents mid-animation re-renders.

**`clientReady` state** prevents SSR rendering of the loading overlay — prevents hydration flash.

**Map marker click handler reads `e.currentTarget.dataset.placeId`** — not `touchEl.dataset.placeId` from closure (stale closure bug fix).

**`selectedPlace` is React state** — not a ref — so Go button closure always captures current value.

**`increment_haiku_count` uses admin client** and parameter `p_place_id` (not `place_id`).

**Google Places API (New) uses `places.googleapis.com`** — not `maps.googleapis.com`. The legacy endpoint returns `REQUEST_DENIED`. Key must have no HTTP referrer restriction (server-side use).

**Place dots sized by `haiku_count` denormalized column.** Don't count joins on every render.

**Google Places proxy is required.** Never expose `GOOGLE_PLACES_API_KEY` to the client.

**After submission, show one previous haiku from same place.** Not a feed. One haiku. Return to viewer.

**Seed data fallback.** When Supabase tables empty, `GET /api/haikus` falls back to `lib/seed-data.ts`.

**`syllable` package is ESM-only.** In `transpilePackages` in `next.config.ts`. Do not remove.

**Supabase auth redirect URL** must include `haikureview.online/auth/callback` in Supabase dashboard → Authentication → URL Configuration.

**Claude Code pushes to feature branches** (`claude/haiku-review-setup-D6T2O`). Always merge to main manually: `git fetch origin && git merge origin/claude/haiku-review-setup-D6T2O --no-edit && git push`.

---

## Seed Data

Rich seed data in `scripts/seed.ts`. Run with `npx tsx scripts/seed.ts`.

7 places, 23 haikus, Unsplash stock image URLs:
- Fushimi Inari Shrine, Kyoto — lat: 34.9671, lng: 135.7727, google_place_id: ChIJIW0uPRUPAWAR6eI6dRzKGns (4 haikus)
- Café de Flore, Paris (3 haikus)
- The High Line, New York (4 haikus)
- Shibuya Crossing, Tokyo (3 haikus)
- Tate Modern, London (3 haikus)
- Lençóis Maranhenses, Brazil (2 haikus)
- Naoshima Island, Japan (3 haikus)

Script is safe to run multiple times — skips duplicates, updates photo_url if missing.

---

## Remaining Work (Priority Order)

1. **Resend email** — connect Resend SMTP to Supabase for branded magic-link emails. Have Resend account. Need to verify `haikureview.online` domain in Resend, add DNS records in Squarespace, configure SMTP in Supabase Auth settings. Sender: `hello@haikureview.online`.

2. **QR code generation** — generate QR codes encoding `?place=<google_place_id>` URLs for physical placement at real locations. This is the primary distribution mechanism.

3. **Photo upload verification** — confirm Supabase storage is actually persisting uploaded photos end-to-end with real files (not just base64 previews).

4. **Seed more real content** — 23 seed haikus is thin for a public launch. Target 50–100 real haikus across 15–20 real places before showing to anyone.

---

## Git / Codespaces

- Repo: `github.com/johnsonadamc/Haiku-Review`
- Branch: `main` — always work on main directly
- Claude Code pushes to feature branches — merge manually (see gotchas above)
- Dev server: `npm run dev` in Codespaces terminal
- Build check: `npm run build` before committing
- After merging: `git push` to keep origin/main current

---

## What This Is Not

- Not a social network. No follows, no DMs, no profiles.
- Not gamified. No streaks, no points, no leaderboards.
- Not a recommendation engine. The AI builds journeys — it doesn't surface "popular" content.
- Not optimized for engagement. Slow transitions, contemplative pacing, no infinite scroll.
- Not trying to scale to millions. Small, careful, meaningful.

---

## Tone of the Codebase

Write code the way the app feels. Deliberate. No shortcuts that compromise the experience. Variable names that are clear. Comments only where the why isn't obvious. The person reading this code should feel the same care as the person reading a haiku on a park bench.