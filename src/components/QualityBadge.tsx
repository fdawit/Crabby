import type { Rating } from '../db'

const LIGHT_TEXT = new Set([1, 5])

export function QualityBadge({ rating, size = 'md' }: { rating: Rating; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'size-12 text-lg' : 'size-9 text-base'
  return (
    <span
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full font-bold ${
        LIGHT_TEXT.has(rating) ? 'text-white' : 'text-black'
      }`}
      style={{ background: `var(--q${rating})` }}
      aria-label={`Quality ${rating} of 5`}
    >
      {rating}
    </span>
  )
}
