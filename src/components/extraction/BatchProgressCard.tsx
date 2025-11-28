import { CheckCircle, Clock, FileText, Server, XCircle } from 'lucide-react'
import type { BatchProgress } from '@/types'
import { cn } from '@/lib/utils'

interface BatchProgressCardProps {
  batch: BatchProgress
}

export function BatchProgressCard({ batch }: BatchProgressCardProps) {
  const progress = Math.round((batch.completed / batch.total_files) * 100)
  const isComplete = batch.completed === batch.total_files
  const hasFailed = batch.failed > 0

  const formatTime = (seconds?: number) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `~${mins}min ${secs}s` : `~${secs}s`
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-500">
            #{batch.batch_id.slice(0, 8)}
          </span>
          {isComplete && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Terminé
            </span>
          )}
          {hasFailed && !isComplete && (
            <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
              <XCircle className="w-3 h-3" />
              {batch.failed} échec(s)
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isComplete ? 'bg-green-500' : hasFailed ? 'bg-orange-500' : 'bg-blue-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
          <span>{batch.completed}/{batch.total_files} fichiers</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {batch.estimated_time_remaining && !isComplete && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(batch.estimated_time_remaining)}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Server className="w-3 h-3" />
          <span>{batch.workers_active} workers</span>
        </div>
      </div>

      {/* Current File */}
      {batch.current_file && !isComplete && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 truncate">
          <FileText className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{batch.current_file}</span>
        </div>
      )}
    </div>
  )
}
