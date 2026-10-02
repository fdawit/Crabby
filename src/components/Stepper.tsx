interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}

/** Big thumb-sized +/- counter that also accepts typed numbers. */
export function Stepper({ label, value, onChange, min = 0 }: Props) {
  const id = `stepper-${label.toLowerCase().replace(/\W+/g, '-')}`
  const btn =
    'size-14 rounded-xl border border-line bg-surface text-2xl font-bold active:bg-line disabled:opacity-40'
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          value={value}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10)
            onChange(Number.isNaN(n) ? min : Math.max(min, n))
          }}
          onFocus={(e) => e.target.select()}
          className="h-14 w-20 rounded-xl border border-line bg-surface text-center text-2xl font-bold tabular-nums"
        />
        <button
          type="button"
          className={btn}
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
