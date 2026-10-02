import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BackupPage } from './pages/BackupPage'
import { HomePage } from './pages/HomePage'
import { LogVisitPage } from './pages/LogVisitPage'
import { SpotsPage } from './pages/SpotsPage'

// The map (Leaflet) and charts (Recharts) are most of the bundle; load them on demand so
// Home and Log catch open fast on a weak signal.
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })))
const SpotDetailPage = lazy(() =>
  import('./pages/SpotDetailPage').then((m) => ({ default: m.SpotDetailPage })),
)

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="log" element={<LogVisitPage />} />
        <Route path="visits/:visitId" element={<LogVisitPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="spots" element={<SpotsPage />} />
        <Route path="spots/:spotId" element={<SpotDetailPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  )
}
