/**
 * Service pour les opérations sur les batchs d'extraction
 */
import api from './api'
import { API_URL } from '@/lib/constants'

// Types for batch endpoints
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

export interface BatchHistoryResponse {
  batches: BatchHistoryItem[]
  total: number
  limit: number
  offset: number
  timestamp: string
}

export interface BatchDocument {
  document_id: number
  filename: string
  status: string
  confidence_score: number
  template_used: string | null
  extraction_count: number
  date_extraction: string
  review_reasons: string[] | null
}

export interface BatchDetailResponse {
  batch: BatchHistoryItem
  documents: BatchDocument[]
  document_count: number
  timestamp: string
}

export const batchService = {
  // Historique des batchs
  getBatches: async (limit: number = 20, offset: number = 0): Promise<BatchHistoryResponse> => {
    const { data } = await api.get<BatchHistoryResponse>('/admin/batches', {
      params: { limit, offset }
    })
    return data
  },

  // Détail d'un batch spécifique
  getBatchDetail: async (batchId: string): Promise<BatchDetailResponse> => {
    const { data } = await api.get<BatchDetailResponse>(`/admin/batches/${batchId}`)
    return data
  },

  // SSE Admin Stream
  createAdminStream: (): EventSource => {
    return new EventSource(`${API_URL}/admin/stream`)
  },

  // SSE pour un batch spécifique
  createBatchStream: (batchId: string): EventSource => {
    return new EventSource(`${API_URL}/extract-batch-worker/${batchId}/stream`)
  },
}
