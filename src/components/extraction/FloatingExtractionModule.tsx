import { Upload, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExtractionStore } from '@/stores/extractionStore'
import { BatchProgressCard } from './BatchProgressCard'

export function FloatingExtractionModule() {
  const {
    isModuleExpanded,
    toggleModule,
    openUploadModal,
    activeBatches,
    completedToday,
    failedToday,
    partialToday,
  } = useExtractionStore()

  const activeCount = activeBatches.length
  const hasActive = activeCount > 0

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={toggleModule}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
          hasActive
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        )}
      >
        {hasActive ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">Extraction</span>
        {hasActive && (
          <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full font-semibold">
            {activeCount}
          </span>
        )}
        {isModuleExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isModuleExpanded && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              <span className="font-semibold">Extractions en cours</span>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {activeBatches.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucune extraction en cours</p>
                <button
                  onClick={openUploadModal}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Nouvelle extraction
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeBatches.map((batch) => (
                  <BatchProgressCard key={batch.batch_id} batch={batch} />
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Aujourd'hui:</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-green-600" title="Extractions complètes">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-semibold">{completedToday}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-500" title="Extractions partielles (en attente)">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-semibold">{partialToday}</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-500" title="Extractions échouées">
                  <XCircle className="w-4 h-4" />
                  <span className="font-semibold">{failedToday}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
