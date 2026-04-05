import React, { useState, useEffect, useMemo } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Search, SlidersHorizontal, X, Calendar, RotateCcw } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { GROSSISTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface DocumentFiltersProps {
  fournisseurs?: string[]
  actions?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Helper : petit <select> stylé avec feedback visuel quand actif
// ---------------------------------------------------------------------------
function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm',
        'hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition',
        value && 'border-blue-300 bg-blue-50/60',
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}

// ===========================================================================
// DocumentFilters — barre compacte + popover structuré
// ===========================================================================
export const DocumentFilters = React.memo(function DocumentFilters({ fournisseurs = [], actions }: DocumentFiltersProps) {
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
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Debounce search — 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) setSearchTerm(localSearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [localSearch, searchTerm, setSearchTerm])

  // Sync quand store reset
  useEffect(() => {
    if (searchTerm === '' && localSearch !== '') setLocalSearch('')
  }, [searchTerm, localSearch])

  const availableFournisseurs = activeType === 'GROSSISTE' ? GROSSISTES : fournisseurs

  // ---- Compteur de filtres actifs (hors recherche) ----
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedFournisseur) count++
    if (filters.status?.length) count++
    if (filters.dateRange) count++
    if (productFilters.categorie_produit) count++
    if (productFilters.taux_remboursement) count++
    if (productFilters.is_active !== undefined && productFilters.is_active !== null) count++
    if (productFilters.lifecycle_filter) count++
    if (productFilters.is_cold_chain !== undefined && productFilters.is_cold_chain !== null) count++
    if (productFilters.is_stupefiant !== undefined && productFilters.is_stupefiant !== null) count++
    return count
  }, [selectedFournisseur, filters, productFilters])

  const hasActiveFilters = activeFilterCount > 0 || searchTerm

  // ---- Lifecycle select value encoding ----
  const lifecycleValue = productFilters.lifecycle_filter
    ? `lifecycle:${productFilters.lifecycle_filter}`
    : productFilters.is_active === true
      ? 'active'
      : ''

  const handleLifecycleChange = (v: string) => {
    if (v === 'active') {
      setProductFilters({ is_active: true, lifecycle_filter: null })
    } else if (v.startsWith('lifecycle:')) {
      setProductFilters({ is_active: null, lifecycle_filter: v.replace('lifecycle:', '') })
    } else {
      setProductFilters({ is_active: null, lifecycle_filter: null })
    }
  }

  const handleResetAll = () => {
    resetFilters()
    setLocalSearch('')
  }

  const handleResetAndClose = () => {
    handleResetAll()
    setPopoverOpen(false)
  }

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-3 shrink-0">
      {/* ---- Recherche (toujours visible) ---- */}
      <div className="relative w-full max-w-xs group shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Rechercher N° Facture, Fournisseur..."
          className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      {/* ---- Bouton Filtres + Popover ---- */}
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.Trigger asChild>
          <button
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition shrink-0',
              activeFilterCount > 0
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full font-semibold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            collisionPadding={16}
            className="z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-lg p-4"
          >
            {/* === Section Document === */}
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Document</h4>
            <div className="grid grid-cols-2 gap-3">
              <FilterSelect
                value={selectedFournisseur || ''}
                onChange={(v) => setSelectedFournisseur(v || null)}
                placeholder="Fournisseur"
              >
                {availableFournisseurs.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </FilterSelect>

              <FilterSelect
                value={filters.status?.[0] || ''}
                onChange={(v) => setFilters({ status: v ? [v as any] : undefined })}
                placeholder="Statut doc"
              >
                <option value="VALIDATED">Valid&eacute;</option>
                <option value="NEEDS_REVIEW">&Agrave; valider</option>
                <option value="FAILED">Erreur</option>
                <option value="AUTO_PROCESSED">Auto</option>
              </FilterSelect>

              {/* Date range — pleine largeur */}
              <div className="col-span-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={filters.dateRange?.from ? filters.dateRange.from.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const from = e.target.value ? new Date(e.target.value) : undefined
                    setFilters({
                      dateRange: from || filters.dateRange?.to
                        ? { from: from || filters.dateRange?.from, to: filters.dateRange?.to } as any
                        : undefined,
                    })
                  }}
                  className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  title="Date d&eacute;but"
                />
                <span className="text-gray-400 text-xs">&rarr;</span>
                <input
                  type="date"
                  value={filters.dateRange?.to ? filters.dateRange.to.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const to = e.target.value ? new Date(e.target.value) : undefined
                    setFilters({
                      dateRange: to || filters.dateRange?.from
                        ? { from: filters.dateRange?.from, to: to || filters.dateRange?.to } as any
                        : undefined,
                    })
                  }}
                  className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  title="Date fin"
                />
              </div>
            </div>

            {/* Séparateur */}
            <div className="border-t border-gray-100 my-3" />

            {/* === Section Produit === */}
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Produit</h4>
            <div className="grid grid-cols-2 gap-3">
              <FilterSelect
                value={productFilters.categorie_produit || ''}
                onChange={(v) => setProductFilters({ categorie_produit: v || null })}
                placeholder="Cat&eacute;gorie"
              >
                <option value="MEDICAMENT">M&eacute;dicament</option>
                <option value="LPP">LPP</option>
                <option value="PARAPHARMACIE">Parapharmacie</option>
                <option value="AUTRES">Autres</option>
              </FilterSelect>

              <FilterSelect
                value={productFilters.taux_remboursement || ''}
                onChange={(v) => setProductFilters({ taux_remboursement: v || null })}
                placeholder="Taux remb."
              >
                <option value="100%">100%</option>
                <option value="65%">65%</option>
                <option value="30%">30%</option>
                <option value="15%">15%</option>
                <option value="NR">Non remb.</option>
              </FilterSelect>

              <FilterSelect
                value={lifecycleValue}
                onChange={handleLifecycleChange}
                placeholder="Statut produit"
              >
                <option value="active">Actif</option>
                <option value="lifecycle:suppressed">Supprim&eacute;</option>
                <option value="lifecycle:replaced">Remplac&eacute;</option>
                <option value="lifecycle:retired">Retir&eacute; (tous)</option>
              </FilterSelect>

              <FilterSelect
                value={productFilters.is_cold_chain === null || productFilters.is_cold_chain === undefined ? '' : productFilters.is_cold_chain ? 'yes' : 'no'}
                onChange={(v) => setProductFilters({ is_cold_chain: v === 'yes' ? true : v === 'no' ? false : null })}
                placeholder="Cha&icirc;ne du froid"
              >
                <option value="yes">Oui</option>
                <option value="no">Non</option>
              </FilterSelect>

              <FilterSelect
                value={productFilters.is_stupefiant === null || productFilters.is_stupefiant === undefined ? '' : productFilters.is_stupefiant ? 'yes' : 'no'}
                onChange={(v) => setProductFilters({ is_stupefiant: v === 'yes' ? true : v === 'no' ? false : null })}
                placeholder="Stup&eacute;fiant"
              >
                <option value="yes">Oui</option>
                <option value="no">Non</option>
              </FilterSelect>
            </div>

            {/* Footer reset */}
            <div className="flex justify-end pt-3 mt-3 border-t border-gray-100">
              <button
                onClick={handleResetAndClose}
                className="text-sm text-red-600 hover:text-red-700 font-medium transition"
              >
                R&eacute;initialiser les filtres
              </button>
            </div>

            <Popover.Arrow className="fill-white" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* ---- Reset inline ---- */}
      {hasActiveFilters && (
        <button
          onClick={handleResetAll}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">R&eacute;initialiser</span>
        </button>
      )}

      {/* ---- Chips filtres actifs (inline, scrollable) ---- */}
      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1 scrollbar-none">
        {searchTerm && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs whitespace-nowrap shrink-0">
            &quot;{searchTerm}&quot;
            <button onClick={() => { setLocalSearch(''); setSearchTerm('') }}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {selectedFournisseur && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs whitespace-nowrap shrink-0">
            {selectedFournisseur}
            <button onClick={() => setSelectedFournisseur(null)}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {filters.status?.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs whitespace-nowrap shrink-0">
            {s}
            <button onClick={() => setFilters({ status: undefined })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {filters.dateRange && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs whitespace-nowrap shrink-0">
            {filters.dateRange.from ? filters.dateRange.from.toISOString().split('T')[0] : '...'} &rarr; {filters.dateRange.to ? filters.dateRange.to.toISOString().split('T')[0] : '...'}
            <button onClick={() => setFilters({ dateRange: undefined })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {productFilters.categorie_produit && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs whitespace-nowrap shrink-0">
            {productFilters.categorie_produit}
            <button onClick={() => setProductFilters({ categorie_produit: null })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {productFilters.taux_remboursement && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs whitespace-nowrap shrink-0">
            Remb: {productFilters.taux_remboursement}
            <button onClick={() => setProductFilters({ taux_remboursement: null })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {productFilters.is_active === true && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs whitespace-nowrap shrink-0">
            Actif
            <button onClick={() => setProductFilters({ is_active: null })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {productFilters.lifecycle_filter && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs whitespace-nowrap shrink-0">
            {productFilters.lifecycle_filter === 'suppressed' ? 'Supprim\u00e9' :
             productFilters.lifecycle_filter === 'replaced' ? 'Remplac\u00e9' :
             productFilters.lifecycle_filter === 'retired' ? 'Retir\u00e9 (tous)' :
             productFilters.lifecycle_filter}
            <button onClick={() => setProductFilters({ lifecycle_filter: null })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {productFilters.is_cold_chain === true && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs whitespace-nowrap shrink-0">
            Cha&icirc;ne du froid
            <button onClick={() => setProductFilters({ is_cold_chain: null })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {productFilters.is_cold_chain === false && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs whitespace-nowrap shrink-0">
            Pas froid
            <button onClick={() => setProductFilters({ is_cold_chain: null })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {productFilters.is_stupefiant === true && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs whitespace-nowrap shrink-0">
            Stup&eacute;fiant
            <button onClick={() => setProductFilters({ is_stupefiant: null })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {productFilters.is_stupefiant === false && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs whitespace-nowrap shrink-0">
            Non stup.
            <button onClick={() => setProductFilters({ is_stupefiant: null })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {/* ---- Actions slot (CSV/XLSX/New) ---- */}
      {actions && (
        <>
          <div className="w-px h-6 bg-gray-200 shrink-0" />
          <div className="flex gap-2 shrink-0">{actions}</div>
        </>
      )}
    </div>
  )
})
