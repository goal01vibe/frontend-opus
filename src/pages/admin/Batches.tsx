/**
 * Page d'historique des batchs d'extraction
 *
 * Affiche l'historique des lots de traitement avec leurs statistiques
 * et permet de voir les détails de chaque batch.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  RotateCcw,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { batchService, type BatchHistoryItem, type BatchDocument } from '@/services/batches'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function AdminBatches() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)

  // Historique des batchs
  const {
    data: batchesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchService.getBatches(50),
    refetchInterval: 30000, // Refresh toutes les 30s
  })

  // Détail du batch sélectionné
  const { data: batchDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['batchDetail', selectedBatchId],
    queryFn: () => batchService.getBatchDetail(selectedBatchId!),
    enabled: !!selectedBatchId,
  })

  const batches = batchesData?.batches || []

  // Stats globales
  const stats = {
    total: batches.length,
    completed: batches.filter((b) => b.status === 'completed').length,
    inProgress: batches.filter((b) => b.status === 'in_progress').length,
    totalFiles: batches.reduce((acc, b) => acc + b.total_files, 0),
    totalSuccess: batches.reduce((acc, b) => acc + b.success_count, 0),
    totalErrors: batches.reduce((acc, b) => acc + b.error_count, 0),
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  const getStatusBadge = (batch: BatchHistoryItem) => {
    if (batch.status === 'in_progress') {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          <Loader2 className="w-3 h-3 animate-spin" />
          En cours
        </span>
      )
    }

    const successRate = batch.total_files > 0 ? (batch.success_count / batch.total_files) * 100 : 0

    if (batch.error_count === 0) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Complet
        </span>
      )
    } else if (successRate >= 80) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
          <AlertTriangle className="w-3 h-3" />
          Partiel
        </span>
      )
    } else {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <XCircle className="w-3 h-3" />
          Erreurs
        </span>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Chargement des batchs...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="flex h-full">
        {/* Liste des batchs */}
        <div className={cn('flex-1 p-6', selectedBatchId ? 'max-w-xl' : '')}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-800">Historique des Batchs</h2>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Rafraichir
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">Total</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">En cours</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">Terminés</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">Fichiers</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalFiles}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">Succès</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalSuccess}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">Erreurs</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalErrors}</p>
            </div>
          </div>

          {/* Liste */}
          {batches.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun batch dans l'historique</p>
              <p className="text-sm text-gray-400 mt-1">
                Les batchs apparaitront ici après leur traitement
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <div
                  key={batch.batch_id}
                  onClick={() => setSelectedBatchId(batch.batch_id)}
                  className={cn(
                    'bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition hover:shadow-md',
                    selectedBatchId === batch.batch_id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm font-bold text-gray-700">
                        #{batch.batch_id}
                      </div>
                      {getStatusBadge(batch)}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Fichiers</p>
                      <p className="font-medium text-gray-800">{batch.total_files}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Succès</p>
                      <p className="font-medium text-green-600">{batch.success_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Erreurs</p>
                      <p className="font-medium text-red-600">{batch.error_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Durée</p>
                      <p className="font-medium text-gray-800">
                        {formatDuration(batch.processing_time_seconds)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {batch.started_at &&
                      formatDistanceToNow(new Date(batch.started_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel détail */}
        {selectedBatchId && (
          <div className="w-96 border-l border-gray-200 bg-white p-6 overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800">Batch #{selectedBatchId}</h3>
              <button
                onClick={() => setSelectedBatchId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : batchDetail ? (
              <>
                {/* Résumé */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Démarré</p>
                      <p className="font-medium">
                        {batchDetail.batch.started_at &&
                          format(new Date(batchDetail.batch.started_at), 'dd/MM HH:mm', {
                            locale: fr,
                          })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Terminé</p>
                      <p className="font-medium">
                        {batchDetail.batch.completed_at
                          ? format(new Date(batchDetail.batch.completed_at), 'dd/MM HH:mm', {
                              locale: fr,
                            })
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Confidence moyenne</p>
                      <p className="font-medium">
                        {batchDetail.batch.avg_confidence
                          ? `${batchDetail.batch.avg_confidence}%`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Durée</p>
                      <p className="font-medium">
                        {formatDuration(batchDetail.batch.processing_time_seconds)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fichiers */}
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents ({batchDetail.document_count})
                </h4>

                <div className="space-y-2">
                  {batchDetail.documents.map((doc) => (
                    <div
                      key={doc.document_id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 truncate max-w-48">
                          {doc.filename}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            doc.status === 'AUTO_PROCESSED' && 'bg-green-100 text-green-700',
                            doc.status === 'NEEDS_REVIEW' && 'bg-yellow-100 text-yellow-700',
                            doc.status === 'FAILED' && 'bg-red-100 text-red-700'
                          )}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {doc.template_used && <span>Template: {doc.template_used}</span>}
                        <span>{doc.extraction_count} lignes</span>
                        <span>{doc.confidence_score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center py-12">Erreur de chargement</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
