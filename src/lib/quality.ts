/** Fill and text colors for a 1–5 quality value (rounded); gray when there is no value. */
export function qualityColors(value: number | null): { background: string; color: string } {
  if (value == null) return { background: 'var(--q-none)', color: 'var(--ink)' }
  const step = Math.min(5, Math.max(1, Math.round(value)))
  return { background: `var(--q${step})`, color: step === 1 || step === 5 ? '#fff' : '#000' }
}
