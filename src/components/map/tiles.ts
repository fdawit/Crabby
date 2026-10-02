import L from 'leaflet'

export type Basemap = 'noaa' | 'osm'

/** Default view: the San Juan Islands, WA. */
export const SAN_JUAN_ISLANDS: L.LatLngExpression = [48.55, -123.0]
export const DEFAULT_ZOOM = 11

export const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

/**
 * NOAA Chart Display Service: NOAA's official electronic navigational charts, drawn by
 * NOAA's ArcGIS server. It isn't a tile cache, so each tile is a map "export" of that
 * tile's Web Mercator bounding box.
 */
export const NOAA_EXPORT_URL =
  'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/MapServer/export'
export const NOAA_ATTRIBUTION =
  '<a href="https://nauticalcharts.noaa.gov/">NOAA</a> charts, not for navigation'

const WEB_MERCATOR_HALF_WORLD = 20037508.342789244

/** EPSG:3857 bounding box of an XYZ tile: [minX, minY, maxX, maxY]. */
export function tileBbox(x: number, y: number, z: number): [number, number, number, number] {
  const span = (2 * WEB_MERCATOR_HALF_WORLD) / 2 ** z
  const minX = -WEB_MERCATOR_HALF_WORLD + x * span
  const maxY = WEB_MERCATOR_HALF_WORLD - y * span
  return [minX, maxY - span, minX + span, maxY]
}

export function noaaTileUrl(x: number, y: number, z: number, pixels = 256): string {
  const params = new URLSearchParams({
    bbox: tileBbox(x, y, z).join(','),
    bboxSR: '3857',
    imageSR: '3857',
    size: `${pixels},${pixels}`,
    dpi: String(Math.round((96 * pixels) / 256)),
    format: 'png32',
    transparent: 'true',
    f: 'image',
  })
  return `${NOAA_EXPORT_URL}?${params}`
}

export class NoaaChartLayer extends L.TileLayer {
  constructor(options?: L.TileLayerOptions) {
    super('', { attribution: NOAA_ATTRIBUTION, maxZoom: 18, ...options })
  }

  getTileUrl(coords: L.Coords): string {
    // Request 512px tiles on high-density screens so chart text stays crisp.
    return noaaTileUrl(coords.x, coords.y, coords.z, L.Browser.retina ? 512 : 256)
  }
}

const STORAGE_KEY = 'crabby.basemap'

export function loadBasemap(): Basemap {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'osm' ? 'osm' : 'noaa'
  } catch {
    return 'noaa'
  }
}

export function saveBasemap(b: Basemap): void {
  try {
    localStorage.setItem(STORAGE_KEY, b)
  } catch {
    // Storage blocked (private mode); the choice just won't persist.
  }
}
