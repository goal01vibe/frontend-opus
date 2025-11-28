import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsService } from '@/services/documents'
import type { Document, DocumentStatus } from '@/types'

interface UseDocumentsParams {
  limit?: number
  offset?: number
  fournisseur?: string
  status?: DocumentStatus
  categorie_fournisseur?: 'LABO' | 'GROSSISTE'
  search?: string
}

export function useDocuments(params: UseDocumentsParams = {}) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => documentsService.getAll(params),
  })
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsService.getById(id),
    enabled: id > 0,
  })
}

export function useValidateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => documentsService.validate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => documentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useSearchDocuments(query: string) {
  return useQuery({
    queryKey: ['search', 'documents', query],
    queryFn: () => documentsService.search(query),
    enabled: query.length >= 2,
  })
}
