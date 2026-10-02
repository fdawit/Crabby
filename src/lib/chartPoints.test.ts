import { describe, expect, it } from 'vitest'
import { makeVisit } from '../test/fixtures'
import { chartPoints } from './chartPoints'

describe('chartPoints', () => {
  const visits = [
    makeVisit('a', new Date(2025, 7, 2), 6, 3, { throwbacks: 2 }),
    makeVisit('a', new Date(2024, 6, 1), 10, 5),
    makeVisit('a', new Date(2025, 6, 1), 2, 1),
  ]

  it('gives one point per visit in a season, oldest first', () => {
    const pts = chartPoints(visits, 2025)
    expect(pts.map((p) => p.keepers)).toEqual([2, 6])
    expect(pts[1]).toMatchObject({ throwbacks: 2, rating: 3, visits: 1 })
  })

  it('averages per visit for season-by-season', () => {
    expect(chartPoints(visits, 'all')).toEqual([
      { label: '2024', keepers: 10, throwbacks: 0, rating: 5, visits: 1 },
      { label: '2025', keepers: 4, throwbacks: 1, rating: 2, visits: 2 },
    ])
  })
})
