/**
 * useAdminStream - Hook SSE pour monitoring admin en temps réel
 *
 * Se connecte à /admin/stream pour recevoir:
 * - workers_update: État des workers Celery (toutes les 5s)
 * - metrics_update: Métriques de performance (toutes les 10s)
 * - batch_progress: Progression des batchs en cours (temps réel)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { API_URL } from '@/lib/constants'
import type { CeleryWorker } from '@/types'

// Types pour les événements SSE
export interface WorkersUpdate {
  workers: CeleryWorker[]
  timestamp: string
  celery_available: boolean
}

export interface MetricsUpdate {
  timestamp: string
  active_processings: number
  recent_failures: number
  stats: {
    total_processed: number
    success_rate: number
  }
}

export interface BatchProgressEvent {
  batch_id: string
  filename?: string
  status?: string
  template_used?: string
  confidence_score?: number
  processing_time_ms?: number
  error?: string
  type: 'file_start' | 'file_complete' | 'file_warning' | 'file_error' | 'batch_complete'
}

export interface AdminStreamState {
  workers: CeleryWorker[]
  metrics: MetricsUpdate | null
  activeBatches: Map<string, BatchProgressEvent[]>
  isConnected: boolean
  error: string | null
  lastUpdate: string | null
}

interface UseAdminStreamOptions {
  onWorkerUpdate?: (data: WorkersUpdate) => void
  onMetricsUpdate?: (data: MetricsUpdate) => void
  onBatchProgress?: (data: BatchProgressEvent) => void
  onBatchComplete?: (batchId: string) => void
  autoReconnect?: boolean
  reconnectDelay?: number
}

export function useAdminStream(options: UseAdminStreamOptions = {}) {
  const {
    onWorkerUpdate,
    onMetricsUpdate,
    onBatchProgress,
    onBatchComplete,
    autoReconnect = true,
    reconnectDelay = 3000,
  } = options

  const [state, setState] = useState<AdminStreamState>({
    workers: [],
    metrics: null,
    activeBatches: new Map(),
    isConnected: false,
    error: null,
    lastUpdate: null,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    // Éviter les connexions multiples
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return
    }

    // Nettoyer les connexions précédentes
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`${API_URL}/admin/stream`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setState((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
      }))
    }

    // Workers update
    eventSource.addEventListener('workers_update', (e) => {
      try {
        const data: WorkersUpdate = JSON.parse(e.data)
        setState((prev) => ({
          ...prev,
          workers: data.workers,
          lastUpdate: data.timestamp,
        }))
        onWorkerUpdate?.(data)
      } catch (err) {
        console.error('Error parsing workers_update:', err)
      }
    })

    // Metrics update
    eventSource.addEventListener('metrics_update', (e) => {
      try {
        const data: MetricsUpdate = JSON.parse(e.data)
        setState((prev) => ({
          ...prev,
          metrics: data,
          lastUpdate: data.timestamp,
        }))
        onMetricsUpdate?.(data)
      } catch (err) {
        console.error('Error parsing metrics_update:', err)
      }
    })

    // Batch progress
    eventSource.addEventListener('batch_progress', (e) => {
      try {
        const data: BatchProgressEvent = JSON.parse(e.data)
        setState((prev) => {
          const newBatches = new Map(prev.activeBatches)
          const batchId = data.batch_id

          if (batchId) {
            const events = newBatches.get(batchId) || []
            newBatches.set(batchId, [...events, data])

            // Si batch terminé, déclencher callback
            if (data.type === 'batch_complete') {
              onBatchComplete?.(batchId)
            }
          }

          return {
            ...prev,
            activeBatches: newBatches,
            lastUpdate: new Date().toISOString(),
          }
        })
        onBatchProgress?.(data)
      } catch (err) {
        console.error('Error parsing batch_progress:', err)
      }
    })

    eventSource.onerror = () => {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'Connexion perdue',
      }))

      eventSource.close()

      // Auto-reconnect
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, reconnectDelay)
      }
    }
  }, [onWorkerUpdate, onMetricsUpdate, onBatchProgress, onBatchComplete, autoReconnect, reconnectDelay])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setState((prev) => ({
      ...prev,
      isConnected: false,
    }))
  }, [])

  // Effacer un batch terminé du state
  const clearBatch = useCallback((batchId: string) => {
    setState((prev) => {
      const newBatches = new Map(prev.activeBatches)
      newBatches.delete(batchId)
      return { ...prev, activeBatches: newBatches }
    })
  }, [])

  // Connexion automatique au montage
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    ...state,
    connect,
    disconnect,
    clearBatch,
    workerCount: state.workers.length,
    busyWorkers: state.workers.filter((w) => w.status === 'busy').length,
  }
}

/**
 * Hook simplifié pour juste les workers (polling REST fallback)
 */
export function useWorkers(pollingInterval = 5000) {
  const [workers, setWorkers] = useState<CeleryWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/workers`)
      if (!res.ok) throw new Error('Failed to fetch workers')
      const data = await res.json()
      setWorkers(data.workers || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkers()
    const interval = setInterval(fetchWorkers, pollingInterval)
    return () => clearInterval(interval)
  }, [fetchWorkers, pollingInterval])

  return { workers, loading, error, refetch: fetchWorkers }
}

/**
 * Hook pour l'historique des batchs
 */
export interface BatchHistoryItem {
  batch_id: string
  started_at: string
  completed_at: string | null
  total_files: number
  success_count: number
  warning_count: number
  error_count: number
  avg_confidence: number | null
  processing_time_seconds: number | null
  status: 'completed' | 'in_progress'
}

export function useBatchHistory(limit = 20) {
  const [batches, setBatches] = useState<BatchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/batches?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch batch history')
      const data = await res.json()
      setBatches(data.batches || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  return { batches, loading, error, refetch: fetchBatches }
}
