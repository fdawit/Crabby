import { useSearchParams } from 'react-router-dom'
import { currentSeason, MONTH_NAMES, type Period } from './stats'

/** The selected period lives in the URL (?season=2025&month=8), so it survives tab switches. */
export function usePeriod(): [Period, (p: Period) => void] {
  const [params, setParams] = useSearchParams()
  const s = params.get('season')
  const m = params.get('month')
  const period: Period = {
    season: s === 'all' ? 'all' : s && /^\d{4}$/.test(s) ? Number(s) : currentSeason(),
    month: m && /^\d{1,2}$/.test(m) && Number(m) < 12 ? Number(m) : 'all',
  }
  const setPeriod = (p: Period) => {
    const next = new URLSearchParams(params)
    if (p.season === currentSeason()) next.delete('season')
    else next.set('season', String(p.season))
    if (p.month === 'all') next.delete('month')
    else next.set('month', String(p.month))
    setParams(next, { replace: true })
  }
  return [period, setPeriod]
}

export function periodLabel(p: Period): string {
  const season =
    p.season === 'all' ? 'all seasons' : p.season === currentSeason() ? 'this season' : String(p.season)
  return p.month === 'all' ? season : `${MONTH_NAMES[p.month]}, ${season}`
}
