import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BackupPage } from './pages/BackupPage'
import { HomePage } from './pages/HomePage'
import { LogVisitPage } from './pages/LogVisitPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="log" element={<LogVisitPage />} />
        <Route path="visits/:visitId" element={<LogVisitPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  )
}
