import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TypeTabs } from '@/components/layout/TypeTabs'
import { DocumentFilters } from '@/components/filters/DocumentFilters'
import { ExtractionsTable } from '@/components/extractions/ExtractionsTable'
import { ExtractionDrawer } from '@/components/extractions/ExtractionDrawer'
import { useUIStore } from '@/stores/uiStore'
import { useFilterStore } from '@/stores/filterStore'
import { documentsService } from '@/services/documents'
import { extractionsService } from '@/services/extractions'
import { formatCurrency } from '@/lib/utils'
import { Download, Plus, LayoutList, FileText, Loader2 } from 'lucide-react'
import { useExport } from '@/hooks/useExport'

type ViewMode = 'documents' | 'lines'

export function Extractions() {
  const { drawerOpen, selectedId } = useUIStore()
  const { activeType, selectedFournisseur, searchTerm, filters } = useFilterStore()
  const [viewMode, setViewMode] = useState<ViewMode>('documents')
  const { exportToXLSX, exportToCSV } = useExport()

  // Fetch documents from API
  const { data: documentsData, isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', { limit: 500, search: searchTerm }],
    queryFn: () => documentsService.getAll({ limit: 500, search: searchTerm || undefined }),
  })

  // Fetch extractions for lines view
  const { data: extractionsData, isLoading: loadingExtractions } = useQuery({
    queryKey: ['extractions', { limit: 1000 }],
    queryFn: () => extractionsService.getAll({ limit: 1000 }),
    enabled: viewMode === 'lines',
  })

  const allDocuments = documentsData?.items || []
  const allExtractions = extractionsData?.items || []

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      // Filter by type
      if (doc.categorie_fournisseur !== activeType) return false

      // Filter by fournisseur
      if (selectedFournisseur && doc.fournisseur !== selectedFournisseur) return false

      // Filter by search (already done at API level, but double-check)
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        if (
          !doc.numero_facture?.toLowerCase().includes(term) &&
          !doc.fournisseur?.toLowerCase().includes(term) &&
          !doc.nom_fichier?.toLowerCase().includes(term)
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
    const ttc = filteredDocuments.reduce((acc, doc) => acc + (doc.net_a_payer || 0), 0)
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
        .filter(Boolean)
    )
    return Array.from(set).sort()
  }, [allDocuments, activeType])

  // Export handlers
  const handleExportCSV = () => {
    if (viewMode === 'documents') {
      exportToCSV(filteredDocuments as unknown as Record<string, unknown>[], 'documents_export')
    } else {
      exportToCSV(allExtractions as unknown as Record<string, unknown>[], 'extractions_export')
    }
  }

  const handleExportXLSX = () => {
    if (viewMode === 'documents') {
      exportToXLSX(filteredDocuments as unknown as Record<string, unknown>[], 'documents_export')
    } else {
      exportToXLSX(allExtractions as unknown as Record<string, unknown>[], 'extractions_export')
    }
  }

  const isLoading = loadingDocs || (viewMode === 'lines' && loadingExtractions)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* KPI Bar */}
      <div className="bg-white px-6 py-3 border-b border-gray-200 flex gap-6 items-center overflow-x-auto shrink-0 shadow-sm z-10">
        <TypeTabs counts={counts} />

        <div className="w-px h-8 bg-gray-200" />

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('documents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'documents'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>
          <button
            onClick={() => setViewMode('lines')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'lines'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutList className="w-4 h-4" />
            Lignes
          </button>
        </div>

        <div className="w-px h-8 bg-gray-200" />

        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">
            {viewMode === 'documents' ? 'Documents' : 'Lignes extraites'}
          </span>
          <span className="text-lg font-bold text-gray-800">
            {isLoading ? '...' : viewMode === 'documents' ? totals.count : allExtractions.length}
          </span>
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
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">XLSX</span>
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
        <div
          className={`flex-1 overflow-auto bg-gray-50 custom-scrollbar transition-all duration-300 ease-in-out ${
            drawerOpen ? 'mr-[420px]' : 'mr-0'
          }`}
        >
          <div className="px-6 pb-6 pt-0 w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-500">Chargement...</span>
              </div>
            ) : viewMode === 'documents' ? (
              <ExtractionsTable data={filteredDocuments} />
            ) : (
              <ExtractionsTable data={filteredDocuments} extractions={allExtractions} viewMode="lines" />
            )}
          </div>
        </div>

        {/* Drawer */}
        <ExtractionDrawer document={selectedDocument} isOpen={drawerOpen} />
      </div>
    </div>
  )
}
