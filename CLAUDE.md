# CLAUDE.md — Haiku Review

Last updated: May 2026

---

## What This Is

Haiku Review is a place-memory art project disguised as an app. People leave three lines — 5-7-5 — about a specific named place. Those lines accumulate over time, layered like sediment. Someone else reads them standing in the same spot, months or years later.

It is not a social media app. It is not trying to grow aggressively. It is deliberate slowcial media — the antithesis of dopamine-driven engagement. The experience should feel like discovering something left behind, not like a feed.

It is also, straightforwardly, an art project. Build it like one.

---

## Current Build Status

The Next.js app is scaffolded and running. Supabase is connected with the schema deployed. The dev server runs on port 3000 in GitHub Codespaces.

**Working:**
- Next.js 16 App Router with TypeScript
- Supabase connected (places, haikus, holds tables live)
- Dev server running
- Basic haiku viewer rendering

**In progress / needs fixing:**
- Visual audit against `_design/haiku-review.html` prototype
- Various formatting and layout issues to correct
- AI journey feature needs Anthropic API key in .env.local
- Photo upload to Supabase storage not yet tested
- Google Places API not yet connected (using hardcoded suggestions)
- Mapbox not yet connected (using canvas placeholder)

**Not yet built:**
- Vercel deployment
- Temporal scroll (chronological haiku navigation within a place)
- QR code generation for physical placement

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database + Auth + Storage:** Supabase (`lopfvramjhsowjfkynrp`)
- **Styling:** Tailwind CSS with custom CSS variables — no component libraries
- **Map:** Canvas placeholder now — Mapbox GL JS when token provided (`NEXT_PUBLIC_MAPBOX_TOKEN`)
- **AI Journeys:** Anthropic API (`claude-sonnet-4-6`) — server-side only via `/api/journey`
- **Deployment:** Vercel (not yet deployed)
- **Dev:** GitHub Codespaces (`johnsonadamc/Haiku-Review`)

---

## Core Philosophy — Never Violate These

**The constraint is the product.** 5-7-5 is not a suggestion. It filters for intention. Every feature decision should ask: does this make the experience faster or slower, noisier or quieter? Slower and quieter is almost always right.

**Specific places, not cities.** Locations are *Fushimi Inari Shrine, Kyoto* and *Café de Flore, Paris* — not "Japan" or "Paris." Place specificity is the whole point. Use Google Places API for location search and resolution. Never a city dropdown.

**No engagement metrics shown to users.** No like counts, no follower counts, no view counts. The only public number is how many haikus exist at a location. The "held" mechanic (long-press to remember) is invisible — the holder knows they held it, the author sees a quiet count privately, nobody sees a ranking.

**The haiku is always the primary surface.** Full-bleed photo background, parchment wash, ink-on-paper text. Everything else — map, submit, journey — is a mode you enter and return from. Never let chrome compete with the poem.

**The map is secondary.** It opens from the location tag tap. It's beautiful but it's not the homepage.

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
- Hold hint: 2400ms

---

## Features

### 1. Haiku Viewer (Primary Surface)
- Full-bleed photo/scene background with SVG fallback scenes per location
- Haiku lines reveal staggered (see timings above)
- `← prev` / `next →` navigation, keyboard arrows (←→), swipe gestures
- **Hold mechanic:** long-press (800ms) anywhere on the haiku stage triggers a gold ripple and increments the post's `held_count` silently. No count shown to the reader. Hint text "hold anywhere · to remember this" appears faintly after 2400ms.
- Wordmark top-left: "Haiku" (Zen Old Mincho) / gold rule / "Review" (Shippori Mincho)
- `+ Submit` button top-right
- Vertical collection info label right side (N haikus · N places)

### 2. Location Tag → Map Entry
- Location tag at bottom-left is the ONLY map entry point
- Tap opens the map overlay
- Tag shows place name, has a `›` arrow that slides in on hover
- Do NOT add a "Places" button anywhere else

### 3. Map
- Full-screen overlay, parchment background
- Sumi-ink aesthetic: parchment land (#f0ebe0), cool grey-blue water (#d2d6db), hairline ink shorelines (rgba(30,26,20,0.16), 0.8px), faint lat/lng grid lines
- Place dots sized proportionally to haiku_count
- Hover: tooltip with place name, city, haiku count, gold rule
- Click dot: closes map, triggers AI journey from that place
- Pan (drag), zoom (wheel/pinch)
- All rendering isolated in `drawMapBase()` / `renderPlaceDots()` — ready to swap for Mapbox
- `NEXT_PUBLIC_MAPBOX_TOKEN` blank = canvas placeholder. When provided, swap to Mapbox GL JS.

### 4. AI Journeys
- Triggered by clicking a place dot on the map
- Calls `claude-sonnet-4-6` via `/api/journey` server route — NEVER from client
- Thread types rotate randomly: 'emotional resonance' | 'time of day' | 'the texture of silence' | 'figures seen from a distance' | 'the weight of memory' | 'threshold moments' | 'what is left unsaid' | 'light and its quality' | 'solitude in crowds' | 'the presence of absence'
- Between each haiku: thread type label + bridge phrase fades in center screen for ~2s, fades out as new haiku reveals
- Gold progress bar at top of screen shows journey position
- `← all haikus` button appears bottom-left during journey
- At journey end: "end of journey" toast, navigation stops
- Always fallback to random shuffle with preset bridges if JSON parsing fails

### 5. Submit
- Accessed via `+ Submit` button top-right
- Full-screen overlay
- Fields: photo upload (Supabase storage), name (optional), specific place search, haiku textarea
- **Place search:** calls `/api/places/search` — proxies Google Places API. Falls back to hardcoded suggestions if key missing.
- **Syllable indicator:** three thin bars below textarea. Green = correct (5/7/5). Red = off. Guides, never blocks.
- After submit: shows the single most recent other haiku from that same location before returning to viewer ("someone else was here too")

### 6. Temporal Scroll
- At a location with multiple haikus, ordered chronologically oldest → newest
- Navigate forward/backward through the timeline of a place
- `created_at ASC` always — oldest haiku first

---

## Database Schema (Supabase)

Live at: `https://lopfvramjhsowjfkynrp.supabase.co`
Schema file: `supabase/schema.sql` (already deployed)

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

Two helper functions deployed:
- `increment_held(haiku_id uuid)` — increments held_count
- `increment_haiku_count(place_id uuid)` — increments haiku_count on places

---

## API Routes

```
GET  /api/haikus?place_id=&order=asc   — temporal feed, falls back to seed data if empty
POST /api/haikus                        — create haiku + find-or-create place
POST /api/holds                         — record hold, deduplicate by session_id
GET  /api/places/search?q=             — Google Places proxy (falls back to hardcoded list)
POST /api/journey                       — build AI journey server-side only
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

Always fallback to random shuffle with preset bridges if parsing fails.

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

**`white-space: nowrap` on all haiku lines.** Without this, long lines wrap and ruin the composition.

**`src={bgSrc || undefined}` on the background img tag.** Never pass an empty string to src — causes browser to reload the page.

**The photo wash layer is z-index 1, above the photo.** The parchment gradient sits over the image — intentional and critical.

**Hold mechanic uses `mousedown`/`touchstart` on the haiku stage div.** The whole stage is the target. Clear timer on `mouseup`, `mouseleave`, `touchend`.

**Place dots on the map are sized by `haiku_count`.** Use the denormalized column — don't count joins on every render.

**Temporal order is `created_at ASC` within a place.** Oldest first. Reader scrolls forward through time.

**Wipe transition is parchment-colored, never black.** `background: var(--parchment-2)` — feels like turning a page.

**Google Places proxy is required.** Never expose `GOOGLE_PLACES_API_KEY` to the client.

**After submission, show one previous haiku from the same place.** Not a feed. One haiku. Then return to viewer.

**Seed data fallback.** When Supabase tables are empty, `GET /api/haikus` falls back to `lib/seed-data.ts`. This is intentional for development and early deployment.

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