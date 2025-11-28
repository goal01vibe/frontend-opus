import api from './api'
import type { Document, PaginatedResponse, FilterState } from '@/types'

interface DocumentsParams {
  limit?: number
  offset?: number
  fournisseur?: string
  status?: string
  categorie_fournisseur?: string
  search?: string
  template?: string
}

interface DocumentsApiResponse {
  count: number
  documents: Document[]
}

export const documentsService = {
  getAll: async (params: DocumentsParams = {}): Promise<PaginatedResponse<Document>> => {
    const { data } = await api.get<DocumentsApiResponse>('/documents', { params })
    // Transform API response to our format
    return {
      items: data.documents || [],
      total: data.count || 0,
      page: 1,
      limit: params.limit || 50,
      pages: Math.ceil((data.count || 0) / (params.limit || 50))
    }
  },

  getById: async (id: number): Promise<Document> => {
    // Get document from list (API doesn't have single document endpoint)
    const { data } = await api.get<DocumentsApiResponse>('/documents', {
      params: { limit: 1000 }
    })
    const doc = data.documents?.find(d => d.id === id)
    if (!doc) throw new Error('Document not found')
    return doc
  },

  getPdfUrl: (id: number): string => {
    // Return direct URL for PDF viewing
    return `${api.defaults.baseURL}/documents/${id}/pdf`
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
    const { data } = await api.get<DocumentsApiResponse>('/documents', {
      params: { search: query, limit: 50 }
    })
    return data.documents || []
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
