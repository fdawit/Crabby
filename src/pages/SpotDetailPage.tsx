import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { LocationPicker } from '../components/map/LocationPicker'
import { QualityBadge, ScoreBadge } from '../components/QualityBadge'
import { SpotCharts } from '../components/SpotCharts'
import { db, type Spot, type Visit } from '../db'
import { chartPoints } from '../lib/chartPoints'
import { formatDayHeading, formatTime, localDayKey } from '../lib/dates'
import { formatCoords, formatDistance, haversineMeters, isValidLatLng } from '../lib/geo'
import {
  bestMonth,
  computeStats,
  currentSeason,
  formatRate,
  formatScore,
  MONTH_NAMES,
  seasonOf,
} from '../lib/stats'
import { mergeSpots, updateSpot } from '../lib/visits'

export function SpotDetailPage() {
  const { spotId } = useParams()
  const spot = useLiveQuery(async () => (await db.spots.get(spotId ?? '')) ?? null, [spotId])
  const visits = useLiveQuery(
    () => db.visits.where('spotId').equals(spotId ?? '').toArray(),
    [spotId],
  )
  const [editing, setEditing] = useState(false)

  if (spot === undefined || !visits) return null
  if (spot === null) {
    return (
      <Page>
        That spot no longer exists.{' '}
        <Link to="/spots" className="font-semibold underline">
          All spots
        </Link>
      </Page>
    )
  }

  return (
    <Page>
      {editing ? (
        <SpotEditor spot={spot} visitCount={visits.length} onDone={() => setEditing(false)} />
      ) : (
        <SpotOverview spot={spot} visits={visits} onEdit={() => setEditing(true)} />
      )}
    </Page>
  )
}

function SpotOverview({ spot, visits, onEdit }: { spot: Spot; visits: Visit[]; onEdit: () => void }) {
  const season = currentSeason()
  const thisSeason = useMemo(
    () => computeStats(visits.filter((v) => seasonOf(v.startedAt) === season)),
    [visits, season],
  )
  const allTime = useMemo(() => computeStats(visits), [visits])
  const best = useMemo(() => bestMonth(visits), [visits])
  const seasons = useMemo(
    () => [...new Set(visits.map((v) => seasonOf(v.startedAt)))].sort((a, b) => b - a),
    [visits],
  )
  // Default the chart to this season, or the latest season she fished here.
  const [chartSeason, setChartSeason] = useState<number | 'all' | null>(null)
  const shownSeason = chartSeason ?? seasons[0] ?? season
  const points = useMemo(() => chartPoints(visits, shownSeason), [visits, shownSeason])
  const history = useMemo(
    () => [...visits].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [visits],
  )

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <ScoreBadge score={thisSeason.score} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold break-words">{spot.name}</h1>
          <p className="text-sm text-muted">
            {thisSeason.score == null
              ? `No visits this season`
              : `Score ${formatScore(thisSeason.score)} this season`}{' '}
            · {formatCoords(spot)}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-line px-3 py-2 text-sm font-semibold"
        >
          Edit
        </button>
      </header>

      <Link
        to={`/log?spot=${spot.id}`}
        className="block rounded-2xl bg-accent py-3 text-center text-lg font-bold text-accent-ink active:bg-accent-strong"
      >
        + Log a visit here
      </Link>

      {spot.notes && (
        <section>
          <h2 className="mb-1 text-sm font-bold tracking-wide text-muted uppercase">Notes</h2>
          <p className="whitespace-pre-wrap">{spot.notes}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">
          This season ({season})
        </h2>
        <dl className="grid grid-cols-3 gap-2">
          <Stat label="Visits" value={String(thisSeason.visits)} />
          <Stat label="Keepers" value={String(thisSeason.keepers)} />
          <Stat label="Kept / visit" value={formatRate(thisSeason.keepersPerVisit)} />
        </dl>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">All time</h2>
        <dl className="grid grid-cols-3 gap-2">
          <Stat label="Visits" value={String(allTime.visits)} />
          <Stat label="Keepers" value={String(allTime.keepers)} />
          <Stat label="Throwbacks" value={String(allTime.throwbacks)} />
          <Stat label="Kept / visit" value={formatRate(allTime.keepersPerVisit)} />
          <Stat label="Kept / pot" value={formatRate(allTime.keepersPerPot)} />
          <Stat label="Best month" value={best ? MONTH_NAMES[best.month].slice(0, 3) : '–'} />
        </dl>
      </section>

      {visits.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Over time</h2>
            <select
              aria-label="Chart season"
              value={String(shownSeason)}
              onChange={(e) =>
                setChartSeason(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm font-semibold"
            >
              {!seasons.includes(season) && <option value={season}>{season} season</option>}
              {seasons.map((y) => (
                <option key={y} value={y}>
                  {y} season
                </option>
              ))}
              <option value="all">Season by season</option>
            </select>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-3">
            <SpotCharts points={points} perVisitAverage={shownSeason === 'all'} />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">
          Visit history
        </h2>
        {history.length === 0 ? (
          <p className="text-muted">No visits logged here yet.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {history.map((v) => (
              <li key={v.id}>
                <Link to={`/visits/${v.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-line">
                  <QualityBadge rating={v.rating} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{formatDayHeading(localDayKey(v.startedAt))}</div>
                    <div className="truncate text-sm text-muted">
                      {formatTime(v.startedAt)}
                      {v.pots != null && ` · ${v.pots} pots`}
                      {v.notes && ` · ${v.notes}`}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-xl font-extrabold">{v.keepers}</div>
                    <div className="text-xs text-muted">+{v.throwbacks} back</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-xl border border-line bg-surface px-3 py-2">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="text-xl font-extrabold tabular-nums">{value}</dd>
    </div>
  )
}

function SpotEditor({
  spot,
  visitCount,
  onDone,
}: {
  spot: Spot
  visitCount: number
  onDone: () => void
}) {
  const navigate = useNavigate()
  const [name, setName] = useState(spot.name)
  const [notes, setNotes] = useState(spot.notes)
  const [lat, setLat] = useState(spot.lat.toFixed(6))
  const [lng, setLng] = useState(spot.lng.toFixed(6))
  const [error, setError] = useState('')

  const la = Number.parseFloat(lat)
  const ln = Number.parseFloat(lng)
  const validCoords = isValidLatLng(la, ln)

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('The spot needs a name.')
    if (!validCoords) return setError('Enter valid coordinates.')
    await updateSpot(spot.id, { name, notes: notes.trim(), lat: la, lng: ln })
    onDone()
  }

  async function onDelete() {
    await db.spots.delete(spot.id)
    navigate('/spots', { replace: true })
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3 py-3'
  const labelCls = 'mb-1 block text-sm font-semibold text-muted'

  return (
    <div className="space-y-8">
      <form onSubmit={onSave} className="space-y-4" noValidate>
        <h1 className="text-2xl font-extrabold">Edit spot</h1>
        <div>
          <label htmlFor="spot-name" className={labelCls}>
            Name
          </label>
          <input id="spot-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="spot-notes" className={labelCls}>
            Notes about this spot
          </label>
          <textarea
            id="spot-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Depth, bottom type, how to get there, landmarks"
            className={field}
          />
        </div>
        <fieldset className="space-y-2">
          <legend className={labelCls}>Location: drag the pin or tap the map</legend>
          {validCoords && (
            <LocationPicker
              value={{ lat: la, lng: ln }}
              onChange={(p) => {
                setLat(p.lat.toFixed(6))
                setLng(p.lng.toFixed(6))
              }}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="spot-lat" className={labelCls}>
                Latitude
              </label>
              <input id="spot-lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="spot-lng" className={labelCls}>
                Longitude
              </label>
              <input id="spot-lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} className={field} />
            </div>
          </div>
          {validCoords && (la !== spot.lat || ln !== spot.lng) && (
            <p className="text-sm text-muted">
              Moved {formatDistance(haversineMeters(spot, { lat: la, lng: ln }))} from where it was.
            </p>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onDone} className="rounded-2xl border border-line py-3 font-bold">
            Cancel
          </button>
          <button type="submit" className="rounded-2xl bg-accent py-3 font-bold text-accent-ink">
            Save spot
          </button>
        </div>
      </form>

      <MergeSection spot={spot} />

      {visitCount === 0 && (
        <button type="button" onClick={onDelete} className="w-full py-2 font-semibold text-danger">
          Delete this spot (it has no visits)
        </button>
      )}
    </div>
  )
}

/** Fold a duplicate spot into this one: its visits move here and it's removed. */
function MergeSection({ spot }: { spot: Spot }) {
  const others = useLiveQuery(
    () => db.spots.filter((s) => s.id !== spot.id && !s.archived).toArray(),
    [spot.id],
  )
  const [otherId, setOtherId] = useState('')
  const otherVisits = useLiveQuery(
    () => (otherId ? db.visits.where('spotId').equals(otherId).count() : 0),
    [otherId],
  )
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState('')

  const sorted = useMemo(
    () =>
      (others ?? [])
        .map((s) => ({ s, meters: haversineMeters(spot, s) }))
        .sort((a, b) => a.meters - b.meters),
    [others, spot],
  )
  const other = sorted.find((o) => o.s.id === otherId)?.s

  if (!others || others.length === 0) return null

  async function merge() {
    if (!other) return
    const moved = await mergeSpots(other.id, spot.id)
    setResult(`Merged ${other.name}: ${moved} visit${moved === 1 ? '' : 's'} moved here.`)
    setOtherId('')
    setConfirming(false)
  }

  return (
    <section className="space-y-3 rounded-2xl border border-line p-4">
      <h2 className="font-bold">Merge a duplicate spot into this one</h2>
      <p className="text-sm text-muted">
        Use this when two pins are really the same place. The other spot’s visits move here and
        the other spot is removed.
      </p>
      <select
        aria-label="Spot to merge in"
        value={otherId}
        onChange={(e) => {
          setOtherId(e.target.value)
          setConfirming(false)
          setResult('')
        }}
        className="w-full rounded-xl border border-line bg-surface px-3 py-3"
      >
        <option value="">Choose a spot…</option>
        {sorted.map(({ s, meters }) => (
          <option key={s.id} value={s.id}>
            {s.name} · {formatDistance(meters)} away
          </option>
        ))}
      </select>
      {other &&
        (confirming ? (
          <div className="space-y-2 rounded-xl bg-surface p-3">
            <p>
              Move {otherVisits ?? 0} visit{otherVisits === 1 ? '' : 's'} from{' '}
              <strong>{other.name}</strong> into <strong>{spot.name}</strong> and remove{' '}
              {other.name}?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-line py-3 font-bold">
                Cancel
              </button>
              <button type="button" onClick={merge} className="rounded-xl bg-danger py-3 font-bold text-white">
                Merge
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full rounded-xl border-2 border-line py-3 font-bold"
          >
            Merge {other.name} into {spot.name}…
          </button>
        ))}
      {result && (
        <p role="status" className="font-semibold">
          {result}
        </p>
      )}
    </section>
  )
}
