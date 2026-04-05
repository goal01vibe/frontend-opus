import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { bdpmService, type BdpmStatus } from '@/services/bdpm'

export function BdpmAlert() {
  const [status, setStatus] = useState<BdpmStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await bdpmService.getStatus()
        setStatus(data)
      } catch (err) {
        // Silently fail - don't show error if BDPM check fails
        console.warn('BDPM status check failed:', err)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()

    // Re-check once per day (24h)
    const interval = setInterval(checkStatus, 24 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Don't show anything while loading or if dismissed
  if (loading || dismissed) return null

  // Don't show if no error
  if (!status?.has_error) return null

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm">
          <strong>Erreur BDPM:</strong>{' '}
          {status.last_error?.message || 'Echec du dernier telechargement'}
          {status.last_error?.timestamp && (
            <span className="ml-2 opacity-75">({status.last_error.timestamp})</span>
          )}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-red-700 rounded transition-colors"
        title="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
