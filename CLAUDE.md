# CLAUDE.md — Haiku Review

Last updated: May 2026

---

## What This Is

Haiku Review is a place-memory art project disguised as an app. People leave three lines — 5-7-5 — about a specific named place. Those lines accumulate over time, layered like sediment. Someone else reads them standing in the same spot, months or years later.

It is not a social media app. It is not trying to grow aggressively. It is deliberate slowcial media — the antithesis of dopamine-driven engagement. The experience should feel like discovering something left behind, not like a feed.

It is also, straightforwardly, an art project. Build it like one.

---

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Database + Auth + Storage:** Supabase
- **Styling:** Tailwind CSS with custom CSS variables — no component libraries
- **Map:** Mapbox GL JS (token required — placeholder canvas map until provided)
- **AI Journeys:** Anthropic API (`claude-sonnet-4-6`) — called from the server, never the client
- **Deployment:** Vercel
- **Dev:** GitHub Codespaces

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
- Haiku stage padding: `0 110px 56px 52px` (right side clear of vote area)
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

---

## Features

### 1. Haiku Viewer (Primary Surface)
- Full-bleed photo/scene background
- Haiku lines reveal staggered: 400ms / 760ms / 1100ms delays
- Location tag appears at 180ms
- Author appears at 1540ms
- `← prev` / `next →` navigation, keyboard arrows, swipe gestures
- **Hold mechanic:** long-press (800ms) anywhere on the haiku stage triggers a gold ripple and increments the post's `held` count silently. No count shown to the reader. Hint text "hold anywhere to remember" appears faintly after 2200ms.

### 2. Location Tag → Map Entry
- Location tag at bottom-left is the only map entry point
- Tap opens the map overlay
- Tag shows city/place name, has a `›` arrow that slides in on hover
- Do NOT add a "Places" button elsewhere

### 3. Map
- Full-screen overlay, parchment background
- Sumi-ink aesthetic: parchment land, cool grey-blue water, hairline ink shorelines, faint lat/lng grid lines
- Place dots sized proportionally to haiku count at that location
- Hover: tooltip with place name, city, haiku count
- Click: closes map, triggers AI journey from that place
- Pan (drag), zoom (wheel/pinch)
- **Mapbox:** Use Mapbox GL JS with custom style when token provided. Until then, canvas placeholder that matches the aesthetic exactly.
- The map is a **placeholder** architecture — isolate all rendering in `drawMap()` / `renderPlaceDots()` functions ready to swap.

### 4. AI Journeys
- Triggered by tapping a place dot on the map
- Calls `claude-sonnet-4-6` via server action (never client-side)
- Claude receives all haiku data, a randomly selected thread type, and the starting place
- Claude returns: ordered sequence of haiku IDs + poetic bridge phrases between each
- Thread types rotate randomly: 'emotional resonance' | 'time of day' | 'the texture of silence' | 'figures seen from a distance' | 'the weight of memory' | 'threshold moments' | 'what is left unsaid' | 'light and its quality' | 'solitude in crowds' | 'the presence of absence'
- Between each haiku: thread type + bridge phrase fades in at center screen for ~2s, then fades out as new haiku reveals
- Gold progress bar at top of screen shows journey position
- `← all haikus` button appears bottom-left during journey
- At journey end: "end of journey" toast, navigation stops

### 5. Submit
- Accessed via `+ Submit` button top-right
- Full-screen overlay
- Fields: photo upload, name (optional), specific place search, haiku textarea
- **Place search:** Google Places API autocomplete — resolves to named venue with lat/lng. No city dropdowns.
- **Syllable indicator:** three thin bars below textarea, green = correct count (5/7/5), red = off
- After submit: shows the single most recent other haiku from that same location before returning to viewer ("someone else was here too")

### 6. Temporal Scroll
- At a location with multiple haikus, they are ordered chronologically oldest→newest
- The viewer can navigate forward/backward through the timeline of a place
- This is the core archival feature — years of haikus accumulating at a single bench

---

## Database Schema (Supabase)

```sql
-- Places: specific named venues with coordinates
places (
  id uuid primary key,
  name text not null,           -- "Fushimi Inari Shrine"
  city text,                    -- "Kyoto, Japan"
  google_place_id text unique,  -- Google Places ID for deduplication
  lat float, lng float,
  haiku_count int default 0,    -- denormalized for map performance
  created_at timestamptz
)

-- Haikus: the primary content unit
haikus (
  id uuid primary key,
  place_id uuid references places(id),
  author text,                  -- nullable, display name only
  line_1 text not null,
  line_2 text not null,
  line_3 text not null,
  photo_url text,               -- Supabase storage URL
  held_count int default 0,     -- incremented by hold gesture
  created_at timestamptz        -- the temporal layer key
)

-- Holds: anonymous gesture records
holds (
  id uuid primary key,
  haiku_id uuid references haikus(id),
  session_id text,              -- anonymous session fingerprint
  created_at timestamptz,
  unique(haiku_id, session_id)  -- one hold per session per haiku
)
```

RLS: haikus and places are publicly readable. Inserts require a valid session. Holds are insert-only per session.

---

## API Routes

```
GET  /api/haikus?place_id=&order=asc   -- temporal feed for a place
POST /api/haikus                        -- submit new haiku
POST /api/holds                         -- record a hold (anonymous)
GET  /api/places/search?q=             -- Google Places autocomplete proxy
GET  /api/places/:id                    -- single place with recent haikus
POST /api/journey                       -- build AI journey (server action)
```

The journey endpoint calls `claude-sonnet-4-6` server-side. Never expose the Anthropic API key to the client.

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

Always have a fallback if parsing fails — random shuffle with preset bridges.

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Haiku viewer — primary surface
│   ├── api/
│   │   ├── haikus/route.ts
│   │   ├── holds/route.ts
│   │   ├── places/
│   │   │   ├── search/route.ts     # Google Places proxy
│   │   │   └── [id]/route.ts
│   │   └── journey/route.ts        # Claude API call
├── components/
│   ├── HaikuViewer.tsx             # Full-bleed haiku display
│   ├── HaikuLines.tsx              # Staggered line reveal
│   ├── LocationTag.tsx             # Map entry trigger
│   ├── MapOverlay.tsx              # Full-screen map
│   ├── PlaceholderMap.tsx          # Canvas map (pre-Mapbox)
│   ├── JourneyPlayer.tsx           # Journey mode controller
│   ├── SubmitPanel.tsx             # Submit overlay
│   ├── PlaceSearch.tsx             # Google Places autocomplete
│   ├── HoldMechanic.tsx            # Long-press + ripple
│   └── TemporalScroll.tsx          # Chronological place navigation
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── haikus.ts
│   │   ├── places.ts
│   │   └── holds.ts
│   ├── journey.ts                  # Claude journey builder
│   ├── syllables.ts                # 5-7-5 counter
│   └── map/
│       ├── placeholder.ts          # Canvas map renderer
│       └── mapbox.ts               # Mapbox integration (ready to activate)
└── styles/
    └── globals.css                 # CSS variables
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=          # blank until provided — app falls back to canvas map
GOOGLE_PLACES_API_KEY=
```

---

## Key Gotchas

**Never call the Anthropic API from the client.** Journey building must go through `/api/journey` server route.

**`white-space: nowrap` on all haiku lines.** Without this, long lines wrap and ruin the composition.

**The photo wash layer is z-index 1, above the photo.** The parchment gradient sits over the image — this is intentional and critical to the ink-on-paper feel.

**Hold mechanic uses `mousedown`/`touchstart` on the haiku stage, not on individual elements.** The whole stage is the target. Clear the timer on `mouseup`, `mouseleave`, `touchend`.

**Place dots on the map are sized by `haiku_count`.** Use the denormalized count column — don't count joins on every map render.

**Temporal order is `created_at ASC` within a place.** Oldest haiku first. The reader scrolls forward through time.

**The wipe transition is parchment-colored, never black.** `background: var(--parchment-2)` — feels like turning a page.

**Google Places proxy is required.** Never expose the Google Places API key in client-side code. All autocomplete requests go through `/api/places/search`.

**Syllable counter is approximate.** Use vowel-group counting — it's good enough for haiku. Don't overcorrect or make it a gate. It guides, it doesn't block.

**After submission, show one previous haiku from the same place.** Not a feed. One haiku. Then return to the viewer. This is the "someone else was here too" moment and it's important.

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
