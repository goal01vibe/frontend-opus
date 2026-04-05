import { useState, useEffect } from 'react'
import { Search, Calendar, X } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { GROSSISTES } from '@/lib/constants'

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
    productFilters,
    setProductFilters,
  } = useFilterStore()

  const [localSearch, setLocalSearch] = useState(searchTerm)

  // Debounce search term — 400ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [localSearch, searchTerm, setSearchTerm])

  // Sync local state when store resets
  useEffect(() => {
    if (searchTerm === '' && localSearch !== '') {
      setLocalSearch('')
    }
  }, [searchTerm])

  const availableFournisseurs = activeType === 'GROSSISTE' ? GROSSISTES : fournisseurs

  const hasActiveFilters = searchTerm || selectedFournisseur || filters.status?.length || filters.dateRange ||
    productFilters.categorie_produit || productFilters.taux_remboursement ||
    (productFilters.is_active !== undefined && productFilters.is_active !== null) ||
    (productFilters.is_cold_chain !== undefined && productFilters.is_cold_chain !== null) ||
    (productFilters.is_stupefiant !== undefined && productFilters.is_stupefiant !== null)

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
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
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

          {/* Filtres produit */}
          <select
            value={productFilters.categorie_produit || ''}
            onChange={(e) => setProductFilters({ categorie_produit: e.target.value || null })}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
          >
            <option value="">Catégorie produit</option>
            <option value="MEDICAMENT">Médicament</option>
            <option value="LPP">LPP</option>
            <option value="PARAPHARMACIE">Parapharmacie</option>
            <option value="AUTRES">Autres</option>
          </select>

          <select
            value={productFilters.taux_remboursement || ''}
            onChange={(e) => setProductFilters({ taux_remboursement: e.target.value || null })}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
          >
            <option value="">Taux remb.</option>
            <option value="100%">100%</option>
            <option value="65%">65%</option>
            <option value="30%">30%</option>
            <option value="15%">15%</option>
            <option value="NR">Non remb.</option>
          </select>

          <select
            value={productFilters.is_active === null || productFilters.is_active === undefined ? '' : productFilters.is_active ? 'active' : 'inactive'}
            onChange={(e) => {
              const v = e.target.value
              setProductFilters({ is_active: v === 'active' ? true : v === 'inactive' ? false : null })
            }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
          >
            <option value="">Statut produit</option>
            <option value="active">Actif</option>
            <option value="inactive">Retiré / Remplacé</option>
          </select>

          <select
            value={productFilters.is_cold_chain === null || productFilters.is_cold_chain === undefined ? '' : productFilters.is_cold_chain ? 'yes' : 'no'}
            onChange={(e) => {
              const v = e.target.value
              setProductFilters({ is_cold_chain: v === 'yes' ? true : v === 'no' ? false : null })
            }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
          >
            <option value="">Chaîne du froid</option>
            <option value="yes">Oui 🌡️</option>
            <option value="no">Non</option>
          </select>

          <select
            value={productFilters.is_stupefiant === null || productFilters.is_stupefiant === undefined ? '' : productFilters.is_stupefiant ? 'yes' : 'no'}
            onChange={(e) => {
              const v = e.target.value
              setProductFilters({ is_stupefiant: v === 'yes' ? true : v === 'no' ? false : null })
            }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
          >
            <option value="">Stupéfiant</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filters.dateRange?.from ? filters.dateRange.from.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const from = e.target.value ? new Date(e.target.value) : undefined
                setFilters({
                  dateRange: from || filters.dateRange?.to
                    ? { from: from || filters.dateRange?.from, to: filters.dateRange?.to } as any
                    : undefined
                })
              }}
              className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
              title="Date début"
            />
            <span className="text-gray-400 text-xs">→</span>
            <input
              type="date"
              value={filters.dateRange?.to ? filters.dateRange.to.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const to = e.target.value ? new Date(e.target.value) : undefined
                setFilters({
                  dateRange: to || filters.dateRange?.from
                    ? { from: filters.dateRange?.from, to: to || filters.dateRange?.to } as any
                    : undefined
                })
              }}
              className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
              title="Date fin"
            />
          </div>

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
              <button onClick={() => { setLocalSearch(''); setSearchTerm('') }}>
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
          {filters.dateRange && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
              {filters.dateRange.from ? filters.dateRange.from.toISOString().split('T')[0] : '...'} → {filters.dateRange.to ? filters.dateRange.to.toISOString().split('T')[0] : '...'}
              <button onClick={() => setFilters({ dateRange: undefined })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {productFilters.categorie_produit && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
              {productFilters.categorie_produit}
              <button onClick={() => setProductFilters({ categorie_produit: null })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {productFilters.taux_remboursement && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">
              Remb: {productFilters.taux_remboursement}
              <button onClick={() => setProductFilters({ taux_remboursement: null })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {productFilters.is_active === false && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
              Retirés / Remplacés
              <button onClick={() => setProductFilters({ is_active: null })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {productFilters.is_cold_chain === true && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
              🌡️ Chaîne du froid
              <button onClick={() => setProductFilters({ is_cold_chain: null })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {productFilters.is_stupefiant === true && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
              Stupéfiant
              <button onClick={() => setProductFilters({ is_stupefiant: null })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
