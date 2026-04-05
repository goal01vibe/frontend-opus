import api from './api'
import type { Extraction, ExtractResponse } from '@/types'
import { API_URL } from '@/lib/constants'

interface ExtractionsParams {
  limit?: number
  offset?: number
  document_id?: number
  template?: string
  designation_search?: string
  code_article?: string
  categorie_fournisseur?: string
  search?: string
  sort_by?: string
  sort_order?: string
  // Filtres attributs produit
  is_active?: boolean
  is_cold_chain?: boolean
  categorie_produit?: string
  is_stupefiant?: boolean
  taux_remboursement?: string
}

interface ExtractionsApiResponse {
  total_count: number
  offset: number
  limit: number
  extractions: Extraction[]
}

export const extractionsService = {
  getAll: async (params: ExtractionsParams = {}): Promise<ExtractionsApiResponse> => {
    const { data } = await api.get<ExtractionsApiResponse>('/extractions', { params })
    return data
  },

  getByDocumentId: async (documentId: number): Promise<Extraction[]> => {
    const { data } = await api.get<ExtractionsApiResponse>('/extractions', {
      params: { document_id: documentId, limit: 500 }
    })
    return data.extractions || []
  },

  search: async (query: string): Promise<Extraction[]> => {
    const { data } = await api.get('/api/v1/extractions/search', {
      params: { q: query, limit: 20 }
    })
    return data.results || []
  },

  extractFile: async (
    file: File,
    options: { template?: string; template_json?: string } = {}
  ): Promise<ExtractResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    if (options.template) {
      formData.append('template', options.template)
    }
    if (options.template_json) {
      formData.append('template_json', options.template_json)
    }

    const { data } = await api.post('/extract-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  extractBatch: async (
    files: File[],
    options: { template?: string; confidence_threshold?: number } = {},
    signal?: AbortSignal,
  ): Promise<{ batch_id: string; task_ids: string[]; stream_endpoint: string }> => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    if (options.template) {
      formData.append('template', options.template)
    }
    if (options.confidence_threshold !== undefined) {
      formData.append('confidence_threshold', String(options.confidence_threshold))
    }
    const { data } = await api.post('/extract-batch-worker', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    })
    return data
  },

  createBatchStream: (batchId: string): EventSource => {
    return new EventSource(`${API_URL}/extract-batch-worker/${batchId}/stream`)
  },
}
