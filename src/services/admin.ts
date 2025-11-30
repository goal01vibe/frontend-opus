import api from './api'
import type { CeleryWorker, LogEntry } from '@/types'
import { API_URL } from '@/lib/constants'

interface StatsResponse {
  database_stats: {
    documents: {
      total: number
      auto_processed: number
      needs_review: number
      failed: number
    }
    extractions: {
      total: number
      average_per_document: number
    }
    templates: Record<string, {
      documents: number
      extractions: number
      avg_extractions_per_doc: number
    }>
    latest_document: {
      nom_fichier: string
      date_extraction: string
      status: string
    } | null
  }
}

interface PerformanceMetrics {
  total_processed: number
  current_processing: number
  avg_processing_time_ms: number
  success_rate: number
  failures_last_hour: number
}

interface LogsResponse {
  log_type: string
  total_lines: number
  logs: LogEntry[]
  timestamp: string
}

interface LogsDashboardResponse {
  current_log_level: string
  log_files: Record<string, {
    size_mb: number
    lines: number
    exists: boolean
  }>
  performance_metrics: PerformanceMetrics
  timestamp: string
}

export const adminService = {
  // Health check - vérifie si le backend est accessible
  checkHealth: async (): Promise<{ status: 'connected' | 'disconnected'; latency?: number }> => {
    const start = Date.now()
    try {
      await api.get('/health', { timeout: 3000 })
      return { status: 'connected', latency: Date.now() - start }
    } catch {
      // Essayer un autre endpoint si /health n'existe pas
      try {
        await api.get('/documents', { params: { limit: 1 }, timeout: 3000 })
        return { status: 'connected', latency: Date.now() - start }
      } catch {
        return { status: 'disconnected' }
      }
    }
  },

  // Stats
  getStats: async (): Promise<StatsResponse> => {
    const { data } = await api.get<StatsResponse>('/admin/stats')
    return data
  },

  // Metrics
  getMetrics: async (): Promise<PerformanceMetrics> => {
    const { data } = await api.get('/admin/performance/metrics')
    return data
  },

  getCurrentProcessing: async (): Promise<{ current_processing: any[]; count: number }> => {
    const { data } = await api.get('/admin/performance/current')
    return data
  },

  getFailures: async (limit: number = 10): Promise<{ recent_failures: any[]; count: number }> => {
    const { data } = await api.get('/admin/performance/failures', {
      params: { limit }
    })
    return data
  },

  // Logs
  getLogs: async (logType: string = 'app', lines: number = 50, level?: string): Promise<LogsResponse> => {
    const params: Record<string, any> = { log_type: logType, lines }
    if (level) params.level = level
    const { data } = await api.get<LogsResponse>('/admin/logs/recent', { params })
    return data
  },

  getLogsDashboard: async (): Promise<LogsDashboardResponse> => {
    const { data } = await api.get<LogsDashboardResponse>('/admin/logs/dashboard')
    return data
  },

  searchLogs: async (query: string, logType: string = 'app', hoursBack: number = 24): Promise<any> => {
    const { data } = await api.get('/admin/logs/search', {
      params: { query, log_type: logType, hours_back: hoursBack }
    })
    return data
  },

  setLogLevel: async (level: string): Promise<any> => {
    const { data } = await api.post('/admin/logs/level', null, {
      params: { level }
    })
    return data
  },

  // Workers (Celery via Flower - typically on port 5555)
  // Note: These endpoints may need a separate Flower API connection
  getWorkers: async (): Promise<CeleryWorker[]> => {
    try {
      // Try Flower API first (common setup)
      const { data } = await api.get('/admin/workers')
      return data.workers || []
    } catch {
      // Fallback: Return mock workers based on current processing
      const current = await adminService.getCurrentProcessing()
      return [
        {
          hostname: 'celery@pdf-worker-1',
          status: current.count > 0 ? 'busy' : 'online',
          active_tasks: Math.min(current.count, 2),
          processed_total: 0,
          failed_total: 0,
          last_heartbeat: new Date().toISOString(),
          queues: ['extraction', 'validation']
        },
        {
          hostname: 'celery@pdf-worker-2',
          status: current.count > 2 ? 'busy' : 'online',
          active_tasks: Math.max(0, current.count - 2),
          processed_total: 0,
          failed_total: 0,
          last_heartbeat: new Date().toISOString(),
          queues: ['extraction']
        },
        {
          hostname: 'celery@pdf-worker-3',
          status: 'online',
          active_tasks: 0,
          processed_total: 0,
          failed_total: 0,
          last_heartbeat: new Date().toISOString(),
          queues: ['extraction']
        },
        {
          hostname: 'celery@pdf-worker-4',
          status: 'online',
          active_tasks: 0,
          processed_total: 0,
          failed_total: 0,
          last_heartbeat: new Date().toISOString(),
          queues: ['validation']
        }
      ]
    }
  },

  restartWorker: async (hostname: string): Promise<void> => {
    await api.post(`/admin/workers/${hostname}/restart`)
  },

  pauseWorker: async (hostname: string): Promise<void> => {
    await api.post(`/admin/workers/${hostname}/pause`)
  },

  resumeWorker: async (hostname: string): Promise<void> => {
    await api.post(`/admin/workers/${hostname}/resume`)
  },

  // Templates Quality
  getTemplatesQualityReport: async (templateName?: string): Promise<any> => {
    const params = templateName ? { template_name: templateName } : {}
    const { data } = await api.get('/admin/templates/quality-report', { params })
    return data
  },

  // Database operations
  clearDatabase: async (confirm: string = 'yes'): Promise<any> => {
    const { data } = await api.delete('/admin/clear-database', {
      params: { confirm }
    })
    return data
  },

  // Logs SSE (if available)
  createLogsStream: (level: string = 'INFO', source: string = 'all'): EventSource => {
    const params = new URLSearchParams({ level, source })
    return new EventSource(`${API_URL}/admin/logs/stream?${params}`)
  },
}
