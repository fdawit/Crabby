import { useState } from 'react'
import type { LatLng } from './geo'

export type PositionState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ok'; position: LatLng }
  | { status: 'error'; message: string }

/** One-shot GPS lookup, triggered by a tap. */
export function useCurrentPosition(): [PositionState, () => Promise<LatLng | null>] {
  const [state, setState] = useState<PositionState>({ status: 'idle' })

  const locate = () =>
    new Promise<LatLng | null>((resolve) => {
      if (!('geolocation' in navigator)) {
        setState({ status: 'error', message: 'This device can’t share its location.' })
        return resolve(null)
      }
      setState({ status: 'locating' })
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setState({ status: 'ok', position })
          resolve(position)
        },
        (err) => {
          setState({
            status: 'error',
            message:
              err.code === err.PERMISSION_DENIED
                ? 'Location permission was denied.'
                : 'Couldn’t get a GPS fix. Try again.',
          })
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
      )
    })

  return [state, locate]
}
