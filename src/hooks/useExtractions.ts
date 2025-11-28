import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { extractionsService } from '@/services/extractions'
import type { Extraction } from '@/types'

interface UseExtractionsParams {
  limit?: number
  offset?: number
  document_id?: number
  designation_search?: string
}

export function useExtractions(params: UseExtractionsParams = {}) {
  return useQuery({
    queryKey: ['extractions', params],
    queryFn: () => extractionsService.getAll(params),
  })
}

export function useDocumentExtractions(documentId: number) {
  return useQuery({
    queryKey: ['extractions', { document_id: documentId }],
    queryFn: () => extractionsService.getByDocumentId(documentId),
    enabled: documentId > 0,
  })
}

export function useExtractFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      file,
      options,
    }: {
      file: File
      options?: { template_name?: string; min_confidence?: number }
    }) => extractionsService.extractFile(file, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['extractions'] })
    },
  })
}

export function useExtractBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      files,
      options,
    }: {
      files: File[]
      options?: { template_name?: string; min_confidence?: number }
    }) => extractionsService.extractBatch(files, options),
    onSuccess: () => {
      // Will invalidate after SSE completion
    },
  })
}

export function useSearchExtractions(query: string) {
  return useQuery({
    queryKey: ['search', 'extractions', query],
    queryFn: () => extractionsService.search(query),
    enabled: query.length >= 2,
  })
}
