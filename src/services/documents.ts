import api from './api'
import type { Document, ServerDocumentsResponse, ServerExportResponse } from '@/types'

interface DocumentsParams {
  offset?: number
  limit?: number
  categorie_fournisseur?: string
  fournisseur?: string
  status?: string
  search?: string
  template?: string
  sort_by?: string
  sort_order?: string
  date_from?: string
  date_to?: string
}

export const documentsService = {
  getAll: async (params: DocumentsParams = {}): Promise<ServerDocumentsResponse> => {
    const { data } = await api.get<ServerDocumentsResponse>('/documents', { params })
    return data
  },

  exportAll: async (params: Omit<DocumentsParams, 'offset' | 'limit'>): Promise<ServerExportResponse> => {
    const { data } = await api.get<ServerExportResponse>('/documents/export', { params })
    return data
  },

  getById: async (id: number): Promise<Document> => {
    const { data } = await api.get<Document>(`/documents/${id}`)
    return data
  },

  getPdfUrl: (id: number): string => {
    return `${api.defaults.baseURL}/documents/${id}/pdf?doc=${id}`
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
    const { data } = await api.get<ServerDocumentsResponse>('/documents', {
      params: { search: query, limit: 50 }
    })
    return data.documents || []
  },
}
