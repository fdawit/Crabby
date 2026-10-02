import { db, type Rating, type Spot, type Visit } from '../db'
import { localDayKey } from './dates'
import { newId } from './id'

export interface NewSpotInput {
  name: string
  lat: number
  lng: number
}

export interface VisitInput {
  /** An existing spot's id, or the details of a spot to create. */
  spot: { id: string } | NewSpotInput
  startedAt: string
  keepers: number
  throwbacks: number
  pots: number | null
  rating: Rating
  notes: string
}

/** Creates or updates a visit (and its spot, if new). Returns the visit id. */
export async function saveVisit(input: VisitInput, existingId?: string): Promise<string> {
  return db.transaction('rw', db.spots, db.visits, async () => {
    const now = new Date().toISOString()
    let spotId: string
    if ('id' in input.spot) {
      spotId = input.spot.id
    } else {
      spotId = newId()
      await db.spots.add({
        id: spotId,
        name: input.spot.name.trim(),
        lat: input.spot.lat,
        lng: input.spot.lng,
        notes: '',
        createdAt: now,
        archived: false,
      })
    }

    const fields = {
      spotId,
      startedAt: input.startedAt,
      keepers: input.keepers,
      throwbacks: input.throwbacks,
      pots: input.pots,
      rating: input.rating,
      notes: input.notes.trim(),
      updatedAt: now,
    }
    if (existingId) {
      await db.visits.update(existingId, fields)
      return existingId
    }
    const id = newId()
    await db.visits.add({ id, createdAt: now, ...fields })
    return id
  })
}

export async function deleteVisit(id: string): Promise<void> {
  await db.visits.delete(id)
}

export interface DayGroup {
  day: string
  visits: Visit[]
  keepers: number
  throwbacks: number
}

/** Groups visits by local calendar day, newest day first; visits within a day newest first. */
export function groupByDay(visits: readonly Visit[]): DayGroup[] {
  const sorted = [...visits].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const groups: DayGroup[] = []
  for (const v of sorted) {
    const day = localDayKey(v.startedAt)
    let g = groups.at(-1)
    if (!g || g.day !== day) {
      g = { day, visits: [], keepers: 0, throwbacks: 0 }
      groups.push(g)
    }
    g.visits.push(v)
    g.keepers += v.keepers
    g.throwbacks += v.throwbacks
  }
  return groups
}

export interface SeasonSummary {
  year: number
  keepers: number
  throwbacks: number
  visits: number
  days: number
}

export function seasonSummary(visits: readonly Visit[], year: number): SeasonSummary {
  const inYear = visits.filter((v) => new Date(v.startedAt).getFullYear() === year)
  return {
    year,
    keepers: inYear.reduce((n, v) => n + v.keepers, 0),
    throwbacks: inYear.reduce((n, v) => n + v.throwbacks, 0),
    visits: inYear.length,
    days: new Set(inYear.map((v) => localDayKey(v.startedAt))).size,
  }
}

export function spotsById(spots: readonly Spot[]): Map<string, Spot> {
  return new Map(spots.map((s) => [s.id, s]))
}
