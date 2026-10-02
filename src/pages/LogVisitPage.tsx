import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { RatingPicker } from '../components/RatingPicker'
import { Stepper } from '../components/Stepper'
import { db, type Rating, type Spot, type Visit } from '../db'
import { fromDateTimeLocal, toDateTimeLocal } from '../lib/dates'
import {
  formatCoords,
  formatDistance,
  isValidLatLng,
  nearestWithin,
  sortByDistance,
  SAME_SPOT_RADIUS_M,
  type LatLng,
} from '../lib/geo'
import { deleteVisit, saveVisit } from '../lib/visits'

const NEW_SPOT = '__new__'

type GpsState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'done'; message: string }
  | { status: 'error'; message: string }

export function LogVisitPage() {
  const { visitId } = useParams()
  const [params] = useSearchParams()
  const spots = useLiveQuery(() => db.spots.filter((s) => !s.archived).toArray())
  const existing = useLiveQuery(
    async () => (visitId ? ((await db.visits.get(visitId)) ?? null) : null),
    [visitId],
  )

  if (!spots || existing === undefined) return null
  if (visitId && existing === null) {
    return (
      <Page>
        That visit no longer exists. <Link to="/" className="font-semibold underline">Go home</Link>
      </Page>
    )
  }
  const presetSpot = params.get('spot')
  return (
    <Page>
      {/* Keyed so switching between visits starts from fresh form state. */}
      <VisitForm
        key={existing?.id ?? 'new'}
        spots={spots}
        existing={existing}
        presetSpotId={spots.some((s) => s.id === presetSpot) ? presetSpot : null}
      />
    </Page>
  )
}

function VisitForm({
  spots,
  existing,
  presetSpotId,
}: {
  spots: Spot[]
  existing: Visit | null
  presetSpotId: string | null
}) {
  const navigate = useNavigate()
  const location = useLocation()
  // Return to wherever the form was opened from (Home, a spot page…); Home if opened directly.
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))
  const [spotChoice, setSpotChoice] = useState(existing?.spotId ?? presetSpotId ?? '')
  const [newName, setNewName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [here, setHere] = useState<LatLng | null>(null)
  const [gps, setGps] = useState<GpsState>({ status: 'idle' })
  const [startedAt, setStartedAt] = useState(() =>
    toDateTimeLocal(existing?.startedAt ?? new Date().toISOString()),
  )
  const [keepers, setKeepers] = useState(existing?.keepers ?? 0)
  const [throwbacks, setThrowbacks] = useState(existing?.throwbacks ?? 0)
  const [pots, setPots] = useState<number | null>(existing?.pots ?? null)
  const [rating, setRating] = useState<Rating | null>(existing?.rating ?? null)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)


  // With no saved spots there is nothing to pick from, so go straight to "new spot".
  const choice = spotChoice || (spots.length === 0 ? NEW_SPOT : '')

  const spotOptions = useMemo(() => {
    if (here) {
      return sortByDistance(spots, here).map(({ item, meters }) => ({
        spot: item,
        label: `${item.name} · ${formatDistance(meters)}`,
      }))
    }
    return [...spots]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((spot) => ({ spot, label: spot.name }))
  }, [spots, here])

  function locate() {
    if (!('geolocation' in navigator)) {
      setGps({ status: 'error', message: 'This device can’t share its location.' })
      return
    }
    setGps({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setHere(point)
        setLat(point.lat.toFixed(6))
        setLng(point.lng.toFixed(6))
        const match = nearestWithin(spots, point)
        if (match) {
          setSpotChoice(match.item.id)
          setGps({
            status: 'done',
            message: `You’re at ${match.item.name} (${formatDistance(match.meters)} away).`,
          })
        } else {
          setSpotChoice(NEW_SPOT)
          setGps({
            status: 'done',
            message: `No saved spot within ${SAME_SPOT_RADIUS_M} m. Name this new spot.`,
          })
        }
      },
      (err) =>
        setGps({
          status: 'error',
          message:
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was denied. You can type coordinates instead.'
              : 'Couldn’t get a GPS fix. Try again, or type coordinates.',
        }),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    let spot: { id: string } | { name: string; lat: number; lng: number }
    if (choice === NEW_SPOT) {
      const la = Number.parseFloat(lat)
      const ln = Number.parseFloat(lng)
      if (!newName.trim()) return setError('Give the new spot a name.')
      if (!isValidLatLng(la, ln)) return setError('Enter valid coordinates, or use your location.')
      spot = { name: newName, lat: la, lng: ln }
    } else if (choice) {
      spot = { id: choice }
    } else {
      return setError('Choose a spot, or use your location.')
    }
    if (!rating) return setError('Rate how good the spot was today.')
    if (!startedAt) return setError('Enter the date and time.')

    setSaving(true)
    try {
      await saveVisit(
        {
          spot,
          startedAt: fromDateTimeLocal(startedAt),
          keepers,
          throwbacks,
          pots,
          rating,
          notes,
        },
        existing?.id,
      )
      goBack()
    } catch (err) {
      setError(`Couldn’t save: ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!existing) return
    await deleteVisit(existing.id)
    navigate('/', { state: { deleted: existing } })
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3 py-3'
  const labelCls = 'mb-1 block text-sm font-semibold text-muted'

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <h1 className="text-2xl font-extrabold">{existing ? 'Edit visit' : 'Log catch'}</h1>

      <section className="space-y-3">
        <button
          type="button"
          onClick={locate}
          disabled={gps.status === 'locating'}
          className="w-full rounded-xl border-2 border-accent py-3 font-bold text-accent disabled:opacity-60"
        >
          {gps.status === 'locating' ? 'Getting GPS fix…' : '📍 Use my location'}
        </button>
        {(gps.status === 'done' || gps.status === 'error') && (
          <p role="status" className={gps.status === 'error' ? 'text-danger' : 'text-muted'}>
            {gps.message}
          </p>
        )}

        <div>
          <label htmlFor="spot" className={labelCls}>
            Spot
          </label>
          <select
            id="spot"
            value={choice}
            onChange={(e) => setSpotChoice(e.target.value)}
            className={field}
          >
            <option value="" disabled>
              Choose a spot…
            </option>
            {spotOptions.map(({ spot, label }) => (
              <option key={spot.id} value={spot.id}>
                {label}
              </option>
            ))}
            <option value={NEW_SPOT}>+ New spot</option>
          </select>
        </div>

        {choice === NEW_SPOT && (
          <div className="space-y-3 rounded-2xl border border-line p-3">
            <div>
              <label htmlFor="new-name" className={labelCls}>
                New spot name
              </label>
              <input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Pier 4 ladder"
                className={field}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="lat" className={labelCls}>
                  Latitude
                </label>
                <input
                  id="lat"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="38.97843"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="lng" className={labelCls}>
                  Longitude
                </label>
                <input
                  id="lng"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-76.49212"
                  className={field}
                />
              </div>
            </div>
            {here && <p className="text-sm text-muted">GPS: {formatCoords(here)}</p>}
          </div>
        )}
      </section>

      <div>
        <label htmlFor="when" className={labelCls}>
          When
        </label>
        <input
          id="when"
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          className={field}
        />
      </div>

      <section className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        <Stepper label="Keepers" value={keepers} onChange={setKeepers} />
        <Stepper label="Throwbacks" value={throwbacks} onChange={setThrowbacks} />
      </section>

      <div>
        {pots == null ? (
          <button
            type="button"
            onClick={() => setPots(1)}
            className="text-sm font-semibold text-accent underline"
          >
            + Record number of pots
          </button>
        ) : (
          <div className="flex items-end gap-3">
            <Stepper label="Pots" value={pots} onChange={setPots} min={1} />
            <button
              type="button"
              onClick={() => setPots(null)}
              className="pb-4 text-sm font-semibold text-muted underline"
            >
              Don’t record
            </button>
          </div>
        )}
      </div>

      <RatingPicker value={rating} onChange={setRating} />

      <div>
        <label htmlFor="notes" className={labelCls}>
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tide, bait, weather, anything worth remembering"
          className={field}
        />
      </div>

      {error && (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-accent-ink active:bg-accent-strong disabled:opacity-60"
        >
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Save catch'}
        </button>
        <button
          type="button"
          onClick={goBack}
          className="block w-full py-2 text-center font-semibold text-muted"
        >
          Cancel
        </button>
        {existing && (
          <button
            type="button"
            onClick={onDelete}
            className="w-full py-2 font-semibold text-danger"
          >
            Delete this visit
          </button>
        )}
      </div>
    </form>
  )
}
