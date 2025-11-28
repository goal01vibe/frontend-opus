import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { BatchTask } from '@/types'
import { API_URL } from '@/lib/constants'

interface UseBatchProgressOptions {
  onComplete?: (results: BatchTask[]) => void
  onError?: (error: string) => void
}

export function useBatchProgress(batchId: string | null, options: UseBatchProgressOptions = {}) {
  const [tasks, setTasks] = useState<BatchTask[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!batchId) return

    const eventSource = new EventSource(
      `${API_URL}/extract-batch-worker/${batchId}/stream`
    )

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data)
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.task_id === data.task_id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], ...data }
          return updated
        }
        return [...prev, data]
      })
    })

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data)
      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === data.task_id
            ? { ...t, status: 'complete', document_id: data.document_id }
            : t
        )
      )
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    })

    eventSource.addEventListener('error', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        setTasks((prev) =>
          prev.map((t) =>
            t.task_id === data.task_id ? { ...t, status: 'error', error: data.error } : t
          )
        )
      } catch {
        // Connection error
        setError('Connexion perdue')
      }
    })

    eventSource.addEventListener('batch_complete', () => {
      setIsComplete(true)
      options.onComplete?.(tasks)
      eventSource.close()
    })

    eventSource.onerror = () => {
      setError('Connexion perdue, passage en mode polling...')
      eventSource.close()
      options.onError?.('Connection lost')
    }

    return () => eventSource.close()
  }, [batchId, queryClient, options])

  const progress =
    tasks.length > 0
      ? Math.round((tasks.filter((t) => t.status === 'complete').length / tasks.length) * 100)
      : 0

  const successCount = tasks.filter((t) => t.status === 'complete').length
  const failedCount = tasks.filter((t) => t.status === 'error').length

  return {
    tasks,
    isComplete,
    progress,
    error,
    successCount,
    failedCount,
  }
}
