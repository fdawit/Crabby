import { useLiveQuery } from 'dexie-react-hooks'
import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { BaseLayers, BasemapToggle } from '../components/map/BaseLayers'
import { useBasemap } from '../components/map/useBasemap'
import { herePin, LABELED_PIN_MIN_ZOOM, scorePin } from '../components/map/pins'
import { DEFAULT_ZOOM, SAN_JUAN_ISLANDS } from '../components/map/tiles'
import { PeriodPicker } from '../components/PeriodPicker'
import { periodLabel, usePeriod } from '../lib/period'
import { ScoreBadge } from '../components/QualityBadge'
import { db, type Spot } from '../db'
import { formatDayHeading, localDayKey } from '../lib/dates'
import { formatRate, formatScore, seasonsWithData, statsBySpot, type SpotStats } from '../lib/stats'
import { useCurrentPosition } from '../lib/useCurrentPosition'

export function MapPage() {
  const spots = useLiveQuery(() => db.spots.filter((s) => !s.archived).toArray())
  const visits = useLiveQuery(() => db.visits.toArray())
  const [period, setPeriod] = usePeriod()
  const [basemap, setBasemap] = useBasemap()
  const [chartsFailed, setChartsFailed] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [map, setMap] = useState<L.Map | null>(null)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [gps, locate] = useCurrentPosition()

  const stats = useMemo(() => statsBySpot(visits ?? [], period), [visits, period])
  const seasons = useMemo(() => seasonsWithData(visits ?? []), [visits])
  const selected = spots?.find((s) => s.id === selectedId) ?? null

  if (!spots || !visits) return null

  async function centerOnMe() {
    const pos = await locate()
    if (pos && map) map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 14))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line bg-bg p-2">
        <PeriodPicker period={period} seasons={seasons} onChange={setPeriod} />
      </div>
      <div className="relative min-h-0 flex-1">
        <MapContainer
          ref={setMap}
          center={SAN_JUAN_ISLANDS}
          zoom={DEFAULT_ZOOM}
          className="absolute inset-0"
          zoomControl={false}
        >
          <ZoomControl position="bottomright" />
          <TrackZoom onZoom={setZoom} />
          <BaseLayers
            key={basemap}
            basemap={basemap}
            onChartsFailed={() => setChartsFailed(true)}
          />
          <FitToSpots spots={spots} />
          <ClearSelectionOnMapTap onTap={() => setSelectedId(null)} />
          {spots.map((s) => (
            <SpotMarker
              key={s.id}
              spot={s}
              score={stats.get(s.id)?.score ?? null}
              selected={s.id === selectedId}
              compact={zoom < LABELED_PIN_MIN_ZOOM}
              onSelect={setSelectedId}
            />
          ))}
          {gps.status === 'ok' && (
            <Marker
              position={[gps.position.lat, gps.position.lng]}
              icon={herePin}
              interactive={false}
              zIndexOffset={-1000}
            />
          )}
        </MapContainer>

        <div className="pointer-events-none absolute inset-x-2 top-2 z-[1000] flex flex-col items-end gap-2">
          <div className="flex w-full items-start justify-end gap-2">
            <div className="pointer-events-auto">
              <BasemapToggle
              basemap={basemap}
              onChange={(b) => {
                setChartsFailed(false)
                setBasemap(b)
              }}
            />
            </div>
          </div>
          {chartsFailed && basemap === 'noaa' && (
            <div
              role="status"
              className="pointer-events-auto w-full rounded-xl bg-surface p-3 text-sm shadow-lg"
            >
              NOAA charts aren’t loading (no signal, or NOAA’s server is down).{' '}
              <button
                type="button"
                className="font-bold text-accent underline"
                onClick={() => setBasemap('osm')}
              >
                Use street map
              </button>
            </div>
          )}
          {gps.status === 'error' && (
            <p role="status" className="rounded-lg bg-surface px-3 py-2 text-sm text-danger shadow">
              {gps.message}
            </p>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-2 bottom-7 z-[1000] flex flex-col gap-2">
          <div className="flex items-end justify-between gap-2 md:mr-12">
            <Legend />
            <button
              type="button"
              onClick={centerOnMe}
              disabled={gps.status === 'locating'}
              aria-label="Center on my location"
              className="pointer-events-auto flex size-12 items-center justify-center rounded-full border border-line bg-surface text-xl shadow-lg disabled:opacity-60"
            >
              {gps.status === 'locating' ? '…' : '◉'}
            </button>
          </div>
          {selected && (
            <SpotCard
              spot={selected}
              stats={stats.get(selected.id)}
              periodText={periodLabel(period)}
              onClose={() => setSelectedId(null)}
            />
          )}
          {spots.length === 0 && (
            <p className="pointer-events-auto rounded-xl bg-surface p-3 text-center text-sm shadow-lg">
              Spots appear here once you log a catch.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SpotMarker({
  spot,
  score,
  selected,
  compact,
  onSelect,
}: {
  spot: Spot
  score: number | null
  selected: boolean
  compact: boolean
  onSelect: (id: string) => void
}) {
  const icon = useMemo(() => scorePin(score, selected, compact), [score, selected, compact])
  return (
    <Marker
      position={[spot.lat, spot.lng]}
      icon={icon}
      title={spot.name}
      alt={spot.name}
      // Better spots draw on top where pins overlap; the selected one above all.
      zIndexOffset={selected ? 10_000 : Math.round((score ?? 0) * 100)}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e)
          onSelect(spot.id)
        },
      }}
    />
  )
}

/** Zooms to fit all spots the first time they're available. */
function FitToSpots({ spots }: { spots: Spot[] }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || spots.length === 0) return
    done.current = true
    if (spots.length === 1) map.setView([spots[0].lat, spots[0].lng], 14)
    else
      map.fitBounds(L.latLngBounds(spots.map((s) => [s.lat, s.lng])), {
        padding: [48, 48],
        maxZoom: 15,
      })
  }, [map, spots])
  return null
}

function TrackZoom({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  return null
}

function ClearSelectionOnMapTap({ onTap }: { onTap: () => void }) {
  useMapEvents({ click: onTap })
  return null
}

function Legend() {
  return (
    <div
      aria-label="Quality: 1 poor to 5 great; gray means no visits"
      className="pointer-events-auto flex items-center gap-1 rounded-lg bg-surface/95 px-2 py-2 text-xs font-semibold whitespace-nowrap shadow"
    >
      <span className="mr-0.5 text-muted">Poor</span>
      {[1, 2, 3, 4, 5].map((q) => (
        <span
          key={q}
          className="size-3.5 rounded-full"
          style={{ background: `var(--q${q})` }}
          aria-hidden
        />
      ))}
      <span className="ml-0.5 text-muted">Great</span>
      <span className="ml-1 size-3.5 rounded-full" style={{ background: 'var(--q-none)' }} aria-hidden />
      <span className="text-muted">none</span>
    </div>
  )
}

function SpotCard({
  spot,
  stats,
  periodText,
  onClose,
}: {
  spot: Spot
  stats: SpotStats | undefined
  periodText: string
  onClose: () => void
}) {
  return (
    <section
      aria-label={spot.name}
      className="pointer-events-auto rounded-2xl border border-line bg-surface p-4 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <ScoreBadge score={stats?.score ?? null} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-extrabold">{spot.name}</h2>
          <p className="text-sm text-muted">
            {stats
              ? `Score ${formatScore(stats.score)} over ${stats.visits} visit${
                  stats.visits === 1 ? '' : 's'
                }, ${periodText}`
              : `No visits ${periodText}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-m-2 p-2 text-xl text-muted"
        >
          ✕
        </button>
      </div>
      {stats && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Fact label="Keepers" value={String(stats.keepers)} />
          <Fact label="Kept / visit" value={formatRate(stats.keepersPerVisit)} />
          <Fact
            label="Last visit"
            value={stats.lastVisit ? formatDayHeading(localDayKey(stats.lastVisit)) : '–'}
          />
        </dl>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          to={`/spots/${spot.id}`}
          className="rounded-xl border border-line py-3 text-center font-bold"
        >
          Open spot
        </Link>
        <Link
          to={`/log?spot=${spot.id}`}
          className="rounded-xl bg-accent py-3 text-center font-bold text-accent-ink"
        >
          Log here
        </Link>
      </div>
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg bg-bg px-1 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-extrabold tabular-nums">{value}</dd>
    </div>
  )
}
