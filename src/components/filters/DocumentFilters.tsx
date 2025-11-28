import { Search, Filter, Calendar, X } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { GROSSISTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface DocumentFiltersProps {
  fournisseurs?: string[]
}

export function DocumentFilters({ fournisseurs = [] }: DocumentFiltersProps) {
  const {
    searchTerm,
    setSearchTerm,
    selectedFournisseur,
    setSelectedFournisseur,
    activeType,
    filters,
    setFilters,
    resetFilters,
  } = useFilterStore()

  const availableFournisseurs = activeType === 'GROSSISTE' ? GROSSISTES : fournisseurs

  const hasActiveFilters = searchTerm || selectedFournisseur || filters.status?.length

  return (
    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Rechercher par N° Facture, Fournisseur..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 text-sm text-gray-600">
          {/* Fournisseur Dropdown */}
          <select
            value={selectedFournisseur || ''}
            onChange={(e) => setSelectedFournisseur(e.target.value || null)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
          >
            <option value="">Tous les fournisseurs</option>
            {availableFournisseurs.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status?.[0] || ''}
            onChange={(e) =>
              setFilters({ status: e.target.value ? [e.target.value as any] : undefined })
            }
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
          >
            <option value="">Tous statuts</option>
            <option value="VALIDATED">Validé</option>
            <option value="NEEDS_REVIEW">À valider</option>
            <option value="FAILED">Erreur</option>
            <option value="AUTO_PROCESSED">Auto</option>
          </select>

          {/* Date Button */}
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition shadow-sm">
            <Calendar className="w-4 h-4" />
            Date
          </button>

          {/* Reset */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <X className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
              Recherche: "{searchTerm}"
              <button onClick={() => setSearchTerm('')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedFournisseur && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              {selectedFournisseur}
              <button onClick={() => setSelectedFournisseur(null)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.status?.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"
            >
              {s}
              <button onClick={() => setFilters({ status: undefined })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
