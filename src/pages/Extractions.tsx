import { useMemo } from 'react'
import { TypeTabs } from '@/components/layout/TypeTabs'
import { DocumentFilters } from '@/components/filters/DocumentFilters'
import { ExtractionsTable } from '@/components/extractions/ExtractionsTable'
import { ExtractionDrawer } from '@/components/extractions/ExtractionDrawer'
import { useUIStore } from '@/stores/uiStore'
import { useFilterStore } from '@/stores/filterStore'
import { generateMockDocuments } from '@/services/mockData'
import { formatCurrency } from '@/lib/utils'
import { Download, Plus } from 'lucide-react'

export function Extractions() {
  const { drawerOpen, selectedId } = useUIStore()
  const { activeType, selectedFournisseur, searchTerm, filters } = useFilterStore()

  // In production, use TanStack Query
  const allDocuments = useMemo(() => generateMockDocuments(100), [])

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      // Filter by type
      if (doc.categorie_fournisseur !== activeType) return false

      // Filter by fournisseur
      if (selectedFournisseur && doc.fournisseur !== selectedFournisseur) return false

      // Filter by search
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        if (
          !doc.numero_facture.toLowerCase().includes(term) &&
          !doc.fournisseur.toLowerCase().includes(term) &&
          !doc.nom_fichier.toLowerCase().includes(term)
        ) {
          return false
        }
      }

      // Filter by status
      if (filters.status?.length && !filters.status.includes(doc.status)) {
        return false
      }

      return true
    })
  }, [allDocuments, activeType, selectedFournisseur, searchTerm, filters])

  // Counts for tabs
  const counts = useMemo(
    () => ({
      LABO: allDocuments.filter((d) => d.categorie_fournisseur === 'LABO').length,
      GROSSISTE: allDocuments.filter((d) => d.categorie_fournisseur === 'GROSSISTE').length,
    }),
    [allDocuments]
  )

  // Totals
  const totals = useMemo(() => {
    const ht = filteredDocuments.reduce((acc, doc) => acc + (doc.base_ht_tva_20 || 0), 0)
    const ttc = filteredDocuments.reduce((acc, doc) => acc + doc.net_a_payer, 0)
    return { count: filteredDocuments.length, ht, ttc }
  }, [filteredDocuments])

  // Selected document
  const selectedDocument = useMemo(
    () => allDocuments.find((d) => d.id === selectedId) || null,
    [allDocuments, selectedId]
  )

  // Unique fournisseurs for filter
  const uniqueFournisseurs = useMemo(() => {
    const set = new Set(
      allDocuments
        .filter((d) => d.categorie_fournisseur === activeType)
        .map((d) => d.fournisseur)
    )
    return Array.from(set).sort()
  }, [allDocuments, activeType])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* KPI Bar */}
      <div className="bg-white px-6 py-3 border-b border-gray-200 flex gap-6 items-center overflow-x-auto shrink-0 shadow-sm z-10">
        <TypeTabs counts={counts} />

        <div className="w-px h-8 bg-gray-200" />

        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">Lignes extraites</span>
          <span className="text-lg font-bold text-gray-800">{totals.count}</span>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total HT (filtré)</span>
          <span className="text-lg font-bold text-gray-800">{formatCurrency(totals.ht)}</span>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total TTC (filtré)</span>
          <span className="text-lg font-bold text-blue-600">{formatCurrency(totals.ttc)}</span>
        </div>

        <div className="flex-grow" />

        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm whitespace-nowrap">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 border border-blue-600 rounded text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm whitespace-nowrap">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvelle</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <DocumentFilters fournisseurs={uniqueFournisseurs} />

      {/* Split View: Table + Drawer */}
      <div className="flex-1 overflow-hidden relative flex flex-row">
        <div className="flex-1 overflow-auto bg-gray-50 custom-scrollbar transition-all duration-300">
          <div className="px-6 pb-6 pt-0 w-full">
            <ExtractionsTable data={filteredDocuments} />
          </div>
        </div>

        {/* Drawer */}
        <ExtractionDrawer document={selectedDocument} isOpen={drawerOpen} />
      </div>
    </div>
  )
}
