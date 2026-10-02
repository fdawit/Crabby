export interface LatLng {
  lat: number
  lng: number
}

/** A new GPS fix within this distance of a saved spot is treated as that spot. */
export const SAME_SPOT_RADIUS_M = 100

const EARTH_RADIUS_M = 6_371_008.8

export function haversineMeters(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function sortByDistance<T extends LatLng>(
  items: readonly T[],
  from: LatLng,
): { item: T; meters: number }[] {
  return items
    .map((item) => ({ item, meters: haversineMeters(from, item) }))
    .sort((x, y) => x.meters - y.meters)
}

/** The closest item within `radius` meters, or null. */
export function nearestWithin<T extends LatLng>(
  items: readonly T[],
  from: LatLng,
  radius = SAME_SPOT_RADIUS_M,
): { item: T; meters: number } | null {
  const [closest] = sortByDistance(items, from)
  return closest && closest.meters <= radius ? closest : null
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  )
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatCoords({ lat, lng }: LatLng): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
