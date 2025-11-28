import api from './api'
import type { Extraction, ExtractResponse, PaginatedResponse } from '@/types'
import { API_URL } from '@/lib/constants'

interface ExtractionsParams {
  limit?: number
  offset?: number
  document_id?: number
  template?: string
  designation_search?: string
  code_article?: string
}

interface ExtractionsApiResponse {
  count: number
  extractions: Extraction[]
}

export const extractionsService = {
  getAll: async (params: ExtractionsParams = {}): Promise<PaginatedResponse<Extraction>> => {
    const { data } = await api.get<ExtractionsApiResponse>('/extractions', { params })
    return {
      items: data.extractions || [],
      total: data.count || 0,
      page: 1,
      limit: params.limit || 100,
      pages: Math.ceil((data.count || 0) / (params.limit || 100))
    }
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
    options: { template?: string } = {}
  ): Promise<{ batch_id: string; task_ids: string[]; stream_endpoint: string }> => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    if (options.template) {
      formData.append('template', options.template)
    }

    const { data } = await api.post('/extract-batch-worker', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  createBatchStream: (batchId: string): EventSource => {
    return new EventSource(`${API_URL}/extract-batch-worker/${batchId}/stream`)
  },
}
