import api from './api'

// --- Types ---

export interface CodeInfo {
  canonical_cip13: string | null
  denomination: string | null
  codes: { code: string; type: string }[]
  enrichment: {
    categorie: string
    source: string
    taux_remboursement: string | null
    is_stupefiant: boolean
  } | null
  manual_override: {
    categorie: string
    label: string | null
  } | null
}

export interface NonEnrichedCode {
  code_article: string
  denomination_sample: string
  extraction_count: number
  first_seen: string | null
  last_seen: string | null
}

export interface NonEnrichedCodesResponse {
  total_unique_codes: number
  total_extractions: number
  codes: NonEnrichedCode[]
}

export interface ManualEnrichment {
  code: string
  categorie: string
  label: string | null
  created_at: string
  updated_at: string
}

export interface ManualEnrichmentCreateResponse {
  status: string
  code: string
  categorie: string
  extractions_updated: number
  codes_propagated: string[]
}

// --- Service ---

export const enrichmentService = {
  getCodeInfo: async (code: string): Promise<CodeInfo> => {
    const { data } = await api.get<CodeInfo>(`/api/product-reference/codes/${code}`)
    return data
  },

  getNonEnrichedCodes: async (): Promise<NonEnrichedCodesResponse> => {
    const { data } = await api.get<NonEnrichedCodesResponse>('/api/v1/extractions/non-enriched-codes')
    return data
  },

  createManualEnrichment: async (
    code: string,
    categorie: string,
    label?: string
  ): Promise<ManualEnrichmentCreateResponse> => {
    const { data } = await api.post<ManualEnrichmentCreateResponse>(
      '/api/product-reference/manual-enrichment',
      { code, categorie, ...(label !== undefined && { label }) }
    )
    return data
  },

  updateManualEnrichment: async (
    code: string,
    update: { categorie?: string; label?: string }
  ): Promise<any> => {
    const { data } = await api.patch(`/api/product-reference/manual-enrichment/${code}`, update)
    return data
  },

  deleteManualEnrichment: async (code: string): Promise<any> => {
    const { data } = await api.delete(`/api/product-reference/manual-enrichment/${code}`)
    return data
  },

  listManualEnrichments: async (): Promise<{ total: number; items: ManualEnrichment[] }> => {
    const { data } = await api.get<{ total: number; items: ManualEnrichment[] }>(
      '/api/product-reference/manual-enrichment'
    )
    return data
  },
}
