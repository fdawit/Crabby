import { currentSeason, MONTH_NAMES, type Period } from '../lib/stats'

export function PeriodPicker({
  period,
  seasons,
  onChange,
}: {
  period: Period
  seasons: number[]
  onChange: (p: Period) => void
}) {
  const select =
    'min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-2 text-sm font-semibold'
  return (
    <div className="flex gap-2">
      <select
        aria-label="Season"
        value={String(period.season)}
        onChange={(e) =>
          onChange({ ...period, season: e.target.value === 'all' ? 'all' : Number(e.target.value) })
        }
        className={select}
      >
        {seasons.map((y) => (
          <option key={y} value={y}>
            {y === currentSeason() ? 'This season' : `${y} season`}
          </option>
        ))}
        <option value="all">All seasons</option>
      </select>
      <select
        aria-label="Month"
        value={String(period.month)}
        onChange={(e) =>
          onChange({ ...period, month: e.target.value === 'all' ? 'all' : Number(e.target.value) })
        }
        className={select}
      >
        <option value="all">Every month</option>
        {MONTH_NAMES.map((name, m) => (
          <option key={name} value={m}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}
