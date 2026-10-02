import { db, type Rating, type Spot, type Visit } from '../db'

export async function addSpot(id: string, name: string, lat = 48.55, lng = -123.0): Promise<Spot> {
  const spot = { id, name, lat, lng, notes: '', createdAt: '', archived: false }
  await db.spots.add(spot)
  return spot
}

let n = 0
export function makeVisit(
  spotId: string,
  when: Date,
  keepers: number,
  rating: Rating,
  extra: Partial<Visit> = {},
): Visit {
  return {
    id: `v${++n}`,
    spotId,
    startedAt: when.toISOString(),
    keepers,
    throwbacks: 0,
    pots: null,
    rating,
    notes: '',
    createdAt: '',
    updatedAt: '',
    ...extra,
  }
}
