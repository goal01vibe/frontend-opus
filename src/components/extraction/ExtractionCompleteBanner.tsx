/**
 * ExtractionCompleteBanner
 *
 * Banner de notification qui apparait quand un batch est terminé.
 * Affiche un résumé et permet de naviguer vers les résultats.
 */
import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, ExternalLink, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export interface BatchCompleteData {
  batch_id: string
  total_files: number
  success_count: number
  warning_count: number
  error_count: number
  avg_confidence?: number
  processing_time_seconds?: number
}

interface ExtractionCompleteBannerProps {
  data: BatchCompleteData
  onDismiss: () => void
  autoDismissAfter?: number // ms, 0 = no auto dismiss
}

export function ExtractionCompleteBanner({
  data,
  onDismiss,
  autoDismissAfter = 15000,
}: ExtractionCompleteBannerProps) {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  // Calculer le statut global
  const successRate = data.total_files > 0 ? (data.success_count / data.total_files) * 100 : 0
  const isFullSuccess = data.error_count === 0 && data.warning_count === 0
  const hasErrors = data.error_count > 0

  // Auto-dismiss avec barre de progression
  useEffect(() => {
    if (autoDismissAfter <= 0) return

    const startTime = Date.now()
    const endTime = startTime + autoDismissAfter

    const interval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, ((endTime - now) / autoDismissAfter) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        handleDismiss()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [autoDismissAfter])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300) // Attendre l'animation
  }

  const handleViewResults = () => {
    navigate(`/admin/batches`)
    handleDismiss()
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-md w-full transform transition-all duration-300',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
    >
      <div
        className={cn(
          'rounded-xl shadow-2xl border overflow-hidden',
          isFullSuccess
            ? 'bg-green-50 border-green-200'
            : hasErrors
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        )}
      >
        {/* Progress bar */}
        {autoDismissAfter > 0 && (
          <div className="h-1 bg-gray-200">
            <div
              className={cn(
                'h-full transition-all duration-50',
                isFullSuccess ? 'bg-green-500' : hasErrors ? 'bg-red-500' : 'bg-yellow-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {isFullSuccess ? (
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              ) : hasErrors ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-800">
                  {isFullSuccess
                    ? 'Extraction terminée'
                    : hasErrors
                    ? 'Extraction avec erreurs'
                    : 'Extraction partielle'}
                </h3>
                <p className="text-sm text-gray-500">Batch #{data.batch_id}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{data.total_files}</p>
              <p className="text-xs text-gray-500">Fichiers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{data.success_count}</p>
              <p className="text-xs text-gray-500">Succès</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-600">{data.warning_count}</p>
              <p className="text-xs text-gray-500">Avertis.</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{data.error_count}</p>
              <p className="text-xs text-gray-500">Erreurs</p>
            </div>
          </div>

          {/* Extra info */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
            {data.avg_confidence && (
              <span>Confidence: {Math.round(data.avg_confidence)}%</span>
            )}
            {data.processing_time_seconds && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(data.processing_time_seconds)}
              </span>
            )}
            <span>{Math.round(successRate)}% traités</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleViewResults}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition',
                isFullSuccess
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : hasErrors
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              )}
            >
              <ExternalLink className="w-4 h-4" />
              Voir les résultats
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook pour gérer les notifications de fin de batch
 */
export function useBatchCompleteNotification() {
  const [notifications, setNotifications] = useState<BatchCompleteData[]>([])

  const addNotification = (data: BatchCompleteData) => {
    setNotifications((prev) => [...prev, data])
  }

  const dismissNotification = (batchId: string) => {
    setNotifications((prev) => prev.filter((n) => n.batch_id !== batchId))
  }

  const dismissAll = () => {
    setNotifications([])
  }

  return {
    notifications,
    addNotification,
    dismissNotification,
    dismissAll,
    hasNotifications: notifications.length > 0,
  }
}
