import type { Rating } from '../db'

const RATINGS: Rating[] = [1, 2, 3, 4, 5]
const RATING_LABELS: Record<Rating, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'OK',
  4: 'Good',
  5: 'Great',
}

export function RatingPicker({
  value,
  onChange,
}: {
  value: Rating | null
  onChange: (r: Rating) => void
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-muted">How good was the spot?</legend>
      <div className="grid grid-cols-5 gap-2">
        {RATINGS.map((r) => {
          const selected = value === r
          return (
            <button
              key={r}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(r)}
              className={`flex h-16 flex-col items-center justify-center rounded-xl border-2 font-bold ${
                selected ? 'border-ink' : 'border-line bg-surface'
              }`}
              style={
                selected
                  ? { background: `var(--q${r})`, color: r === 1 || r === 5 ? '#fff' : '#000' }
                  : undefined
              }
            >
              <span className="text-xl">{r}</span>
              <span className="text-xs font-medium">{RATING_LABELS[r]}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
