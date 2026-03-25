// src/hooks/useChunkedUpload.ts
import { useState, useRef, useCallback } from 'react'
import { extractionsService } from '@/services/extractions'
import { useExtractionStore } from '@/stores/extractionStore'

const DEFAULT_CHUNK_SIZE = 50
const CHUNK_TIMEOUT_MS = 60_000

interface UseChunkedUploadOptions {
  chunkSize?: number
  onChunkSent?: (batchId: string, chunkIndex: number) => void
  onAllChunksSent?: () => void
  onChunkError?: (chunkIndex: number, error: Error) => void
  onBatchIdCreated?: (batchId: string) => void
}

type UploadPhase = 'idle' | 'uploading' | 'done' | 'cancelled'

/** Split an array into chunks of `size` */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export function useChunkedUpload(options: UseChunkedUploadOptions = {}) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    onChunkSent,
    onAllChunksSent,
    onChunkError,
    onBatchIdCreated,
  } = options

  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle')
  const [allChunksSent, setAllChunksSent] = useState(false)
  const [chunksUploaded, setChunksUploaded] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)

  const { addBatch } = useExtractionStore()

  const startUpload = useCallback(async (
    files: File[],
    markChunkFilesFailed: (chunkFiles: File[], message: string) => void,
    confidenceThreshold?: number,
  ) => {
    const chunks = chunkArray(files, chunkSize)
    setTotalChunks(chunks.length)
    setChunksUploaded(0)
    setAllChunksSent(false)
    setUploadPhase('uploading')
    cancelledRef.current = false

    abortControllerRef.current = new AbortController()

    for (let i = 0; i < chunks.length; i++) {
      // Check cancellation before each chunk
      if (cancelledRef.current) {
        // Mark remaining files as failed
        for (let j = i; j < chunks.length; j++) {
          markChunkFilesFailed(chunks[j], 'Upload annule')
        }
        break
      }

      // Create a per-chunk timeout signal combined with the cancel signal
      const timeoutController = new AbortController()
      const timeoutId = setTimeout(() => timeoutController.abort(), CHUNK_TIMEOUT_MS)

      // If main abort fires, also abort this chunk
      const onMainAbort = () => timeoutController.abort()
      abortControllerRef.current.signal.addEventListener('abort', onMainAbort)

      try {
        const result = await extractionsService.extractBatch(
          chunks[i],
          { template: undefined, confidence_threshold: confidenceThreshold },
          timeoutController.signal,
        )

        // Register batch in store for FloatingExtractionModule
        addBatch({
          batch_id: result.batch_id,
          total_files: chunks[i].length,
          completed: 0,
          failed: 0,
          workers_active: 0,
          started_at: new Date().toISOString(),
        })

        // Notify parent of new batch_id
        onBatchIdCreated?.(result.batch_id)
        onChunkSent?.(result.batch_id, i)
        setChunksUploaded(i + 1)

      } catch (error) {
        // Mark this chunk's files as failed, continue with next chunk
        const message = error instanceof Error ? error.message : 'Erreur reseau'
        markChunkFilesFailed(chunks[i], message)
        onChunkError?.(i, error instanceof Error ? error : new Error(message))
        setChunksUploaded(i + 1)
      } finally {
        clearTimeout(timeoutId)
        abortControllerRef.current?.signal.removeEventListener('abort', onMainAbort)
      }
    }

    // All chunks have been sent (or cancelled)
    if (!cancelledRef.current) {
      setAllChunksSent(true)
      setUploadPhase('done')
      onAllChunksSent?.()
    }
  }, [chunkSize, addBatch, onChunkSent, onAllChunksSent, onChunkError, onBatchIdCreated])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    abortControllerRef.current?.abort()
    setUploadPhase('cancelled')
  }, [])

  const reset = useCallback(() => {
    setUploadPhase('idle')
    setAllChunksSent(false)
    setChunksUploaded(0)
    setTotalChunks(0)
    cancelledRef.current = false
  }, [])

  return {
    startUpload,
    cancel,
    reset,
    uploadPhase,
    allChunksSent,
    chunksUploaded,
    totalChunks,
  }
}
