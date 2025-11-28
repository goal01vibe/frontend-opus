import api from './api'
import type { Document, PaginatedResponse, FilterState } from '@/types'

interface DocumentsParams {
  limit?: number
  offset?: number
  fournisseur?: string
  status?: string
  categorie_fournisseur?: string
  search?: string
}

export const documentsService = {
  getAll: async (params: DocumentsParams = {}): Promise<PaginatedResponse<Document>> => {
    const { data } = await api.get('/documents', { params })
    return data
  },

  getById: async (id: number): Promise<Document> => {
    const { data } = await api.get(`/documents/${id}`)
    return data
  },

  getPdf: async (id: number): Promise<Blob> => {
    const { data } = await api.get(`/documents/${id}/pdf`, {
      responseType: 'blob'
    })
    return data
  },

  validate: async (id: number): Promise<Document> => {
    const { data } = await api.post(`/documents/${id}/validate`)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/documents/${id}`)
  },

  updateExtractions: async (
    id: number,
    corrections: { id: number; [key: string]: unknown }[]
  ): Promise<Document> => {
    const { data } = await api.patch(`/documents/${id}/extractions`, { corrections })
    return data
  },

  search: async (query: string): Promise<Document[]> => {
    const { data } = await api.get('/documents', {
      params: { search: query, limit: 10 }
    })
    return data.items || data
  },
}

export const buildDocumentsQueryParams = (filters: FilterState) => {
  const params: Record<string, string | number> = {}

  if (filters.fournisseur?.length) {
    params.fournisseur = filters.fournisseur.join(',')
  }
  if (filters.status?.length) {
    params.status = filters.status.join(',')
  }
  if (filters.dateRange?.from) {
    params.date_from = filters.dateRange.from.toISOString().split('T')[0]
  }
  if (filters.dateRange?.to) {
    params.date_to = filters.dateRange.to.toISOString().split('T')[0]
  }
  if (filters.confidence?.min !== undefined) {
    params.confidence_min = filters.confidence.min
  }
  if (filters.confidence?.max !== undefined) {
    params.confidence_max = filters.confidence.max
  }

  return params
}
