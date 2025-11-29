import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ExtractionModal } from '@/components/extraction/ExtractionModal'

export function Layout() {
  return (
    <div className="flex flex-col h-screen relative bg-gray-50 overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex flex-col flex-1 overflow-hidden bg-gray-50 relative w-full transition-all duration-300 ease-out">
          <Outlet />
        </main>
      </div>
      <ExtractionModal />
    </div>
  )
}
