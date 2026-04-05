import { create } from 'zustand'
import type { FournisseurType, FilterState } from '@/types'

interface FilterStoreState {
  activeType: FournisseurType
  selectedFournisseur: string | null
  filters: FilterState
  searchTerm: string
  sqlMode: boolean
  sqlQuery: string
  // Pagination
  page: number
  perPage: number
  // Sorting
  sortBy: string
  sortOrder: 'asc' | 'desc'
  // Replaced codes filter
  showReplacedOnly: boolean
  // Filtres attributs produit
  productFilters: {
    is_active?: boolean | null
    is_cold_chain?: boolean | null
    categorie_produit?: string | null
    is_stupefiant?: boolean | null
    taux_remboursement?: string | null
    lifecycle_filter?: string | null
  }
  // Actions
  setActiveType: (type: FournisseurType) => void
  setSelectedFournisseur: (fournisseur: string | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  setSearchTerm: (term: string) => void
  setSqlMode: (mode: boolean) => void
  setSqlQuery: (query: string) => void
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  setShowReplacedOnly: (show: boolean) => void
  setProductFilters: (filters: Partial<FilterStoreState['productFilters']>) => void
  resetFilters: () => void
}

const defaultFilters: FilterState = {
  fournisseur: undefined,
  dateRange: undefined,
  status: undefined,
  confidence: undefined,
  designation: undefined,
  codeArticle: undefined,
  tauxTva: undefined,
  montantMin: undefined,
  montantMax: undefined,
}

export const useFilterStore = create<FilterStoreState>((set) => ({
  activeType: 'GROSSISTE',
  selectedFournisseur: null,
  filters: defaultFilters,
  searchTerm: '',
  sqlMode: false,
  sqlQuery: '',
  page: 1,
  perPage: 50,
  sortBy: 'date_extraction',
  sortOrder: 'desc',
  showReplacedOnly: false,
  productFilters: {},

  setActiveType: (type) => set({ activeType: type, selectedFournisseur: null, page: 1 }),
  setSelectedFournisseur: (fournisseur) => set({ selectedFournisseur: fournisseur, page: 1 }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
    page: 1,
  })),
  setSearchTerm: (term) => set({ searchTerm: term, page: 1 }),
  setSqlMode: (mode) => set({ sqlMode: mode }),
  setSqlQuery: (query) => set({ sqlQuery: query }),
  setPage: (page) => set({ page }),
  setPerPage: (perPage) => set({ perPage, page: 1 }),
  setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder, page: 1 }),
  setShowReplacedOnly: (show) => set({ showReplacedOnly: show }),
  setProductFilters: (filters) => set((state) => ({
    productFilters: { ...state.productFilters, ...filters },
    page: 1,
  })),
  resetFilters: () => set({
    filters: defaultFilters,
    searchTerm: '',
    sqlQuery: '',
    selectedFournisseur: null,
    showReplacedOnly: false,
    productFilters: {},
    page: 1,
  }),
}))
