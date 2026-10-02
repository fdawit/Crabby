import L from 'leaflet'
import { qualityColors } from '../../lib/quality'
import { formatScore } from '../../lib/stats'

/** Below this zoom, nearby spots would overlap, so pins shrink to unlabeled dots. */
export const LABELED_PIN_MIN_ZOOM = 13

/** A round pin showing the score, colored on the quality scale. */
export function scorePin(score: number | null, selected = false, compact = false): L.DivIcon {
  const { background, color } = qualityColors(score)
  if (compact && !selected) {
    return L.divIcon({
      className: 'crabby-pin',
      html: `<span style="background:${background};width:18px;height:18px"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
  }
  const size = selected ? 44 : 36
  return L.divIcon({
    className: 'crabby-pin',
    html: `<span style="background:${background};color:${color};width:${size}px;height:${size}px" class="${
      selected ? 'selected' : ''
    }">${formatScore(score)}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export const herePin = L.divIcon({
  className: 'crabby-here',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

/** Draggable marker used when moving a spot. */
export const editPin = L.divIcon({
  className: 'crabby-pin',
  html: '<span class="selected" style="background:var(--accent);color:var(--accent-ink);width:40px;height:40px">✥</span>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})
