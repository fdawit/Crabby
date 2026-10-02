import { describe, expect, it } from 'vitest'
import { db, type Visit } from '../db'
import { groupByDay, saveVisit, seasonSummary } from './visits'

const base = { keepers: 0, throwbacks: 0, pots: null, rating: 3 as const, notes: '' }

function visit(id: string, startedAt: Date, keepers: number, throwbacks = 0): Visit {
  return {
    ...base,
    id,
    spotId: 's1',
    startedAt: startedAt.toISOString(),
    keepers,
    throwbacks,
    createdAt: '',
    updatedAt: '',
  }
}

describe('saveVisit', () => {
  it('creates a new spot along with the visit', async () => {
    const id = await saveVisit({
      ...base,
      spot: { name: '  Pier 4  ', lat: 38.9, lng: -76.4 },
      startedAt: '2026-07-04T12:00:00.000Z',
      keepers: 12,
      throwbacks: 5,
      notes: ' chicken necks ',
    })
    const saved = await db.visits.get(id)
    const spot = await db.spots.get(saved!.spotId)
    expect(spot?.name).toBe('Pier 4')
    expect(saved).toMatchObject({ keepers: 12, throwbacks: 5, notes: 'chicken necks' })
  })

  it('reuses an existing spot and updates in place when editing', async () => {
    await db.spots.add({
      id: 's1',
      name: 'Jetty',
      lat: 1,
      lng: 1,
      notes: '',
      createdAt: '',
      archived: false,
    })
    const input = { ...base, spot: { id: 's1' }, startedAt: '2026-07-04T12:00:00.000Z' }
    const id = await saveVisit({ ...input, keepers: 3 })
    await saveVisit({ ...input, keepers: 7 }, id)
    expect(await db.spots.count()).toBe(1)
    expect(await db.visits.count()).toBe(1)
    expect((await db.visits.get(id))?.keepers).toBe(7)
  })
})

describe('groupByDay', () => {
  it('groups by local day, newest first, with totals', () => {
    const groups = groupByDay([
      visit('a', new Date(2026, 6, 4, 7), 5, 1),
      visit('b', new Date(2026, 6, 5, 9), 2),
      visit('c', new Date(2026, 6, 4, 15), 10, 3),
    ])
    expect(groups.map((g) => g.day)).toEqual(['2026-07-05', '2026-07-04'])
    expect(groups[1].visits.map((v) => v.id)).toEqual(['c', 'a'])
    expect(groups[1]).toMatchObject({ keepers: 15, throwbacks: 4 })
  })
})

describe('seasonSummary', () => {
  it('only counts the requested year', () => {
    const s = seasonSummary(
      [
        visit('a', new Date(2026, 6, 4, 7), 5, 1),
        visit('b', new Date(2026, 6, 4, 9), 2),
        visit('c', new Date(2025, 8, 1, 9), 40),
      ],
      2026,
    )
    expect(s).toEqual({ year: 2026, keepers: 7, throwbacks: 1, visits: 2, days: 1 })
  })
})
