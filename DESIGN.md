# Crabby: Design Proposal

Crabby replaces a spiral crabbing notebook. It logs every visit to a spot (when, where, how many crabs, how good it was, and notes), shows those spots on a color-coded map, and makes the history easy to search and compare.

Status: **approved, Phase 1 in progress.** Decisions are recorded in section 6.

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
| R13 | Keepers and throwbacks counted separately | Visit `keepers` and `throwbacks` |
| R14 | Bring in six years of notebook entries | CSV import with spot de-duplication (section 5) |
| R15 | Spatial autocorrelation to find the best spots | Analysis screen (section 4) |

---

## 2. Core concepts and data model

There are two main records. A "day" doesn't get its own table. It's just the visits grouped by date, which keeps logging fast and the data simple.

```
Spot                                  Visit
───────────────────────────           ────────────────────────────────
id            uuid                    id            uuid
name          text   "Pier 4 ladder"  spotId        → Spot.id
lat, lng      number (WGS84)          startedAt     datetime (local + tz)
notes         text   standing notes   keepers       integer ≥ 0
createdAt     datetime                throwbacks    integer ≥ 0
archived      bool                    pots          integer ≥ 1, optional
                                      rating        1–5 (quality that visit)
                                      notes         text
                                      createdAt / updatedAt
```

**Why rate each visit and not each spot?** A spot can be great in July and dead in October. If she rates every visit, the app can work out a spot's quality *over time*, and those over-time patterns are what she's trying to find. The spot's map color comes from a **recent average rating** (default: the last 5 visits). It's computed, so she never has to update it by hand.

### Planned extensions (fields we can add later without breaking anything)
- Tide stage, weather and water temperature (could be filled in automatically from public APIs using time and location)
- Bait type, male/female counts
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
| **Log catch** (R1–R5, R13) | Record a visit in under 15 seconds | "Use my location" picks the nearest existing spot, or creates a new one. Large +/– steppers for keepers and throwbacks; optional pots count. 1–5 rating as big tap targets. Optional notes. Time defaults to now and can be edited. |
| **Home** (R8) | What's been happening lately | Feed grouped by day, plus season totals |
| **Map** (R6) | Spot patterns by location | Pins colored by quality, with the score printed in each pin. Filter by date range or season, so she can see "which spots were good *in September*". Tap a pin for a summary card. |
| **Spots** | Every location | Sort by score, total catch, last visited, or distance from her |
| **Spot detail** (R9) | One spot over time | Catch and rating chart over time, full visit list, standing notes, edit or move the pin |
| **Day view** (R10) | One date's results | Every visit that day, totals, and a mini map |
| **Analysis** (R15) | Where the best water is | Hot/cold spot map, cluster labels, and a ranked "best areas" list (section 4) |
| **Search** (R7) | Find anything | Full-text search over notes and spot names. Filters for date range, rating, catch range and spot. Results can be shown as a list or on the map. |

### Boat-friendly UX rules
- Tap targets of at least 48px, with the main actions reachable by one thumb
- A high-contrast theme that stays readable in direct sun, plus a dark mode for early mornings
- Logging works **with no signal**, and entries sync later
- No dialogs that can be dismissed by accident. Edits save as she goes, and deletes can be undone.

### Color scale for quality
A 5-step scale from poor to great. The palette is chosen to work for colorblind users, and the number is also printed inside each pin, so color is never the only signal. Spots with no recent visits show as gray.

---

## 4. Spatial autocorrelation analysis

A spot's own history only says how *that* spot did. Spatial autocorrelation asks whether good spots **cluster**: is there a stretch of shoreline where everything nearby produces? Clusters are more trustworthy than one lucky spot, and they point to untried water next to proven water.

### Value being analysed
Per spot, over the selected date range or season, she picks one of:
- **Keepers per pot** (default when pots are recorded; otherwise keepers per visit). This is the best measure of how productive the water is.
- **Average rating**
- **Total catch per visit** (keepers + throwbacks)

Spots with few visits are noisy. Values are **shrunk toward the overall average** (empirical Bayes) in proportion to how few visits back them, and spots below a minimum visit count (default 2) can be excluded.

### Statistics
| Statistic | Answers | Shown as |
|---|---|---|
| **Global Moran's I** | "Overall, do good spots sit near good spots?" | One plain-language headline: *clustered*, *random* or *dispersed*, with its p-value |
| **Getis-Ord Gi\*** | "Where are the hot spots and cold spots?" | Map pins and shaded zones at 90/95/99% confidence |
| **Local Moran's I (LISA)** | "Which spots are part of a cluster, and which are outliers?" | Labels: high-high (hot cluster), low-low (cold cluster), high-low (a good spot in poor water), low-high (a dud in good water) |

- **Neighbors:** k-nearest neighbors (default k = 5) using real (haversine) distances. This copes with spots that are bunched in some places and sparse in others. A fixed distance band (e.g. 500 m) is offered as an alternative.
- **Significance:** a conditional permutation test (999 permutations), with a false-discovery-rate correction for the local statistics so a large map doesn't produce false hot spots by chance.
- **Seasons:** every statistic runs on the current date filter, so she can compare, say, "hot spots in June–July" with "hot spots in Sept–Oct".
- **Guard rails:** below about 20 spots the screen says that results are indicative only, and it hides significance labels below 10.

### "Where to try next"
The output is a ranked list of significant hot-spot clusters, each with its center, its strength and its best spot. It also flags low-high outliers (a dud spot sitting in good water, where moving the pots a little may help).

### Implementation
It runs entirely in the browser in a small TypeScript module (`src/analysis/`). Even six years of data is at most a few hundred spots, so even the brute-force O(n²) neighbor search with 999 permutations takes well under a second, and it works offline. The module is unit-tested against published PySAL reference values.

## 5. Recommended technical approach

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

## 6. Build plan

Each phase ends with something she can actually use.

1. **Foundation.** Scaffold the project, set up the local database, the Log catch form with GPS, the Home feed and a JSON backup export. *She can start logging on her phone (data stays on that device).*
2. **Map + Spots.** The color-coded map, nearest-spot matching, the Spots list and Spot detail with history. *Patterns become visible.*
3. **Sync + install.** A single Supabase account, phone↔desktop sync and the PWA install prompt.
4. **Notebook import.** Six years of entries is the bulk of the data, so this gets its own phase:
   - A spreadsheet template to transcribe the notebook into
   - Coordinates accepted as decimal degrees or degrees-minutes-seconds
   - Entries within a set distance (default 50 m) proposed as the same spot, for her to confirm or split before import
   - A dry-run preview showing errors before anything is saved
5. **Look-back + Search.** Day view, search and filters, charts, season and year-over-year stats.
6. **Spatial analysis.** Section 4.
7. **Polish.** CSV export, accessibility and sunlight-contrast checks.

---

## 7. Decisions

| Question | Decision |
|---|---|
| Rating per visit or per spot? | Per visit. A spot's score is computed from recent visits. |
| Hosted backend for sync? | Yes, Supabase. |
| Catch detail | Keepers and throwbacks counted separately. Pots per visit recorded optionally, so the analysis can use catch per pot. |
| Sharing | None. A single user, with all data private to her account. |
| Backfill | About six years of entries, so the CSV import is a full phase (phase 4). |
| Extra feature | Spatial autocorrelation analysis to find the best spots (section 4). |
