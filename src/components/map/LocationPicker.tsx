import L from 'leaflet'
import { useMemo } from 'react'
import { MapContainer, Marker, useMapEvents } from 'react-leaflet'
import type { LatLng } from '../../lib/geo'
import { BaseLayers } from './BaseLayers'
import { useBasemap } from './useBasemap'
import { editPin } from './pins'

/** Small map for moving a spot: drag the pin or tap where it should be. */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng
  onChange: (p: LatLng) => void
}) {
  const [basemap] = useBasemap()
  const handlers = useMemo(
    () => ({
      dragend: (e: L.DragEndEvent) => {
        const p = (e.target as L.Marker).getLatLng()
        onChange({ lat: p.lat, lng: p.lng })
      },
    }),
    [onChange],
  )
  return (
    <div className="h-56 overflow-hidden rounded-xl border border-line">
      <MapContainer center={[value.lat, value.lng]} zoom={15} className="h-full w-full">
        <BaseLayers basemap={basemap} />
        <TapToMove onTap={onChange} />
        <Marker position={[value.lat, value.lng]} icon={editPin} draggable eventHandlers={handlers} />
      </MapContainer>
    </div>
  )
}

function TapToMove({ onTap }: { onTap: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}
