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

    // Événement de connexion établie
    eventSource.addEventListener('connected', () => {
      console.log('SSE batch progress connecté')
    })

    // Événement de début de traitement d'un fichier
    eventSource.addEventListener('file_start', (e) => {
      const data = JSON.parse(e.data)
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.filename === data.filename)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], status: 'processing' }
          return updated
        }
        return [...prev, { task_id: data.filename, filename: data.filename, status: 'processing' }]
      })
    })

    // Événement de succès d'un fichier
    eventSource.addEventListener('file_complete', (e) => {
      const data = JSON.parse(e.data)
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.filename === data.filename)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], status: 'complete', document_id: data.document_id }
          return updated
        }
        return [...prev, { task_id: data.filename, filename: data.filename, status: 'complete', document_id: data.document_id }]
      })
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    })

    // Événement d'avertissement (NEEDS_REVIEW)
    eventSource.addEventListener('file_warning', (e) => {
      const data = JSON.parse(e.data)
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.filename === data.filename)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], status: 'warning', document_id: data.document_id }
          return updated
        }
        return [...prev, { task_id: data.filename, filename: data.filename, status: 'warning', document_id: data.document_id }]
      })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    })

    // Événement d'erreur d'un fichier
    eventSource.addEventListener('file_error', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        setTasks((prev) => {
          const idx = prev.findIndex((t) => t.filename === data.filename)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = { ...updated[idx], status: 'error', error: data.error }
            return updated
          }
          return [...prev, { task_id: data.filename, filename: data.filename, status: 'error', error: data.error }]
        })
      } catch {
        // Connection error
        setError('Connexion perdue')
      }
    })

    // Événement de fin de batch
    eventSource.addEventListener('batch_complete', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        console.log('Batch terminé:', data)
      } catch {
        // Ignore parse errors
      }
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
