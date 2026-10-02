import type { Visit } from '../db'

/**
 * A crabbing season is a calendar year. In the San Juan Islands (WDFW Marine Area 7) the
 * summer and winter recreational seasons both fall inside one year, so nothing straddles
 * New Year's.
 */
export function seasonOf(iso: string): number {
  return new Date(iso).getFullYear()
}

export function currentSeason(): number {
  return new Date().getFullYear()
}

/** Which visits to count: a season (or every season), optionally narrowed to one month. */
export interface Period {
  season: number | 'all'
  /** 0 = January … 11 = December */
  month: number | 'all'
}

export function inPeriod(v: Visit, p: Period): boolean {
  const d = new Date(v.startedAt)
  return (
    (p.season === 'all' || d.getFullYear() === p.season) &&
    (p.month === 'all' || d.getMonth() === p.month)
  )
}

export interface SpotStats {
  visits: number
  keepers: number
  throwbacks: number
  /** Average visit rating, 1–5; null with no visits. This is the spot's quality score. */
  score: number | null
  keepersPerVisit: number | null
  /** Over only the visits where pots were recorded; null if none were. */
  keepersPerPot: number | null
  lastVisit: string | null
}

export const EMPTY_STATS: SpotStats = {
  visits: 0,
  keepers: 0,
  throwbacks: 0,
  score: null,
  keepersPerVisit: null,
  keepersPerPot: null,
  lastVisit: null,
}

export function computeStats(visits: readonly Visit[]): SpotStats {
  if (visits.length === 0) return EMPTY_STATS
  let keepers = 0
  let throwbacks = 0
  let ratingSum = 0
  let potKeepers = 0
  let pots = 0
  let lastVisit = visits[0].startedAt
  for (const v of visits) {
    keepers += v.keepers
    throwbacks += v.throwbacks
    ratingSum += v.rating
    if (v.pots != null && v.pots > 0) {
      potKeepers += v.keepers
      pots += v.pots
    }
    if (v.startedAt > lastVisit) lastVisit = v.startedAt
  }
  return {
    visits: visits.length,
    keepers,
    throwbacks,
    score: ratingSum / visits.length,
    keepersPerVisit: keepers / visits.length,
    keepersPerPot: pots > 0 ? potKeepers / pots : null,
    lastVisit,
  }
}

/** Stats for each spot over the visits inside `period`. Spots with no such visits are absent. */
export function statsBySpot(visits: readonly Visit[], period: Period): Map<string, SpotStats> {
  const bySpot = new Map<string, Visit[]>()
  for (const v of visits) {
    if (!inPeriod(v, period)) continue
    const list = bySpot.get(v.spotId)
    if (list) list.push(v)
    else bySpot.set(v.spotId, [v])
  }
  return new Map([...bySpot].map(([id, list]) => [id, computeStats(list)]))
}

/** Seasons that have at least one visit, newest first, always including the current one. */
export function seasonsWithData(visits: readonly Visit[]): number[] {
  const seasons = new Set(visits.map((v) => seasonOf(v.startedAt)))
  seasons.add(currentSeason())
  return [...seasons].sort((a, b) => b - a)
}

/** Month with the most keepers per visit, among months with at least `minVisits` visits. */
export function bestMonth(
  visits: readonly Visit[],
  minVisits = 2,
): { month: number; keepersPerVisit: number; visits: number } | null {
  const byMonth = new Map<number, { keepers: number; visits: number }>()
  for (const v of visits) {
    const m = new Date(v.startedAt).getMonth()
    const agg = byMonth.get(m) ?? { keepers: 0, visits: 0 }
    agg.keepers += v.keepers
    agg.visits += 1
    byMonth.set(m, agg)
  }
  let best: { month: number; keepersPerVisit: number; visits: number } | null = null
  for (const [month, agg] of byMonth) {
    if (agg.visits < minVisits) continue
    const kpv = agg.keepers / agg.visits
    if (!best || kpv > best.keepersPerVisit) best = { month, keepersPerVisit: kpv, visits: agg.visits }
  }
  return best
}

export const MONTH_NAMES = Array.from({ length: 12 }, (_, m) =>
  new Date(2000, m, 1).toLocaleDateString(undefined, { month: 'long' }),
)

export function formatScore(score: number | null): string {
  return score == null ? '–' : score.toFixed(1)
}

export function formatRate(n: number | null): string {
  if (n == null) return '–'
  return n >= 10 ? n.toFixed(0) : n.toFixed(1)
}
