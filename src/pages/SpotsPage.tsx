import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '../components/Layout'
import { PeriodPicker } from '../components/PeriodPicker'
import { periodLabel, usePeriod } from '../lib/period'
import { ScoreBadge } from '../components/QualityBadge'
import { db } from '../db'
import { formatDayHeading, localDayKey } from '../lib/dates'
import { formatDistance, haversineMeters } from '../lib/geo'
import { formatRate, seasonsWithData, statsBySpot } from '../lib/stats'
import { useCurrentPosition } from '../lib/useCurrentPosition'

type SortKey = 'score' | 'keepersPerVisit' | 'lastVisit' | 'distance' | 'name'

const SORT_LABELS: Record<SortKey, string> = {
  score: 'Sort: best score',
  keepersPerVisit: 'Sort: keepers per visit',
  lastVisit: 'Sort: recently visited',
  distance: 'Sort: nearest to me',
  name: 'Sort: name',
}

export function SpotsPage() {
  const spots = useLiveQuery(() => db.spots.filter((s) => !s.archived).toArray())
  const visits = useLiveQuery(() => db.visits.toArray())
  const [period, setPeriod] = usePeriod()
  const [sort, setSort] = useState<SortKey>('score')
  const [query, setQuery] = useState('')
  const [gps, locate] = useCurrentPosition()

  const stats = useMemo(() => statsBySpot(visits ?? [], period), [visits, period])
  const seasons = useMemo(() => seasonsWithData(visits ?? []), [visits])
  const here = gps.status === 'ok' ? gps.position : null

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (spots ?? [])
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .map((spot) => ({
        spot,
        stats: stats.get(spot.id),
        meters: here ? haversineMeters(here, spot) : null,
      }))
    // Spots without a value for the sort key always go last; ties fall back to name.
    const val = (r: (typeof list)[number]): number | string | null => {
      switch (sort) {
        case 'score':
          return r.stats?.score ?? null
        case 'keepersPerVisit':
          return r.stats?.keepersPerVisit ?? null
        case 'lastVisit':
          return r.stats?.lastVisit ?? null
        case 'distance':
          return r.meters
        case 'name':
          return r.spot.name.toLowerCase()
      }
    }
    const ascending = sort === 'distance' || sort === 'name'
    return list.sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      if (va == null || vb == null) {
        if (va != null) return -1
        if (vb != null) return 1
      } else if (va !== vb) {
        return (va < vb ? -1 : 1) * (ascending ? 1 : -1)
      }
      return a.spot.name.localeCompare(b.spot.name)
    })
  }, [spots, stats, here, query, sort])

  if (!spots || !visits) return null

  async function onSortChange(next: SortKey) {
    setSort(next)
    if (next === 'distance' && !here) await locate()
  }

  return (
    <Page>
      <h1 className="mb-3 text-2xl font-extrabold">Spots</h1>
      <div className="mb-4 space-y-2">
        <PeriodPicker period={period} seasons={seasons} onChange={setPeriod} />
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
          <input
            type="search"
            aria-label="Find a spot"
            placeholder="Find a spot"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 rounded-lg border border-line bg-surface px-3 py-2"
          />
          <select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="rounded-lg border border-line bg-surface px-2 py-2 text-sm font-semibold"
          >
            {Object.entries(SORT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {sort === 'distance' && gps.status === 'locating' && (
          <p className="text-sm text-muted">Getting your location…</p>
        )}
        {sort === 'distance' && gps.status === 'error' && (
          <p className="text-sm text-danger">{gps.message}</p>
        )}
      </div>

      {spots.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
          No spots yet. They’re created when you log a catch.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-muted">No spots match “{query}”.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map(({ spot, stats: s, meters }) => (
            <li key={spot.id}>
              <Link
                to={`/spots/${spot.id}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-line"
              >
                <ScoreBadge score={s?.score ?? null} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{spot.name}</div>
                  <div className="truncate text-sm text-muted">
                    {s
                      ? `${s.visits} visit${s.visits === 1 ? '' : 's'} · last ${formatDayHeading(
                          localDayKey(s.lastVisit!),
                        )}`
                      : `No visits ${periodLabel(period)}`}
                    {meters != null && ` · ${formatDistance(meters)} away`}
                  </div>
                </div>
                {s && (
                  <div className="text-right tabular-nums">
                    <div className="text-xl font-extrabold">{formatRate(s.keepersPerVisit)}</div>
                    <div className="text-xs text-muted">kept/visit</div>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
