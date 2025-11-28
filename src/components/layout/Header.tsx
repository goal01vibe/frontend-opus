import { Menu, FileText, Search } from 'lucide-react'
import { FloatingExtractionModule } from '../extraction/FloatingExtractionModule'
import { useUIStore } from '@/stores/uiStore'

export function Header() {
  const { setSearchOpen } = useUIStore()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-30 relative shrink-0 h-16">
      <div className="flex items-center gap-3">
        <button className="md:hidden text-gray-500 p-2 hover:bg-gray-100 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-2 rounded-lg shadow-blue-200 shadow-md">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-800 tracking-tight leading-tight">
            PDF Extractor
          </h1>
          <p className="text-xs text-gray-400">Production Dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 text-sm text-gray-500 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Rechercher...</span>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 bg-white rounded border border-gray-300 text-xs text-gray-400">
            ⌘K
          </kbd>
        </button>

        {/* Connection Status */}
        <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-gray-600">Base Connectée</span>
        </div>

        {/* Extraction Module */}
        <FloatingExtractionModule />

        {/* User Avatar */}
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer border-2 border-white">
          AD
        </div>
      </div>
    </header>
  )
}
