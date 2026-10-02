import { useState } from 'react'
import { loadBasemap, saveBasemap, type Basemap } from './tiles'

/** Basemap choice, remembered on this device. NOAA charts by default. */
export function useBasemap(): [Basemap, (b: Basemap) => void] {
  const [basemap, setBasemap] = useState<Basemap>(loadBasemap)
  return [
    basemap,
    (b) => {
      saveBasemap(b)
      setBasemap(b)
    },
  ]
}
