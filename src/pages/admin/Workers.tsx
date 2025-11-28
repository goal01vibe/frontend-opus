import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Server, Play, Pause, RotateCcw, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/admin'
import type { CeleryWorker } from '@/types'

export function AdminWorkers() {
  const { data: workers = [], isLoading, refetch } = useQuery({
    queryKey: ['workers'],
    queryFn: adminService.getWorkers,
    refetchInterval: 5000,
  })

  const getStatusColor = (status: CeleryWorker['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'busy':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-red-500'
    }
  }

  const getStatusLabel = (status: CeleryWorker['status']) => {
    switch (status) {
      case 'online':
        return 'En ligne'
      case 'busy':
        return 'Occupé'
      case 'offline':
        return 'Hors ligne'
    }
  }

  const formatLastHeartbeat = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `il y a ${minutes} min`
    return `il y a ${Math.floor(minutes / 60)}h`
  }

  // Stats summary
  const stats = useMemo(() => {
    const online = workers.filter((w) => w.status === 'online').length
    const busy = workers.filter((w) => w.status === 'busy').length
    const offline = workers.filter((w) => w.status === 'offline').length
    const totalProcessed = workers.reduce((acc, w) => acc + w.processed_total, 0)
    const totalFailed = workers.reduce((acc, w) => acc + w.failed_total, 0)
    return { online, busy, offline, totalProcessed, totalFailed }
  }, [workers])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Chargement des workers...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-800">Workers Celery</h2>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RotateCcw className="w-4 h-4" />
          Rafraîchir
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">En ligne</p>
          <p className="text-2xl font-bold text-green-600">{stats.online}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Occupés</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.busy}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Hors ligne</p>
          <p className="text-2xl font-bold text-red-600">{stats.offline}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total traités</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalProcessed.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Échecs</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalFailed}</p>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="space-y-4">
        {workers.map((worker) => (
          <div
            key={worker.hostname}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-3 h-3 rounded-full', getStatusColor(worker.status))} />
                  <h3 className="font-bold text-gray-800">{worker.hostname}</h3>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      worker.status === 'online'
                        ? 'bg-green-100 text-green-700'
                        : worker.status === 'busy'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {getStatusLabel(worker.status)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatLastHeartbeat(worker.last_heartbeat)}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Tasks actives</p>
                  <p className="text-lg font-semibold text-gray-800">{worker.active_tasks}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total traitées</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {worker.processed_total.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Échecs</p>
                  <p className="text-lg font-semibold text-red-600">{worker.failed_total}</p>
                </div>
              </div>

              {/* Queues */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Queues:</p>
                <div className="flex gap-2">
                  {worker.queues.map((q) => (
                    <span
                      key={q}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              </div>

              {/* Current Task */}
              {worker.current_task && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-600 font-semibold mb-1">Tâche en cours:</p>
                  <p className="text-sm text-blue-800 font-mono">
                    {worker.current_task.name} ({worker.current_task.id.slice(0, 8)}...)
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                {worker.status === 'offline' ? (
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm font-medium">
                    <Play className="w-4 h-4" />
                    Démarrer
                  </button>
                ) : (
                  <>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition text-sm font-medium">
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium">
                      <RotateCcw className="w-4 h-4" />
                      Restart
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
