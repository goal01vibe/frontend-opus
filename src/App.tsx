import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Extractions } from '@/pages/Extractions'
import { Fournisseurs } from '@/pages/Fournisseurs'
import { Templates } from '@/pages/Templates'
import { Export } from '@/pages/Export'
import { AdminLogs } from '@/pages/admin/Logs'
import { AdminWorkers } from '@/pages/admin/Workers'
import { AdminMetrics } from '@/pages/admin/Metrics'
import { AdminTemplateManager } from '@/pages/admin/TemplateManager'
import { AdminBatches } from '@/pages/admin/Batches'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

function App() {
  useKeyboardShortcuts()

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="extractions" element={<Extractions />} />
        <Route path="fournisseurs" element={<Fournisseurs />} />
        <Route path="templates" element={<Templates />} />
        <Route path="export" element={<Export />} />

        {/* Admin Routes */}
        <Route path="admin">
          <Route index element={<Navigate to="/admin/logs" replace />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="workers" element={<AdminWorkers />} />
          <Route path="metrics" element={<AdminMetrics />} />
          <Route path="templates" element={<AdminTemplateManager />} />
          <Route path="batches" element={<AdminBatches />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
