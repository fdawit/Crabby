#!/usr/bin/env node
/**
 * Generates a realistic, fictional six-season crabbing log for the San Juan Islands
 * (WDFW Marine Area 7), as a Crabby backup file plus a CSV of the same visits.
 *
 *   node scripts/generate-sample-data.mjs [outDir]   (default: sample-data/)
 *
 * Deterministic: the same seed always produces the same file.
 *
 * Built to follow the real rules and rhythms closely enough to exercise every feature:
 * - Summer season mid-July to Sept 30, open Thursday–Monday only; winter season Oct–Dec.
 * - Daily limit per licensed crabber: 5 Dungeness + 6 red rock. Usually two aboard.
 * - 2 pots per person, so 4 pots a day split across 1–3 spots.
 * - Catch is best at the July opener and declines as the season is fished down; soft-shell
 *   crabs (thrown back) peak in late summer.
 * - Spatial pattern for the analysis phase: a hot cluster on the west side of San Juan
 *   Island and in Griffin Bay, cold water around Friday Harbor and East Sound, and one
 *   poor spot (Mosquito Pass) sitting inside the hot cluster.
 * - A duplicate spot ("Westcot bay", ~40 m from Westcott Bay) for testing merge.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const outDir = process.argv[2] ?? 'sample-data'
const TODAY = new Date('2026-10-03T12:00:00-07:00')

// ---------------------------------------------------------------------------
// Deterministic randomness

let state = 0x5eed2026
function rand() {
  // mulberry32
  state = (state + 0x6d2b79f5) | 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const chance = (p) => rand() < p
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (lo, hi) => lo + rand() * (hi - lo)
const int = (lo, hi) => Math.floor(between(lo, hi + 1))
function gaussian() {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
}
function poisson(mean) {
  if (mean <= 0) return 0
  const L = Math.exp(-mean)
  let k = 0
  let p = 1
  do {
    k++
    p *= rand()
  } while (p > L)
  return k - 1
}
function weightedPick(items, weight) {
  const total = items.reduce((n, x) => n + weight(x), 0)
  let r = rand() * total
  for (const x of items) {
    r -= weight(x)
    if (r <= 0) return x
  }
  return items.at(-1)
}

// ---------------------------------------------------------------------------
// Spots. kpp = Dungeness keepers per pot at the July opener in an average year.
// redRock = red rock keepers per pot (rocky ground has more). fav = how often she
// chooses it once she knows it. from = first season she fished it.

const SPOTS = [
  // West side of San Juan Island: the hot cluster
  { key: 'westcott', name: 'Westcott Bay', lat: 48.5975, lng: -123.153, kpp: 2.7, redRock: 0.2, fav: 9, from: 2021,
    notes: 'Mud bottom, 25–35 ft. Set south of the oyster floats, not among them.' },
  { key: 'garrison', name: 'Garrison Bay', lat: 48.589, lng: -123.161, kpp: 2.4, redRock: 0.2, fav: 7, from: 2021,
    notes: 'Anchor off English Camp and run pots toward the middle of the bay.' },
  { key: 'mitchell', name: 'Mitchell Bay entrance', lat: 48.5655, lng: -123.1725, kpp: 2.2, redRock: 0.4, fav: 4, from: 2022, notes: '' },
  { key: 'nelson', name: 'Nelson Bay (Henry Is.)', lat: 48.596, lng: -123.188, kpp: 2.5, redRock: 0.3, fav: 8, from: 2024,
    notes: 'Found this one in 2024. Sand and eelgrass edge, 40 ft.' },
  { key: 'mosquito', name: 'Mosquito Pass', lat: 48.5905, lng: -123.172, kpp: 0.5, redRock: 0.4, fav: 1.2, from: 2021,
    notes: 'Current rips through here. Pots walk on big exchanges. Only try at slack.' },
  // Griffin Bay: also good
  { key: 'griffin-n', name: 'Griffin Bay north', lat: 48.508, lng: -122.99, kpp: 2.0, redRock: 0.3, fav: 6, from: 2021, notes: '' },
  { key: 'griffin-s', name: 'Griffin Bay off Fourth of July Beach', lat: 48.485, lng: -122.98, kpp: 2.2, redRock: 0.3, fav: 5, from: 2021,
    notes: 'Gets crowded on opening weekend.' },
  // Around Friday Harbor: cold
  { key: 'brown', name: 'Brown Island south', lat: 48.536, lng: -123.006, kpp: 0.45, redRock: 0.2, fav: 1.5, from: 2021,
    notes: 'Close to home but ferry wakes. Mostly females and shorts.' },
  { key: 'caution', name: 'Off Point Caution', lat: 48.564, lng: -123.017, kpp: 0.55, redRock: 0.25, fav: 1.2, from: 2021, notes: '' },
  // Lopez
  { key: 'fisherman', name: 'Fisherman Bay entrance', lat: 48.524, lng: -122.923, kpp: 1.4, redRock: 0.4, fav: 2.5, from: 2021,
    notes: 'Stay outside the spit; shallow inside at low tide.' },
  { key: 'mackaye', name: 'Mackaye Harbor', lat: 48.439, lng: -122.88, kpp: 1.7, redRock: 0.5, fav: 1.5, from: 2022, notes: 'Long run. Good when the west side is crowded.' },
  { key: 'shoal', name: 'Shoal Bay (Lopez)', lat: 48.553, lng: -122.877, kpp: 1.2, redRock: 0.3, fav: 1, from: 2023, notes: '' },
  // Orcas and Shaw
  { key: 'deer', name: 'Deer Harbor', lat: 48.615, lng: -123.005, kpp: 1.5, redRock: 0.7, fav: 2.5, from: 2021, notes: '' },
  { key: 'westsound', name: 'West Sound', lat: 48.629, lng: -122.964, kpp: 1.3, redRock: 0.4, fav: 1.5, from: 2021, notes: '' },
  { key: 'eastsound', name: 'East Sound (Orcas)', lat: 48.645, lng: -122.893, kpp: 0.5, redRock: 0.2, fav: 0.6, from: 2021,
    notes: 'Long run from Friday Harbor. Rarely worth it.' },
  { key: 'blind', name: 'Blind Bay (Shaw)', lat: 48.5835, lng: -122.937, kpp: 1.1, redRock: 0.4, fav: 1.2, from: 2022, notes: '' },
]

// The duplicate: logged twice in 2022 with a sloppy name and a GPS fix ~40 m off.
const DUPLICATE = { key: 'westcot-dupe', name: 'Westcot bay', lat: 48.5978, lng: -123.1525, notes: '' }

// Abundance by season (2022 was a lean year, 2023 a strong one).
const YEAR_ABUNDANCE = { 2021: 1.0, 2022: 0.8, 2023: 1.2, 2024: 0.9, 2025: 1.05, 2026: 1.1 }

// Summer openers (a Thursday in mid-July) and planned trip counts.
const SEASONS = {
  2021: { open: '2021-07-15', trips: 19, winterTrips: 4 },
  2022: { open: '2022-07-14', trips: 15, winterTrips: 3 },
  2023: { open: '2023-07-13', trips: 22, winterTrips: 6 },
  2024: { open: '2024-07-18', trips: 21, winterTrips: 5 },
  2025: { open: '2025-07-17', trips: 23, winterTrips: 5 },
  2026: { open: '2026-07-16', trips: 22, winterTrips: 2 },
}

// ---------------------------------------------------------------------------
// Time helpers. Times are Pacific; stored as UTC ISO strings like the app does.

function pacificToIso(y, m, d, hh, mm) {
  // Try PDT (UTC-7), then PST (UTC-8); keep whichever round-trips.
  for (const offset of [7, 8]) {
    const utc = new Date(Date.UTC(y, m - 1, d, hh + offset, mm))
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(utc)
    if (Number(parts.find((p) => p.type === 'hour').value) === hh) return utc.toISOString()
  }
  throw new Error('bad time')
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const weekday = (dateStr) => new Date(`${dateStr}T12:00:00Z`).getUTCDay() // 0 = Sun

/** Multiplier for how many keepers are left as the season is fished down. */
function seasonDecline(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number)
  const dayOfSeason = (m - 7) * 31 + d - 14 // ~0 at the opener
  if (m >= 10) return 0.75 // winter: fewer crabs, but hard-shelled
  return Math.max(0.55, 1.3 - dayOfSeason * 0.011)
}

/** Extra soft-shell throwbacks per pot: peaks late August into September. */
function softShell(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number)
  if (m === 7) return 0.3
  if (m === 8) return d < 15 ? 1.2 : 2.5
  if (m === 9) return 2.8
  return 0.4
}

// ---------------------------------------------------------------------------
// Trip days

function summerDays(year) {
  const { open, trips } = SEASONS[year]
  const open_days = []
  for (let d = open; d <= `${year}-09-30`; d = addDays(d, 1)) {
    if ([4, 5, 6, 0, 1].includes(weekday(d))) open_days.push(d) // Thu–Mon only
  }
  // Always fish the opener; favor weekends and the first weeks.
  const chosen = new Set([open])
  while (chosen.size < trips) {
    const d = weightedPick(open_days, (x) => {
      if (chosen.has(x)) return 0
      const early = x < addDays(open, 21) ? 2 : 1
      const weekend = [6, 0].includes(weekday(x)) ? 1.6 : 1
      return early * weekend
    })
    chosen.add(d)
  }
  return [...chosen].sort()
}

function winterDays(year) {
  const n = SEASONS[year].winterTrips
  const days = new Set()
  const last = year === 2026 ? '2026-10-02' : `${year}-12-20`
  // 2026: one trip each of the first two days of the winter opener so far.
  if (year === 2026) return ['2026-10-01', '2026-10-02']
  while (days.size < n) {
    const d = addDays(`${year}-10-01`, Math.floor(Math.pow(rand(), 1.6) * 80))
    if (d <= last) days.add(d)
  }
  return [...days].sort()
}

// ---------------------------------------------------------------------------
// Notes

const BAITS = ['Chicken backs', 'Turkey necks', 'Salmon heads', 'Chicken + clams', 'Mink food', 'Herring + chicken']
const CALM = ['Flat calm.', 'Light N breeze.', 'Glassy morning.', 'Fog until 11, then sun.', 'Overcast, calm.']
const ROUGH = ['SW 15 kt, choppy, pulled early.', 'Wind came up after noon.', 'Big swell in the strait, stayed inside.']
const OBS_GOOD = ['Big males, lots over 7 in.', 'Hard shells, full of meat.', 'Every pot had keepers.', 'Pots stuffed.']
const OBS_MEH = ['Lots of females.', 'Shorts everywhere.', 'Starfish in every pot.', 'Seals hanging around the buoys.', 'Sculpins ate half the bait.']
const OBS_SOFT = ['Lots of softshells, threw them back.', 'Molting: half the legal males were soft.', 'Softshells everywhere.']

function composeNotes(ctx) {
  const parts = []
  if (ctx.event) parts.push(ctx.event)
  if (ctx.limitedOut) parts.push('Limited out on Dungeness.')
  if (ctx.first || chance(0.3)) parts.push(`${ctx.bait}${ctx.soakHours ? `, soaked ${ctx.soakHours} hrs` : ''}.`)
  if (ctx.windy && ctx.first) parts.push(pick(ROUGH))
  else if (ctx.first && chance(0.25)) parts.push(pick(CALM))
  if (ctx.softShells > 4 * Math.max(1, ctx.pots ?? 1) && chance(0.6)) parts.push(pick(OBS_SOFT))
  else if (ctx.goodHaul && chance(0.4)) parts.push(pick(OBS_GOOD))
  else if (ctx.poorHaul && chance(0.45)) parts.push(pick(OBS_MEH))
  if (ctx.redRock >= 3 && chance(0.6)) parts.push(`${ctx.dungeness} Dungeness, ${ctx.redRock} red rock.`)
  // About a third of visits get no note at all; she isn't always in the mood.
  if (!ctx.event && !ctx.limitedOut && chance(0.35)) return ''
  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Simulation

const spotsOut = []
const visitsOut = []
const firstVisit = new Map()
let visitSeq = 0

function chooseSpots(year, n, date) {
  const known = SPOTS.filter((s) => s.from <= year)
  const chosen = []
  while (chosen.length < n) {
    const s = weightedPick(known, (x) => {
      if (chosen.includes(x)) return 0
      // Early seasons she explored more; later she sticks to favorites.
      const explore = year <= 2022 ? 1.6 : 1
      const w = Math.pow(x.fav, 1 / explore)
      // Combine spots that are near each other on the same day.
      const near = chosen.length && Math.abs(chosen[0].lng - x.lng) < 0.06 ? 3 : 1
      // Winter: shorter runs from Friday Harbor.
      const winter = date.slice(5, 7) >= '10' && Math.abs(x.lng + 123.0) > 0.12 ? 0.4 : 1
      return w * near * winter
    })
    chosen.push(s)
  }
  return chosen
}

function simulateDay(year, date) {
  const crew = chance(0.82) ? 2 : 1
  const potLimit = 2 * crew
  const winter = date.slice(5, 7) >= '10'
  const windy = chance(winter ? 0.35 : 0.12)
  const nSpots = windy ? 1 : weightedPick([1, 2, 3], (k) => ({ 1: 2, 2: 5, 3: crew === 2 ? 2 : 0 })[k])
  const spots = chooseSpots(year, nSpots, date)
  const potsSplit =
    nSpots === 1 ? [potLimit] : nSpots === 2 ? [potLimit / 2, potLimit / 2] : [2, 1, 1]
  const bait = pick(BAITS)
  const limits = { dungeness: 5 * crew, redRock: 6 * crew }
  const kept = { dungeness: 0, redRock: 0 }
  let time = int(9, 12) * 60 + pick([0, 15, 30, 45])
  const recordsPots = chance(year <= 2022 ? 0.65 : 0.95)

  spots.forEach((spot, i) => {
    if (kept.dungeness >= limits.dungeness && i > 0 && chance(0.7)) return // limited out; headed home
    let pots = potsSplit[i]
    let event = ''
    if (chance(0.025)) {
      event = 'Lost a pot. Buoy line cut, probably a prop.'
      pots = Math.max(1, pots - 1)
    } else if (spot.key === 'mosquito' && chance(0.5)) {
      event = 'Pots walked ~50 yds on the ebb.'
    } else if (chance(0.03)) {
      event = 'Escape cord on one pot rotted through; rebuilt it.'
    }

    // Visits to the duplicate spot: two 2022 trips to Westcott logged under the typo.
    let spotOut = spot
    if (year === 2022 && spot.key === 'westcott' && DUPLICATE.uses < 2) {
      DUPLICATE.uses++
      spotOut = DUPLICATE
    }

    const abundance = YEAR_ABUNDANCE[year] * seasonDecline(date) * Math.exp(gaussian() * 0.3)
    const windPenalty = windy ? 0.7 : 1 // shorter soak
    const legalD = poisson(spot.kpp * abundance * windPenalty * pots)
    const legalRR = poisson(spot.redRock * windPenalty * pots)
    const dungeness = Math.min(legalD, limits.dungeness - kept.dungeness)
    const redRock = Math.min(legalRR, limits.redRock - kept.redRock)
    kept.dungeness += dungeness
    kept.redRock += redRock
    const releasedLegal = legalD - dungeness + (legalRR - redRock)
    const softShells = poisson(softShell(date) * pots)
    const throwbacks =
      poisson((3.2 + 1.5 * (1 - spot.kpp / 2.7)) * pots) + softShells + releasedLegal
    const keepers = dungeness + redRock

    // Rate on what was in the pots, not what she was allowed to keep after limiting out.
    const perPot = legalD / pots
    let rating = 1 + 4 * Math.min(1, perPot / 2.4) + gaussian() * 0.55
    if (event.startsWith('Lost')) rating -= 1
    if (softShells > 3 * pots) rating -= 0.4
    rating = Math.max(1, Math.min(5, Math.round(rating)))

    const [y, m, d] = date.split('-').map(Number)
    const startedAt = pacificToIso(y, m, d, Math.floor(time / 60), time % 60)
    time += int(35, 75)

    const notes = composeNotes({
      first: i === 0,
      bait,
      soakHours: i === 0 && chance(0.5) ? int(3, 8) : 0,
      windy,
      event,
      limitedOut: kept.dungeness >= limits.dungeness && dungeness > 0,
      softShells,
      goodHaul: perPot >= 2,
      poorHaul: perPot < 0.8,
      dungeness,
      redRock,
      pots,
    })

    if (!firstVisit.has(spotOut.key)) firstVisit.set(spotOut.key, startedAt)
    visitsOut.push({
      id: `sample-v-${String(++visitSeq).padStart(4, '0')}`,
      spotId: `sample-s-${spotOut.key}`,
      startedAt,
      keepers,
      throwbacks,
      pots: recordsPots ? pots : null,
      rating,
      notes,
      createdAt: startedAt,
      updatedAt: startedAt,
    })
  })
}

DUPLICATE.uses = 0
for (const year of Object.keys(SEASONS).map(Number)) {
  for (const date of [...summerDays(year), ...winterDays(year)]) {
    if (new Date(`${date}T12:00:00-07:00`) < TODAY) simulateDay(year, date)
  }
}

for (const s of [...SPOTS, DUPLICATE]) {
  if (!firstVisit.has(s.key)) continue
  spotsOut.push({
    id: `sample-s-${s.key}`,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    notes: s.notes,
    createdAt: firstVisit.get(s.key),
    archived: false,
  })
}

// ---------------------------------------------------------------------------
// Output

mkdirSync(outDir, { recursive: true })
const backup = {
  app: 'crabby',
  version: 1,
  exportedAt: TODAY.toISOString(),
  spots: spotsOut,
  visits: visitsOut,
}
writeFileSync(join(outDir, 'crabby-sample-backup.json'), JSON.stringify(backup, null, 2) + '\n')

const spotById = new Map(spotsOut.map((s) => [s.id, s]))
const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const rows = [['date', 'time', 'spot', 'latitude', 'longitude', 'keepers', 'throwbacks', 'pots', 'rating', 'notes']]
for (const v of visitsOut) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(v.startedAt)).map((x) => [x.type, x.value]))
  const s = spotById.get(v.spotId)
  rows.push([`${p.year}-${p.month}-${p.day}`, `${p.hour}:${p.minute}`, s.name, s.lat, s.lng, v.keepers, v.throwbacks, v.pots, v.rating, v.notes])
}
writeFileSync(join(outDir, 'crabby-sample-visits.csv'), rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n')

console.log(`${spotsOut.length} spots, ${visitsOut.length} visits → ${outDir}/`)
