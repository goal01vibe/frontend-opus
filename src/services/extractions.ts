import api from './api'
import type { Extraction, ExtractResponse, PaginatedResponse } from '@/types'
import { API_URL } from '@/lib/constants'

interface ExtractionsParams {
  limit?: number
  offset?: number
  document_id?: number
  designation_search?: string
  code_article?: string
}

export const extractionsService = {
  getAll: async (params: ExtractionsParams = {}): Promise<PaginatedResponse<Extraction>> => {
    const { data } = await api.get('/extractions', { params })
    return data
  },

  getByDocumentId: async (documentId: number): Promise<Extraction[]> => {
    const { data } = await api.get('/extractions', {
      params: { document_id: documentId }
    })
    return data.items || data
  },

  search: async (query: string): Promise<Extraction[]> => {
    const { data } = await api.get('/extractions', {
      params: { designation_search: query, limit: 10 }
    })
    return data.items || data
  },

  extractFile: async (
    file: File,
    options: { template_name?: string; min_confidence?: number } = {}
  ): Promise<ExtractResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    if (options.template_name) {
      formData.append('template_name', options.template_name)
    }
    if (options.min_confidence !== undefined) {
      formData.append('min_confidence', options.min_confidence.toString())
    }

    const { data } = await api.post('/extract-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  extractBatch: async (
    files: File[],
    options: { template_name?: string; min_confidence?: number } = {}
  ): Promise<{ batch_id: string; task_ids: string[]; stream_endpoint: string }> => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    if (options.template_name) {
      formData.append('template_name', options.template_name)
    }
    if (options.min_confidence !== undefined) {
      formData.append('min_confidence', options.min_confidence.toString())
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
