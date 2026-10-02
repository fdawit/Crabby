# Crabby: Design Proposal

Crabby replaces a spiral crabbing notebook. It logs every visit to a spot (when, where, how many crabs, how good it was, and notes), shows those spots on a color-coded map, and makes the history easy to search and compare.

Status: **draft for review.** No code has been written yet.

---

## 1. Requirements (from the feature list)

| # | Requirement | Where it's covered |
|---|---|---|
| R1 | Log date and time | Visit `startedAt` (defaults to now) |
| R2 | Location with coordinates | Spot `lat`/`lng`, filled from phone GPS or a tap on the map |
| R3 | Notes | Notes on each visit, plus standing notes on each spot |
| R4 | Each day's catch at each location | One Visit per spot per outing, with `catchCount` |
| R5 | Location quality on a scale | 1–5 `rating` on each visit; the spot shows a rolled-up score |
| R6 | Map with color-coded quality tags | Map screen, with pins colored by the spot's score |
| R7 | Easy to search | Search screen: text plus filters |
| R8 | Recent activity clearly laid out | Home screen feed |
| R9 | Look back at any location over time | Spot detail: chart and visit history |
| R10 | Look back at any day's results | Day view: every visit on a date |
| R11 | Phone on a boat **and** desktop at home | Responsive web app (PWA), offline-first, synced |
| R12 | Mobile-first design | Layouts are designed at 375px first, then widened |

---

## 2. Core concepts and data model

There are two main records. A "day" doesn't get its own table. It's just the visits grouped by date, which keeps logging fast and the data simple.

```
Spot                                  Visit
───────────────────────────           ────────────────────────────────
id            uuid                    id            uuid
name          text   "Pier 4 ladder"  spotId        → Spot.id
lat, lng      number (WGS84)          startedAt     datetime (local + tz)
notes         text   standing notes   catchCount    integer ≥ 0
createdAt     datetime                rating        1–5 (quality that visit)
archived      bool                    notes         text
                                      createdAt / updatedAt
```

**Why rate each visit and not each spot?** A spot can be great in July and dead in October. If she rates every visit, the app can work out a spot's quality *over time*, and those over-time patterns are what she's trying to find. The spot's map color comes from a **recent average rating** (default: the last 5 visits). It's computed, so she never has to update it by hand.

### Planned extensions (fields we can add later without breaking anything)
- Tide stage, weather and water temperature (could be filled in automatically from public APIs using time and location)
- Gear: number of pots or traps, bait type
- Keepers versus throwbacks, and male/female counts
- Photos

---

## 3. Screens

Mobile-first. On a phone the screens are tabs along the bottom. On desktop the same screens sit in a sidebar, and Map and List can be shown side by side.

```
┌──────────────────────────┐
│  Crabby            🔍    │
├──────────────────────────┤
│  This season: 412 crabs  │   HOME / RECENT ACTIVITY (R8)
│  Last trip: Sat · 3 spots│   - Season stats strip
│ ──────────────────────── │   - Feed of recent visits, grouped by day
│  SAT OCT 1               │   - Tap a day → Day view
│  ● Pier 4 ladder   18 ★4 │   - Tap a visit → Spot detail
│  ● Mud flats       6  ★2 │
│  FRI SEP 30              │
│  ● Rock jetty      22 ★5 │
│                          │
│        [ + Log catch ]   │   ← big thumb-reach button, always visible
├──────────────────────────┤
│ Home   Map   Spots Search│
└──────────────────────────┘
```

| Screen | Purpose | Key interactions |
|---|---|---|
| **Log catch** (R1–R5) | Record a visit in under 15 seconds | "Use my location" picks the nearest existing spot, or creates a new one. Large +/– stepper for count. 1–5 rating as big tap targets. Optional notes. Time defaults to now and can be edited. |
| **Home** (R8) | What's been happening lately | Feed grouped by day, plus season totals |
| **Map** (R6) | Spot patterns by location | Pins colored by quality, with the score printed in each pin. Filter by date range or season, so she can see "which spots were good *in September*". Tap a pin for a summary card. |
| **Spots** | Every location | Sort by score, total catch, last visited, or distance from her |
| **Spot detail** (R9) | One spot over time | Catch and rating chart over time, full visit list, standing notes, edit or move the pin |
| **Day view** (R10) | One date's results | Every visit that day, totals, and a mini map |
| **Search** (R7) | Find anything | Full-text search over notes and spot names. Filters for date range, rating, catch range and spot. Results can be shown as a list or on the map. |

### Boat-friendly UX rules
- Tap targets of at least 48px, with the main actions reachable by one thumb
- A high-contrast theme that stays readable in direct sun, plus a dark mode for early mornings
- Logging works **with no signal**, and entries sync later
- No dialogs that can be dismissed by accident. Edits save as she goes, and deletes can be undone.

### Color scale for quality
A 5-step scale from poor to great. The palette is chosen to work for colorblind users, and the number is also printed inside each pin, so color is never the only signal. Spots with no recent visits show as gray.

---

## 4. Recommended technical approach

**A Progressive Web App (PWA)**: a single website that she can "install" to her phone's home screen and also open in any desktop browser. One codebase covers both devices (R11). There's no app-store review, and it runs offline.

| Layer | Choice | Why |
|---|---|---|
| UI | React + TypeScript, built with Vite | Widely used and well supported |
| Styling | Tailwind CSS | Makes mobile-first responsive layouts quick to build |
| Map | Leaflet + OpenStreetMap tiles | Free, with no API key |
| On-device storage | IndexedDB (via Dexie) | Lets logging and browsing work fully offline on the boat |
| Sync + accounts | Supabase (hosted Postgres + auth) | Keeps phone and desktop in sync. Its free tier is more than enough. Row-level security keeps her spots private. |
| Charts | Recharts | Draws the spot-over-time charts |
| Offline / install | vite-plugin-pwa (service worker) | Makes the app installable and cached for offline use |
| Hosting | Static host (Netlify, Vercel or Cloudflare Pages) | Free, with HTTPS (which phone GPS requires) |

**Sync model:** every write goes to the local database first, so the app always responds instantly. A background sync pushes changes to Supabase when a connection is available. Conflicts are resolved with "last edit wins", which is fine for a single user across two devices.

**Known limitation:** map *tiles* only display offline for areas she has already viewed while online. Pins, logs and logging always work offline.

---

## 5. Build plan

Each phase ends with something she can actually use.

1. **Foundation.** Scaffold the project, set up the local database, the Log catch form with GPS, and the Home feed. *She can start logging on her phone (data stays on that device).*
2. **Map + Spots.** The color-coded map, nearest-spot matching, the Spots list and Spot detail with history. *Patterns become visible.*
3. **Look-back + Search.** Day view, search and filters, charts, and season stats.
4. **Sync + install.** Supabase accounts, phone↔desktop sync and the PWA install prompt.
5. **Backfill + polish.** CSV import (to type up the old notebook in a spreadsheet and import it), CSV export for backups, and accessibility and sunlight-contrast checks.

---

## 6. Open questions

1. **Rating each visit (recommended) or a single rating per spot?** See section 2.
2. **Accounts and sync.** Is a free hosted backend (Supabase) acceptable? The alternative is a device-only app with manual export/import, which avoids any backend but makes phone↔desktop sharing clunky.
3. **Catch detail.** Is a single number enough, or does she want keepers and throwbacks recorded separately?
4. **Sharing.** Is the app just for her, or might she ever share specific spots with others?
5. **Backfill.** Roughly how many notebook entries are there? This decides how much CSV import matters.
