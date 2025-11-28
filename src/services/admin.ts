import api from './api'
import type { CeleryWorker, DashboardData } from '@/types'
import { API_URL } from '@/lib/constants'

export const adminService = {
  // Stats & Dashboard
  getStats: async (): Promise<DashboardData> => {
    const { data } = await api.get('/admin/stats')
    return data
  },

  getAlerts: async (): Promise<any[]> => {
    const { data } = await api.get('/admin/alerts')
    return data
  },

  // Metrics
  getMetrics: async (): Promise<any> => {
    const { data } = await api.get('/admin/performance/metrics')
    return data
  },

  getFailures: async (): Promise<any[]> => {
    const { data } = await api.get('/admin/performance/failures')
    return data
  },

  // Workers
  getWorkers: async (): Promise<CeleryWorker[]> => {
    const { data } = await api.get('/admin/workers')
    return data
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

  // SQL Query
  executeQuery: async (sql: string): Promise<any[]> => {
    const { data } = await api.post('/admin/query', { sql })
    return data
  },

  // Logs SSE
  createLogsStream: (level: string = 'INFO', source: string = 'all'): EventSource => {
    const params = new URLSearchParams({ level, source })
    return new EventSource(`${API_URL}/admin/logs/stream?${params}`)
  },
}
