import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { QualityBadge } from '../components/QualityBadge'
import { db, type Visit } from '../db'
import { formatDayHeading, formatTime } from '../lib/dates'
import { groupByDay, seasonSummary, spotsById } from '../lib/visits'

const DAYS_PER_PAGE = 14

export function HomePage() {
  const visits = useLiveQuery(() => db.visits.toArray())
  const spots = useLiveQuery(() => db.spots.toArray())
  const [dayLimit, setDayLimit] = useState(DAYS_PER_PAGE)
  const [year] = useState(() => new Date().getFullYear())

  const days = useMemo(() => groupByDay(visits ?? []), [visits])
  const spotMap = useMemo(() => spotsById(spots ?? []), [spots])
  const season = useMemo(() => seasonSummary(visits ?? [], year), [visits, year])

  if (!visits || !spots) return null

  return (
    <>
      <UndoDeleteToast />
      <section aria-label="This season" className="mb-6 grid grid-cols-3 gap-2">
        <Stat label={`Kept in ${season.year}`} value={season.keepers} />
        <Stat label="Thrown back" value={season.throwbacks} />
        <Stat label="Days out" value={season.days} />
      </section>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="text-lg font-semibold">No catches logged yet</p>
          <p className="mt-1 text-muted">Tap “Log catch” next time you pull your pots.</p>
        </div>
      ) : (
        <ol className="space-y-6">
          {days.slice(0, dayLimit).map((g) => (
            <li key={g.day}>
              <h2 className="mb-2 flex items-baseline justify-between text-sm font-bold tracking-wide text-muted uppercase">
                <span>{formatDayHeading(g.day)}</span>
                <span className="font-semibold normal-case">
                  {g.keepers} kept · {g.throwbacks} back
                </span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {g.visits.map((v) => (
                  <VisitRow key={v.id} visit={v} spotName={spotMap.get(v.spotId)?.name} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {days.length > dayLimit && (
        <button
          type="button"
          onClick={() => setDayLimit((n) => n + DAYS_PER_PAGE)}
          className="mt-6 w-full rounded-xl border border-line py-3 font-semibold"
        >
          Show older days
        </button>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Link
          to="/log"
          className="pointer-events-auto w-full max-w-2xl rounded-2xl bg-accent py-4 text-center text-lg font-bold text-accent-ink shadow-lg active:bg-accent-strong"
        >
          + Log catch
        </Link>
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3">
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </div>
  )
}

function VisitRow({ visit, spotName }: { visit: Visit; spotName?: string }) {
  return (
    <li>
      <Link to={`/visits/${visit.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-line">
        <QualityBadge rating={visit.rating} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{spotName ?? 'Unknown spot'}</div>
          <div className="truncate text-sm text-muted">
            {formatTime(visit.startedAt)}
            {visit.pots != null && ` · ${visit.pots} pots`}
            {visit.notes && ` · ${visit.notes}`}
          </div>
        </div>
        <div className="text-right tabular-nums">
          <div className="text-xl font-extrabold">{visit.keepers}</div>
          <div className="text-xs text-muted">+{visit.throwbacks} back</div>
        </div>
      </Link>
    </li>
  )
}

/** Shown after a visit is deleted from the edit screen; lets her put it back. */
function UndoDeleteToast() {
  const location = useLocation()
  const navigate = useNavigate()
  const deleted = (location.state as { deleted?: Visit } | null)?.deleted
  const [expiredKey, setExpiredKey] = useState<string | null>(null)

  useEffect(() => {
    if (!deleted) return
    const t = setTimeout(() => setExpiredKey(location.key), 8000)
    return () => clearTimeout(t)
  }, [deleted, location.key])

  if (!deleted || expiredKey === location.key) return null
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-20 mx-auto flex max-w-2xl items-center justify-between rounded-xl bg-ink px-4 py-3 text-bg shadow-lg"
    >
      <span>Visit deleted</span>
      <button
        type="button"
        className="font-bold underline"
        onClick={async () => {
          await db.visits.add(deleted)
          navigate('.', { replace: true, state: null })
        }}
      >
        Undo
      </button>
    </div>
  )
}
