import { describe, expect, it } from 'vitest'
import { haversineMeters, isValidLatLng, nearestWithin, sortByDistance } from './geo'

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters({ lat: 38.97, lng: -76.49 }, { lat: 38.97, lng: -76.49 })).toBe(0)
  })

  it('matches a known distance (Annapolis → Baltimore ≈ 36 km)', () => {
    const d = haversineMeters({ lat: 38.9784, lng: -76.4922 }, { lat: 39.2904, lng: -76.6122 })
    expect(d / 1000).toBeCloseTo(36.3, 0)
  })

  it('measures about 111 m per 0.001° of latitude', () => {
    const d = haversineMeters({ lat: 38, lng: -76 }, { lat: 38.001, lng: -76 })
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(112)
  })
})

describe('nearestWithin', () => {
  const spots = [
    { id: 'far', lat: 38.01, lng: -76 },
    { id: 'near', lat: 38.0005, lng: -76 },
  ]

  it('returns the closest spot inside the radius', () => {
    expect(nearestWithin(spots, { lat: 38, lng: -76 })?.item.id).toBe('near')
  })

  it('returns null when nothing is inside the radius', () => {
    expect(nearestWithin(spots, { lat: 38, lng: -76 }, 20)).toBeNull()
    expect(nearestWithin([], { lat: 38, lng: -76 })).toBeNull()
  })

  it('sorts by distance', () => {
    expect(sortByDistance(spots, { lat: 38, lng: -76 }).map((x) => x.item.id)).toEqual([
      'near',
      'far',
    ])
  })
})

describe('isValidLatLng', () => {
  it('rejects out-of-range and non-numeric values', () => {
    expect(isValidLatLng(38.9, -76.4)).toBe(true)
    expect(isValidLatLng(91, 0)).toBe(false)
    expect(isValidLatLng(0, -181)).toBe(false)
    expect(isValidLatLng(Number.NaN, 0)).toBe(false)
  })
})
