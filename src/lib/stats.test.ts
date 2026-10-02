import { describe, expect, it } from 'vitest'
import { makeVisit } from '../test/fixtures'
import { bestMonth, computeStats, currentSeason, seasonsWithData, statsBySpot } from './stats'

const Y = currentSeason()

describe('computeStats', () => {
  it('averages rating and catch, and computes keepers per pot from visits with pots only', () => {
    const s = computeStats([
      makeVisit('a', new Date(Y, 6, 1), 10, 4, { pots: 5, throwbacks: 2 }),
      makeVisit('a', new Date(Y, 6, 9), 2, 2),
    ])
    expect(s).toMatchObject({ visits: 2, keepers: 12, throwbacks: 2, score: 3, keepersPerVisit: 6 })
    expect(s.keepersPerPot).toBe(2)
    expect(s.lastVisit).toBe(new Date(Y, 6, 9).toISOString())
  })

  it('returns nulls with no visits', () => {
    expect(computeStats([])).toMatchObject({ visits: 0, score: null, keepersPerVisit: null })
  })
})

describe('statsBySpot', () => {
  const visits = [
    makeVisit('a', new Date(Y, 6, 1), 10, 5),
    makeVisit('a', new Date(Y - 1, 6, 1), 0, 1),
    makeVisit('b', new Date(Y - 1, 8, 1), 4, 3),
  ]

  it('scores the current season only by default', () => {
    const m = statsBySpot(visits, { season: Y, month: 'all' })
    expect(m.get('a')?.score).toBe(5)
    expect(m.has('b')).toBe(false)
  })

  it('filters by month across all seasons', () => {
    const m = statsBySpot(visits, { season: 'all', month: 6 })
    expect(m.get('a')?.score).toBe(3)
    expect(m.has('b')).toBe(false)
  })
})

describe('bestMonth', () => {
  it('ignores months with too few visits', () => {
    const best = bestMonth([
      makeVisit('a', new Date(Y, 6, 1), 30, 5), // one huge July day
      makeVisit('a', new Date(Y, 7, 1), 8, 4),
      makeVisit('a', new Date(Y, 7, 8), 12, 4),
    ])
    expect(best).toEqual({ month: 7, keepersPerVisit: 10, visits: 2 })
  })
})

describe('seasonsWithData', () => {
  it('lists seasons newest first and always includes the current one', () => {
    expect(seasonsWithData([makeVisit('a', new Date(2021, 6, 1), 1, 3)])).toEqual([Y, 2021])
  })
})
