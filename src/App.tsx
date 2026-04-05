import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Loader2 } from 'lucide-react'

// Lazy-loaded pages (code splitting)
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Extractions = React.lazy(() => import('./pages/Extractions'))
const Fournisseurs = React.lazy(() => import('./pages/Fournisseurs'))
const Templates = React.lazy(() => import('./pages/Templates'))
const Export = React.lazy(() => import('./pages/Export'))
const AdminLogs = React.lazy(() => import('./pages/admin/Logs'))
const AdminWorkers = React.lazy(() => import('./pages/admin/Workers'))
const AdminMetrics = React.lazy(() => import('./pages/admin/Metrics'))
const AdminTemplateManager = React.lazy(() => import('./pages/admin/TemplateManager'))
const AdminBatches = React.lazy(() => import('./pages/admin/Batches'))

const PageLoader = (
  <div className="flex items-center justify-center h-full">
    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
  </div>
)

function App() {
  useKeyboardShortcuts()

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Suspense fallback={PageLoader}><Dashboard /></Suspense>} />
        <Route path="extractions" element={<Suspense fallback={PageLoader}><Extractions /></Suspense>} />
        <Route path="fournisseurs" element={<Suspense fallback={PageLoader}><Fournisseurs /></Suspense>} />
        <Route path="templates" element={<Suspense fallback={PageLoader}><Templates /></Suspense>} />
        <Route path="export" element={<Suspense fallback={PageLoader}><Export /></Suspense>} />

        {/* Admin Routes */}
        <Route path="admin">
          <Route index element={<Navigate to="/admin/logs" replace />} />
          <Route path="logs" element={<Suspense fallback={PageLoader}><AdminLogs /></Suspense>} />
          <Route path="workers" element={<Suspense fallback={PageLoader}><AdminWorkers /></Suspense>} />
          <Route path="metrics" element={<Suspense fallback={PageLoader}><AdminMetrics /></Suspense>} />
          <Route path="templates" element={<Suspense fallback={PageLoader}><AdminTemplateManager /></Suspense>} />
          <Route path="batches" element={<Suspense fallback={PageLoader}><AdminBatches /></Suspense>} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
