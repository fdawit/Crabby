import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { ChartPoint } from '../lib/chartPoints'
import { qualityColors } from '../lib/quality'

const AXIS = { fontSize: 12, fill: 'var(--muted)' }
const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: -16 }

export function SpotCharts({ points, perVisitAverage }: { points: ChartPoint[]; perVisitAverage: boolean }) {
  if (points.length === 0) return <p className="text-muted">No visits in this season.</p>
  const catchTitle = perVisitAverage ? 'Average catch per visit' : 'Catch per visit'
  const ratingTitle = perVisitAverage ? 'Average rating' : 'Rating'

  return (
    <div className="space-y-4">
      <figure>
        <figcaption className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold">{catchTitle}</span>
          <span className="flex gap-3 text-xs font-semibold text-muted">
            <Swatch color="var(--series-keepers)" label="Keepers" />
            <Swatch color="var(--series-throwbacks)" label="Throwbacks" />
          </span>
        </figcaption>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={CHART_MARGIN} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={12} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={perVisitAverage} />
              <Tooltip content={PointTooltip} cursor={{ fill: 'var(--line)', opacity: 0.4 }} />
              <Bar
                dataKey="keepers"
                stackId="catch"
                fill="var(--series-keepers)"
                stroke="var(--surface)"
                strokeWidth={1}
                maxBarSize={24}
                isAnimationActive={false}
              />
              <Bar
                dataKey="throwbacks"
                stackId="catch"
                fill="var(--series-throwbacks)"
                stroke="var(--surface)"
                strokeWidth={1}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>

      <figure>
        <figcaption className="mb-1 text-sm font-bold">{ratingTitle}</figcaption>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={CHART_MARGIN}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={12} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip content={PointTooltip} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
              <Line
                dataKey="rating"
                stroke="var(--muted)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive={false}
                dot={RatingDot}
                activeDot={RatingDot}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="size-3 rounded-sm" style={{ background: color }} aria-hidden />
      {label}
    </span>
  )
}

function RatingDot(props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return <g key={props.index} />
  return (
    <circle
      key={props.index}
      cx={cx}
      cy={cy}
      r={5}
      fill={qualityColors(payload.rating).background}
      stroke="var(--surface)"
      strokeWidth={2}
    />
  )
}

function PointTooltip({ active, payload }: TooltipContentProps) {
  const p = payload?.[0]?.payload as ChartPoint | undefined
  if (!active || !p) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <div className="font-bold">
        {p.label}
        {p.visits > 1 && <span className="font-normal text-muted"> · {p.visits} visits</span>}
      </div>
      <div className="tabular-nums">
        <Swatch color="var(--series-keepers)" label={`${p.keepers} keepers`} />
        <Swatch color="var(--series-throwbacks)" label={`${p.throwbacks} throwbacks`} />
        <div className="text-muted">Rating {p.rating}</div>
      </div>
    </div>
  )
}
