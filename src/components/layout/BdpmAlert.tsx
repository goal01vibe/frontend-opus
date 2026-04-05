import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, X } from 'lucide-react'
import { bdpmService, type BdpmStatus } from '@/services/bdpm'

export function BdpmAlert() {
  const [dismissed, setDismissed] = useState(false)

  const { data: status, isLoading } = useQuery<BdpmStatus>({
    queryKey: ['bdpm-status'],
    queryFn: () => bdpmService.getStatus(),
    refetchInterval: 24 * 60 * 60 * 1000, // 1 fois par jour
    staleTime: 60 * 60 * 1000, // 1h
  })

  // Don't show anything while loading or if dismissed
  if (isLoading || dismissed) return null

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
