import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Terminal, Pause, Play, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/admin'
import type { LogEntry } from '@/types'

export function AdminLogs() {
  const [isPaused, setIsPaused] = useState(false)
  const [levelFilter, setLevelFilter] = useState<string>('INFO')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Fetch real logs from API
  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['logs', levelFilter],
    queryFn: () => adminService.getLogs('app', 100, levelFilter !== 'DEBUG' ? levelFilter : undefined),
    refetchInterval: isPaused ? false : 5000,
  })

  const logs: LogEntry[] = logsData?.logs || []

  // Filter logs
  const filteredLogs = useMemo(() => {
    const levels: Record<string, number> = { DEBUG: 0, INFO: 1, WARNING: 2, ERROR: 3, CRITICAL: 4 }
    const minLevel = levels[levelFilter] || 0

    return logs.filter((log) => {
      if (levels[log.level] < minLevel) return false
      if (sourceFilter !== 'all' && log.source !== sourceFilter) return false
      if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
  }, [logs, levelFilter, sourceFilter, searchTerm])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'DEBUG':
        return 'text-gray-400'
      case 'INFO':
        return 'text-blue-500'
      case 'WARNING':
        return 'text-yellow-500'
      case 'ERROR':
        return 'text-red-500'
      case 'CRITICAL':
        return 'text-red-700 font-bold'
      default:
        return 'text-gray-500'
    }
  }

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      api: 'bg-blue-100 text-blue-700',
      worker: 'bg-green-100 text-green-700',
      extractor: 'bg-purple-100 text-purple-700',
      template: 'bg-orange-100 text-orange-700',
    }
    return colors[source] || 'bg-gray-100 text-gray-700'
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR')
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Chargement des logs...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-800">Logs Temps Réel</h2>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              isPaused ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
            )}
          >
            {isPaused ? 'En pause' : 'Live'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              'p-2 rounded-lg transition',
              isPaused
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            )}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
            title="Rafraîchir"
          >
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Niveau:</label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="DEBUG">DEBUG+</option>
            <option value="INFO">INFO+</option>
            <option value="WARNING">WARNING+</option>
            <option value="ERROR">ERROR+</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Source:</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes</option>
            <option value="api">API</option>
            <option value="worker">Worker</option>
            <option value="extractor">Extractor</option>
            <option value="template">Template</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">{filteredLogs.length} logs</span>
      </div>

      {/* Logs Container */}
      <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden shadow-lg">
        <div className="h-full overflow-y-auto custom-scrollbar p-4 font-mono text-sm">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 py-1 hover:bg-slate-800 px-2 rounded"
            >
              <span className="text-slate-500 flex-shrink-0">{formatTime(log.timestamp)}</span>
              <span className={cn('w-16 flex-shrink-0 font-semibold', getLevelColor(log.level))}>
                [{log.level}]
              </span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-xs flex-shrink-0',
                  getSourceBadge(log.source)
                )}
              >
                {log.source}
              </span>
              <span className="text-slate-300 flex-1">{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  )
}
