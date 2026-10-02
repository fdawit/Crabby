import type { Rating } from '../db'
import { qualityColors } from '../lib/quality'
import { formatScore } from '../lib/stats'

const DIMS = { md: 'size-9 text-base', lg: 'size-12 text-lg' }

/** A single visit's rating. */
export function QualityBadge({ rating, size = 'md' }: { rating: Rating; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`${DIMS[size]} inline-flex shrink-0 items-center justify-center rounded-full font-bold`}
      style={qualityColors(rating)}
      aria-label={`Quality ${rating} of 5`}
    >
      {rating}
    </span>
  )
}

/** A spot's averaged score, or a gray dash when it has no visits in the period. */
export function ScoreBadge({ score, size = 'md' }: { score: number | null; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`${DIMS[size]} inline-flex shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums`}
      style={qualityColors(score)}
      aria-label={score == null ? 'No visits in this period' : `Score ${formatScore(score)} of 5`}
    >
      {formatScore(score)}
    </span>
  )
}
