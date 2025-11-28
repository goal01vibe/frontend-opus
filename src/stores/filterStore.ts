import { create } from 'zustand'
import type { FournisseurType, DocumentStatus, FilterState } from '@/types'

interface FilterStoreState {
  activeType: FournisseurType
  selectedFournisseur: string | null
  filters: FilterState
  searchTerm: string
  sqlMode: boolean
  sqlQuery: string
  setActiveType: (type: FournisseurType) => void
  setSelectedFournisseur: (fournisseur: string | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  setSearchTerm: (term: string) => void
  setSqlMode: (mode: boolean) => void
  setSqlQuery: (query: string) => void
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

  setActiveType: (type) => set({ activeType: type, selectedFournisseur: null }),
  setSelectedFournisseur: (fournisseur) => set({ selectedFournisseur: fournisseur }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSqlMode: (mode) => set({ sqlMode: mode }),
  setSqlQuery: (query) => set({ sqlQuery: query }),
  resetFilters: () => set({ filters: defaultFilters, searchTerm: '', sqlQuery: '' }),
}))
