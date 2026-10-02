import type { Visit } from '../db'
import { seasonOf } from './stats'

export interface ChartPoint {
  label: string
  keepers: number
  throwbacks: number
  rating: number
  /** Visits behind this point: 1 per visit, or the season's count when aggregated. */
  visits: number
}

/**
 * One point per visit for a single season; for all seasons, one point per season holding
 * per-visit averages (so a season with more trips doesn't look better just for that).
 */
export function chartPoints(visits: readonly Visit[], season: number | 'all'): ChartPoint[] {
  const sorted = [...visits].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  if (season !== 'all') {
    return sorted
      .filter((v) => seasonOf(v.startedAt) === season)
      .map((v) => ({
        label: new Date(v.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        keepers: v.keepers,
        throwbacks: v.throwbacks,
        rating: v.rating,
        visits: 1,
      }))
  }
  const bySeason = new Map<number, Visit[]>()
  for (const v of sorted) {
    const y = seasonOf(v.startedAt)
    bySeason.set(y, [...(bySeason.get(y) ?? []), v])
  }
  return [...bySeason].map(([y, list]) => {
    const avg = (f: (v: Visit) => number) => list.reduce((n, v) => n + f(v), 0) / list.length
    return {
      label: String(y),
      keepers: round1(avg((v) => v.keepers)),
      throwbacks: round1(avg((v) => v.throwbacks)),
      rating: round1(avg((v) => v.rating)),
      visits: list.length,
    }
  })
}

const round1 = (n: number) => Math.round(n * 10) / 10
