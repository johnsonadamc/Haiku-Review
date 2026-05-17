# CLAUDE.md — Haiku Review

Last updated: May 2026

---

## What This Is

Haiku Review is a place-memory art project disguised as an app. People leave three lines — 5-7-5 — about a specific named place. Those lines accumulate over time, layered like sediment. Someone else reads them standing in the same spot, months or years later.

It is not a social media app. It is not trying to grow aggressively. It is deliberate slowcial media — the antithesis of dopamine-driven engagement. The experience should feel like discovering something left behind, not like a feed.

It is also, straightforwardly, an art project. Build it like one.

---

## Current Build Status

The Next.js app is fully scaffolded, running, and substantially built in GitHub Codespaces.

**Working:**
- Next.js 16 App Router with TypeScript
- Supabase connected (places, haikus, holds tables live with RLS)
- Dev server running on port 3000
- AI-threaded journey as default entry experience
- Page curl transition between haikus (CSS clip-path, bottom-right corner forward / bottom-left corner backward)
- Vertical timeline slider (right edge, tap-to-jump, read-only visual indicator)
- Whole-screen swipe gestures (left/right = journey, up/down = timeline time travel)
- Syllable counter with pip bars (green/red/grey, uses `syllable` npm package)
- Hold mechanic (800ms long-press, gold ripple, silent held_count increment)
- Submit panel with photo upload, place search, magic-link email auth
- Optional magic-link email auth (Supabase Auth, no passwords)
- "Your Haikus" overlay for returning magic-link users
- Seed script with rich haiku data and stock images
- Mobile-first responsive design

**In progress / needs attention:**
- Photo upload to Supabase storage (wired but untested with real files)
- Google Places API not yet connected (using hardcoded suggestions — needs `GOOGLE_PLACES_API_KEY`)
- Mapbox not yet connected (canvas placeholder — needs `NEXT_PUBLIC_MAPBOX_TOKEN`)
- Timeline vertical slide transition occasionally glitchy — may need smoothing pass

**Not yet built:**
- Vercel deployment
- QR code generation for physical placement
- Map as explorer (location tag tap → map → place dot → seed AI journey)
- QR/place-mode entry (`?place=<google_place_id>` URL param)
- Left-edge hairline thread-color rule

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database + Auth + Storage:** Supabase (`lopfvramjhsowjfkynrp`)
- **Styling:** Tailwind CSS with custom CSS variables — no component libraries
- **Map:** Canvas placeholder now — Mapbox GL JS when token provided (`NEXT_PUBLIC_MAPBOX_TOKEN`)
- **AI Journeys:** Anthropic API (`claude-sonnet-4-6`) — server-side only via `/api/journey`
- **Syllable counting:** `syllable` npm package (ESM, added to `transpilePackages` in next.config.ts)
- **Deployment:** Vercel (not yet deployed)
- **Dev:** GitHub Codespaces (`johnsonadamc/Haiku-Review`)

---

## Core Philosophy — Never Violate These

**The constraint is the product.** 5-7-5 is not a suggestion. It filters for intention. Every feature decision should ask: does this make the experience faster or slower, noisier or quieter? Slower and quieter is almost always right.

**Specific places, not cities.** Locations are *Fushimi Inari Shrine, Kyoto* and *Café de Flore, Paris* — not "Japan" or "Paris." Place specificity is the whole point. Use Google Places API for location search and resolution. Never a city dropdown.

**No engagement metrics shown to users.** No like counts, no follower counts, no view counts. The "held" mechanic (long-press to remember) is invisible — the holder knows they held it, the author sees a quiet count privately, nobody sees a ranking.

**The haiku is always the primary surface.** Full-bleed photo background, parchment wash, ink-on-paper text. Everything else — map, submit, journey — is a mode you enter and return from. Never let chrome compete with the poem.

**The AI journey shows the most recent haiku per place.** This is a strict rule. The journey pool is filtered to one haiku per place_id — the one with the highest created_at. This keeps the experience ephemeral, always moving, a live feed regardless of quality.

**The map is secondary.** It opens from the location tag tap. It's beautiful but it's not the homepage.

---

## Navigation Model

### Default: AI-Threaded Journey
- App opens with a brief atmospheric pause (gold rule draws across center, ~1.4s)
- First haiku reveals with stagger timing
- Journey pool = most recent haiku per place, filtered before calling `/api/journey`
- AI sequences haikus by a randomly selected thread type (invisible to user)
- Swiping left (finger moves left) = next haiku in journey
- Swiping right (finger moves right) = previous haiku in journey
- Journey is endless — seamless continuation fetched in background as user nears the end

### Timeline Mode (place with 2+ haikus)
- Vertical slider appears on right edge when current place has 2+ haikus
- Slider is read-only visual indicator + tap-to-jump (no dragging)
- Thumb starts at bottom = most recent (present); top = oldest (past)
- Swiping UP = go back in time (older haiku at this place)
- Swiping DOWN = go forward in time (newer haiku, toward present)
- At oldest haiku: swipe up does nothing
- At most recent haiku: swipe down exits timeline mode silently
- At most recent haiku in timeline mode: swipe left advances to next journey haiku
- Tapping a tick on the slider jumps directly to that haiku

### Transitions
- Journey navigation: CSS page curl (clip-path polygon animation, 420ms)
  - Forward (swipe left): curl from bottom-right corner
  - Backward (swipe right): curl from bottom-left corner
- Timeline navigation: vertical card slide (translateY, 320ms)
  - Going back in time (swipe up): current card exits UP, older card enters from BOTTOM
  - Going forward in time (swipe down): current card exits DOWN, newer card enters from TOP
- Both transitions: content swaps at midpoint (210ms for curl, 160ms for slide), stagger reveal begins underneath

### Keyboard Equivalents
- ArrowLeft = swipe right (prev journey / forward in time)
- ArrowRight = swipe left (next journey / back in time)
- ArrowUp = swipe up (back in time)
- ArrowDown = swipe down (forward in time)

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
filter: saturate(0.6) brightness(1.12) contrast(0.88);
```
Heavy parchment wash over photo — text reads as ink on paper, not light on dark:
```css
background: linear-gradient(to top,
  rgba(245,240,232,0.97) 0%, rgba(245,240,232,0.88) 22%,
  rgba(245,240,232,0.62) 48%, rgba(245,240,232,0.2) 72%,
  rgba(245,240,232,0.04) 100%);
```

### Stagger Timing
- Location tag: 180ms
- Line 0: 400ms
- Line 1: 760ms
- Line 2: 1100ms
- Author: 1540ms

---

## Features

### 1. Haiku Viewer (Primary Surface)
- Full-bleed photo background with parchment wash overlay
- Haiku lines reveal staggered (see timings above)
- Whole-screen swipe gestures (left/right = journey, up/down = timeline)
- **Hold mechanic:** long-press (800ms) anywhere on the haiku stage triggers a gold ripple and increments held_count silently. No count ever shown. No hint text shown — discovered organically.
- Wordmark top-left: "Haiku" (Zen Old Mincho, opacity 0.5, letter-spacing 0.38em) / gold rule (24px, 1px, #8a6a2a) / "Review" (Shippori Mincho, letter-spacing 0.3em)
- `+ Submit` button top-right
- Location tag bottom-left: "Place Name · City" format (e.g. "Fushimi Inari · Kyoto, Japan")
- Collection info vertical label left side: "N haikus · N places", writing-mode: vertical-rl

### 2. Vertical Timeline Slider
- Appears on right edge when current place has 2+ haikus
- Position: `fixed`, `right: 0`, `top: 80px`, height `45vh` max
- Track: 1px gold line; ticks: one per haiku, year labels at year boundaries
- Thumb: 6px gold circle at active position
- Bottom = most recent (present); top = oldest (past)
- Tap any tick to jump to that haiku
- No drag interaction — read-only visual indicator
- No label or icon below the slider

### 3. Location Tag → Map Entry
- Location tag at bottom-left shows "Place · City" format
- Tap opens map overlay (this is the ONLY map entry point)
- `›` arrow slides in on hover
- Do NOT add a "Places" button anywhere else

### 4. Map
- Full-screen overlay, parchment background
- Sumi-ink aesthetic: parchment land (#f0ebe0), cool grey-blue water (#d2d6db), hairline ink shorelines
- Place dots sized proportionally to haiku_count
- Hover: tooltip with place name, city, haiku count, gold rule
- Click dot: closes map, triggers AI journey seeded from that place
- Pan (drag), zoom (wheel/pinch)
- `NEXT_PUBLIC_MAPBOX_TOKEN` blank = canvas placeholder

### 5. AI Journeys
- Default experience — app opens into a journey
- Journey pool filtered to most recent haiku per place before calling API
- Calls `claude-sonnet-4-6` via `/api/journey` server route — NEVER from client
- Thread types rotate randomly: 'emotional resonance' | 'time of day' | 'the texture of silence' | 'figures seen from a distance' | 'the weight of memory' | 'threshold moments' | 'what is left unsaid' | 'light and its quality' | 'solitude in crowds' | 'the presence of absence'
- No bridge labels shown between haikus — transitions are silent
- Journey is endless — next journey pre-fetched before current ends
- Always fallback to random shuffle if API call fails

### 6. Submit
- Accessed via `+ Submit` button top-right
- Full-screen overlay
- Fields: photo upload (Supabase storage), name (optional), email (optional, for magic-link), specific place search, haiku textarea
- **Place search:** calls `/api/places/search` — proxies Google Places API. Falls back to hardcoded suggestions if key missing.
- **Syllable indicator:** three pip bars below textarea. Green = correct (5/7/5). Red = off (only after 3+ syllables typed per line). Shows count/target (e.g. "3/5"). Guides, never blocks.
- After submit: shows one previous haiku from same place, then returns to viewer

### 7. Magic-Link Auth (Optional)
- Email field in submit panel — optional, never required
- If email provided: Supabase `signInWithOtp` fires, haiku saved with user_id
- Magic link → `/auth/callback` → redirects to `/?haikus=mine`
- "Your Haikus" overlay: lists place · city, date, first line. No counts, no metrics.

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
  user_id uuid references auth.users,   -- nullable, added via migration 001
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
- `increment_haiku_count(place_id uuid)` — increments haiku_count on places

Migration applied: `supabase/migrations/001_user_id.sql` — adds nullable `user_id` column to haikus.

---

## API Routes

```
GET  /api/haikus?place_id=&order=asc   — temporal feed, falls back to seed data if empty
POST /api/haikus                        — create haiku + find-or-create place
POST /api/holds                         — record hold, deduplicate by session_id
GET  /api/places/search?q=             — Google Places proxy (falls back to hardcoded list)
GET  /api/places/details?place_id=     — Google Place Details for lat/lng
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

Bridge labels are NOT displayed to the user. Thread type is stored in state but never shown.
Always fallback to random shuffle with preset bridges if parsing fails.

---

## Key CSS — Transitions

```css
/* Page curl — journey navigation */
@keyframes curl-forward {
  0%   { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
  100% { clip-path: polygon(0% 0%, 100% 0%, 0% 0%, 0% 100%); }
}
@keyframes curl-backward {
  0%   { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
  100% { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 100% 0%); }
}
.page-curl-exit-forward  { position:fixed;inset:0;z-index:40;transform-origin:right center;animation:curl-forward 420ms cubic-bezier(0.4,0,1,1) forwards; }
.page-curl-exit-backward { position:fixed;inset:0;z-index:40;transform-origin:left center;animation:curl-backward 420ms cubic-bezier(0.4,0,1,1) forwards; }

/* Vertical card slide — timeline navigation */
@keyframes slide-exit-up   { from{transform:translateY(0)} to{transform:translateY(-100vh)} }
@keyframes slide-exit-down { from{transform:translateY(0)} to{transform:translateY(100vh)} }
@keyframes slide-enter-from-bottom { from{transform:translateY(100vh)} to{transform:translateY(0)} }
@keyframes slide-enter-from-top    { from{transform:translateY(-100vh)} to{transform:translateY(0)} }
.timeline-exit-up    { position:fixed;inset:0;z-index:40;animation:slide-exit-up 320ms cubic-bezier(0.4,0,0.2,1) forwards;box-shadow:0 -8px 32px rgba(30,26,20,0.18); }
.timeline-exit-down  { position:fixed;inset:0;z-index:40;animation:slide-exit-down 320ms cubic-bezier(0.4,0,0.2,1) forwards;box-shadow:0 8px 32px rgba(30,26,20,0.18); }
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://lopfvramjhsowjfkynrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=           # in .env.local
SUPABASE_SERVICE_ROLE_KEY=               # in .env.local — never commit
ANTHROPIC_API_KEY=                       # in .env.local — required for AI journeys
NEXT_PUBLIC_MAPBOX_TOKEN=                # blank = canvas placeholder
GOOGLE_PLACES_API_KEY=                   # blank = hardcoded suggestions
```

`.env.local` is gitignored. Never commit it.

---

## Key Gotchas

**Never call the Anthropic API from the client.** Journey building must go through `/api/journey` server route only.

**Journey pool = most recent per place.** `mostRecentPerPlace()` filters by highest `created_at` per `place_id` before passing to the API. Never pass the full pool.

**`white-space: nowrap` on all haiku lines.** Without this, long lines wrap and ruin the composition.

**`src={bgSrc || undefined}` on the background img tag.** Never pass an empty string to src — causes browser to reload the page.

**The photo wash layer is z-index 1, above the photo.** The parchment gradient sits over the image — intentional and critical.

**Page curl filter conflict.** Do not put `filter` in the curl keyframes — it overrides the inline `filter: saturate(0.6) brightness(1.12) contrast(0.88)` on the overlay div. Keyframe `filter` wins over inline styles.

**Hold mechanic uses `mousedown`/`touchstart` on the haiku stage div.** The whole stage is the target. Clear timer on `mouseup`, `mouseleave`, `touchend`, `touchcancel`.

**No hold hint shown.** The hold mechanic is intentionally undiscoverable — no text, no hint.

**Timeline slider top is anchored at 80px** to avoid overlapping the submit button. Not vertically centered.

**Swipe gesture detection splits on dx vs dy magnitude** before determining direction. Threshold: 30px minimum.

**Vertical swipe only fires when `placeHaikus.length > 1`.** Single-haiku places: vertical swipes do nothing.

**Timeline exit:** swiping past the most recent haiku (swipe down) exits timeline mode silently. Swiping left at the most recent haiku in timeline mode advances to next journey haiku.

**Place dots on the map are sized by `haiku_count`.** Use the denormalized column — don't count joins on every render.

**Google Places proxy is required.** Never expose `GOOGLE_PLACES_API_KEY` to the client.

**After submission, show one previous haiku from the same place.** Not a feed. One haiku. Then return to viewer.

**Seed data fallback.** When Supabase tables are empty, `GET /api/haikus` falls back to `lib/seed-data.ts`.

**`syllable` package is ESM-only.** Added to `transpilePackages` in `next.config.ts`. Do not remove.

**Supabase auth redirect URL** must be set in Supabase dashboard → Authentication → URL Configuration for magic-link to work.

---

## Seed Data

Rich seed data is in `scripts/seed.ts`. Run with `npx tsx scripts/seed.ts`.

7 places, 23 haikus total, with Unsplash stock image URLs:
- Fushimi Inari Shrine, Kyoto (4 haikus, 2021–2024)
- Café de Flore, Paris (3 haikus, 2021–2023)
- The High Line, New York (4 haikus, 2021–2024)
- Shibuya Crossing, Tokyo (3 haikus, 2021–2023)
- Tate Modern, London (3 haikus, 2021–2023)
- Lençóis Maranhenses, Brazil (2 haikus, 2022–2023)
- Naoshima Island, Japan (3 haikus, 2022–2024)

Script is safe to run multiple times — skips duplicates, updates photo_url if missing.

---

## Not Yet Built (Priority Order)

1. **Map as explorer** — location tag tap → map overlay → tap place dot → seeds AI journey from that place. The canvas map exists but dot-click currently triggers old journey mode. Wire it properly.

2. **QR / place-mode entry** — `?place=<google_place_id>` URL param → fetch that place's haikus → show 3 haikus from that place → transition to AI journey. Detect param on load, skip atmospheric pause.

3. **Left-edge thread color rule** — 1px hairline, full height, left edge of screen. Color maps to current thread type. Crossfades over 800ms when thread changes. Never labeled.

4. **Vercel deployment** — standard Next.js deployment, environment variables in Vercel dashboard.

5. **QR code generation** — generate QR codes encoding `?place=<google_place_id>` URLs for physical placement.

---

## Git / Codespaces

- Repo: `github.com/johnsonadamc/Haiku-Review`
- Branch: `main`
- Always work on main. No feature branches unless explicitly requested.
- Commit and push after every meaningful change — don't batch everything at the end.
- Dev server: `npm run dev` in Codespaces terminal
- Build check: `npm run build` before committing

---

## What This Is Not

- Not a social network. No follows, no DMs, no profiles.
- Not gamified. No streaks, no points, no leaderboards.
- Not a recommendation engine. The AI builds journeys — it doesn't surface "popular" content.
- Not optimized for engagement. Slow transitions, contemplative pacing, no infinite scroll.
- Not trying to scale to millions of users. Small, careful, meaningful.

---

## Tone of the Codebase

Write code the way the app feels. Deliberate. No shortcuts that compromise the experience. Variable names that are clear. Comments only where the why isn't obvious. The person reading this code should feel the same care as the person reading a haiku on a park bench.