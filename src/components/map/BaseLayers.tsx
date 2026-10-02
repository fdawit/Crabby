import { useEffect, useRef } from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import { NoaaChartLayer, OSM_ATTRIBUTION, OSM_URL, type Basemap } from './tiles'

/**
 * Street map underneath, with NOAA charts on top when chosen. The street map fills in
 * anything outside NOAA's coverage (e.g. the Canadian side of Haro Strait).
 */
export function BaseLayers({
  basemap,
  onChartsFailed,
}: {
  basemap: Basemap
  /** Called when NOAA tiles keep failing and none have loaded (offline, or NOAA is down). */
  onChartsFailed?: () => void
}) {
  return (
    <>
      <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
      {basemap === 'noaa' && <NoaaLayer onFailed={onChartsFailed} />}
    </>
  )
}

const FAILURES_BEFORE_GIVING_UP = 4

function NoaaLayer({ onFailed }: { onFailed?: () => void }) {
  const map = useMap()
  const onFailedRef = useRef(onFailed)
  useEffect(() => {
    onFailedRef.current = onFailed
  })
  useEffect(() => {
    const layer = new NoaaChartLayer()
    let loaded = 0
    let failed = 0
    layer.on('tileload', () => loaded++)
    layer.on('tileerror', () => {
      if (++failed === FAILURES_BEFORE_GIVING_UP && loaded === 0) onFailedRef.current?.()
    })
    layer.addTo(map)
    return () => {
      layer.remove()
    }
  }, [map])
  return null
}

export function BasemapToggle({
  basemap,
  onChange,
}: {
  basemap: Basemap
  onChange: (b: Basemap) => void
}) {
  const option = (value: Basemap, label: string) => (
    <button
      type="button"
      aria-pressed={basemap === value}
      onClick={() => onChange(value)}
      className={`px-3 py-2 text-sm font-semibold ${
        basemap === value ? 'bg-ink text-bg' : 'bg-surface text-ink'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div
      role="group"
      aria-label="Map style"
      className="flex overflow-hidden rounded-lg border border-line shadow"
    >
      {option('noaa', 'Chart')}
      {option('osm', 'Street')}
    </div>
  )
}
