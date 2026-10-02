import { describe, expect, it } from 'vitest'
import { noaaTileUrl, tileBbox } from './tiles'

const R = 20037508.342789244

describe('tileBbox', () => {
  it('covers the whole world at zoom 0', () => {
    expect(tileBbox(0, 0, 0)).toEqual([-R, -R, R, R])
  })

  it('splits into quadrants at zoom 1 (y counts down from the north)', () => {
    expect(tileBbox(0, 0, 1)).toEqual([-R, 0, 0, R])
    expect(tileBbox(1, 1, 1)).toEqual([0, -R, R, 0])
  })
})

describe('noaaTileUrl', () => {
  it('requests an exported image of the tile in Web Mercator', () => {
    const url = new URL(noaaTileUrl(0, 0, 1, 512))
    expect(url.hostname).toBe('gis.charttools.noaa.gov')
    expect(url.searchParams.get('bbox')).toBe(`${-R},0,0,${R}`)
    expect(url.searchParams.get('bboxSR')).toBe('3857')
    expect(url.searchParams.get('size')).toBe('512,512')
    expect(url.searchParams.get('dpi')).toBe('192')
    expect(url.searchParams.get('f')).toBe('image')
  })
})
