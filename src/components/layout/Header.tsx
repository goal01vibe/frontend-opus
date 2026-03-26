import { Menu, FileText, Search, Code2, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { FloatingExtractionModule } from '../extraction/FloatingExtractionModule'
import { useUIStore } from '@/stores/uiStore'
import { adminService } from '@/services/admin'
import { bdpmService } from '@/services/bdpm'
import { useState } from 'react'
import { ClearDatabaseDialog } from './ClearDatabaseDialog'

export function Header() {
  const { setSearchOpen, devMode, toggleDevMode } = useUIStore()
  const [showClearDialog, setShowClearDialog] = useState(false)

  // Vérification réelle de la connexion au backend
  const { data: healthStatus } = useQuery({
    queryKey: ['health'],
    queryFn: adminService.checkHealth,
    refetchInterval: 10000, // Revérifier toutes les 10 secondes
    retry: false,
    staleTime: 5000,
  })

  const { data: bdpmStatus } = useQuery({
    queryKey: ['bdpm-status'],
    queryFn: bdpmService.getStatus,
    refetchInterval: 60000,
    retry: false,
    staleTime: 30000,
    enabled: devMode,
  })

  const isConnected = healthStatus?.status === 'connected'

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

        {/* Dev Mode Switch */}
        <button
          onClick={toggleDevMode}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 ${
            devMode
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
          }`}
          title={devMode ? 'Mode Dev actif - Logs complets' : 'Mode Prod - Logs minimes'}
        >
          <Code2 className={`w-4 h-4 ${devMode ? 'text-amber-600' : 'text-gray-400'}`} />
          <span className="text-xs font-medium">
            {devMode ? 'DEV' : 'PROD'}
          </span>
          <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${
            devMode ? 'bg-amber-400' : 'bg-gray-300'
          }`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              devMode ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </div>
        </button>

        {/* Connection Status - Vérification RÉELLE */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${
          isConnected
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected
              ? 'bg-green-500 animate-pulse'
              : 'bg-red-500'
          }`} />
          <span className={`text-xs font-medium ${
            isConnected ? 'text-green-700' : 'text-red-700'
          }`}>
            {isConnected ? 'Base Connectée' : 'Base Déconnectée'}
          </span>
          {isConnected && healthStatus?.latency && (
            <span className="text-xs text-green-600">({healthStatus.latency}ms)</span>
          )}
        </div>

        {/* BDPM Status Badge - Dev Mode Only */}
        {devMode && bdpmStatus && (
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            bdpmStatus.has_error
              ? 'bg-red-50 border-red-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              bdpmStatus.has_error ? 'bg-red-500' : 'bg-emerald-500'
            }`} />
            <span className={`text-xs font-medium ${
              bdpmStatus.has_error ? 'text-red-700' : 'text-emerald-700'
            }`}>
              {bdpmStatus.has_error ? 'BDPM ✗' : `BDPM ✓ ${(bdpmStatus.medicaments_count || 0).toLocaleString('fr-FR')} CIP13`}
            </span>
            {bdpmStatus.last_check && (
              <span className={`text-xs ${bdpmStatus.has_error ? 'text-red-500' : 'text-emerald-500'}`}>
                · {new Date(bdpmStatus.last_check).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {/* Clear Database - Dev Mode Only */}
        {devMode && (
          <button
            onClick={() => setShowClearDialog(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            title="Vider la base de données"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs font-medium">Vider DB</span>
          </button>
        )}

        {/* Extraction Module */}
        <FloatingExtractionModule />

        {/* User Avatar */}
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer border-2 border-white">
          AD
        </div>
      </div>
      <ClearDatabaseDialog open={showClearDialog} onClose={() => setShowClearDialog(false)} />
    </header>
  )
}
