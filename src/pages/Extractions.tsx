import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TypeTabs } from '@/components/layout/TypeTabs'
import { DocumentFilters } from '@/components/filters/DocumentFilters'
import { ExtractionsTable } from '@/components/extractions/ExtractionsTable'
import { ExtractionDrawer } from '@/components/extractions/ExtractionDrawer'
import { NonEnrichedView } from '@/components/enrichment/NonEnrichedView'
import { Pagination } from '@/components/common/Pagination'
import { useUIStore } from '@/stores/uiStore'
import { useFilterStore } from '@/stores/filterStore'
import { documentsService } from '@/services/documents'
import { extractionsService } from '@/services/extractions'
import { enrichmentService } from '@/services/enrichment'
import { formatCurrency } from '@/lib/utils'
import { Download, Plus, LayoutList, FileText, Loader2, AlertTriangle } from 'lucide-react'
import { useExport } from '@/hooks/useExport'
import type { Document as DocumentType, Extraction } from '@/types'

type ViewMode = 'documents' | 'lines'

function buildDocumentFromExtraction(ext: Extraction | undefined): DocumentType | null {
  if (!ext) return null
  return {
    id: ext.document_id,
    nom_fichier: ext.document_name || '',
    hash_fichier: '',
    date_extraction: ext.date_extraction || '',
    date_derniere_modification: ext.date_derniere_modification || '',
    chemin_source: '',
    status: ext.status || 'NEEDS_REVIEW',
    template_used: ext.template_used || '',
    confidence_score: ext.confidence_score || 0,
    numero_facture: ext.numero_facture || '',
    date_document: ext.date_document || '',
    date_echeance: ext.date_echeance || '',
    net_a_payer: ext.net_a_payer || 0,
    type_document: 'FACTURE',
    fournisseur: ext.fournisseur || '',
    categorie_fournisseur: ext.categorie_fournisseur || 'GROSSISTE',
    operateur: ext.operateur,
    heure_document: ext.heure_document,
    base_ht_tva_2_1: ext.base_ht_tva_2_1,
    base_ht_tva_5_5: ext.base_ht_tva_5_5,
    base_ht_tva_10: ext.base_ht_tva_10,
    base_ht_tva_20: ext.base_ht_tva_20,
    total_tva_2_1: ext.total_tva_2_1,
    total_tva_5_5: ext.total_tva_5_5,
    total_tva_10: ext.total_tva_10,
    total_tva_20: ext.total_tva_20,
  } as DocumentType
}

export function Extractions() {
  const { drawerOpen, selectedId } = useUIStore()
  const {
    activeType, selectedFournisseur, searchTerm, filters,
    page, perPage, sortBy, sortOrder,
    setPage, setPerPage, setSearchTerm,
    productFilters,
  } = useFilterStore()
  const [viewMode, setViewMode] = useState<ViewMode>('documents')
  const [showNonEnriched, setShowNonEnriched] = useState(false)
  const [showReplacedCodes, setShowReplacedCodes] = useState(false)
  const [linesPage, setLinesPage] = useState(1)
  const [linesPerPage, setLinesPerPage] = useState(50)
  const { exportToXLSX, exportToCSV } = useExport()
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Non-enriched codes count for badge
  const { data: nonEnrichedData } = useQuery({
    queryKey: ['non-enriched-codes'],
    queryFn: () => enrichmentService.getNonEnrichedCodes(),
    staleTime: 60 * 1000,
  })
  const nonEnrichedCount = nonEnrichedData?.total_unique_codes ?? 0

  // Replaced codes count for badge
  const { data: replacedCodesData } = useQuery({
    queryKey: ['replaced-codes'],
    queryFn: () => enrichmentService.getReplacedCodes(),
    staleTime: 60 * 1000,
  })
  const replacedCodesCount = replacedCodesData?.total_replaced ?? 0

  // Scroll to top when page changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [page])

  // Reset lines page when filters change
  useEffect(() => {
    setLinesPage(1)
  }, [activeType, searchTerm, selectedFournisseur, productFilters])

  // Build query params from store state
  const queryParams = {
    offset: (page - 1) * perPage,
    limit: perPage,
    categorie_fournisseur: activeType,
    fournisseur: selectedFournisseur || undefined,
    status: filters.status?.[0] || undefined,
    search: searchTerm || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    date_from: filters.dateRange?.from ? filters.dateRange.from.toISOString().split('T')[0] : undefined,
    date_to: filters.dateRange?.to ? filters.dateRange.to.toISOString().split('T')[0] : undefined,
  }

  // Fetch documents from API (server-side pagination)
  const { data: serverResponse, isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', queryParams],
    queryFn: () => documentsService.getAll(queryParams),
    placeholderData: (prev) => prev,
  })

  // Build extractions query params
  const extractionsParams = {
    offset: (linesPage - 1) * linesPerPage,
    limit: linesPerPage,
    categorie_fournisseur: activeType,
    search: searchTerm || undefined,
    // Filtres attributs produit (seulement si définis)
    // showReplacedCodes force lifecycle_filter=retired côté serveur
    ...(showReplacedCodes ? { lifecycle_filter: 'retired' } : {
      ...(productFilters.is_active !== undefined && productFilters.is_active !== null && { is_active: productFilters.is_active }),
      ...(productFilters.lifecycle_filter && { lifecycle_filter: productFilters.lifecycle_filter }),
    }),
    ...(productFilters.is_cold_chain !== undefined && productFilters.is_cold_chain !== null && { is_cold_chain: productFilters.is_cold_chain }),
    ...(productFilters.categorie_produit && { categorie_produit: productFilters.categorie_produit }),
    ...(productFilters.is_stupefiant !== undefined && productFilters.is_stupefiant !== null && { is_stupefiant: productFilters.is_stupefiant }),
    ...(productFilters.taux_remboursement && { taux_remboursement: productFilters.taux_remboursement }),
  }

  // Fetch extractions for lines view (server-side pagination)
  const { data: extractionsData, isLoading: loadingExtractions } = useQuery({
    queryKey: ['extractions', extractionsParams],
    queryFn: () => extractionsService.getAll(extractionsParams),
    enabled: viewMode === 'lines',
    placeholderData: (prev) => prev,
  })

  const documents = serverResponse?.documents || []
  const totalCount = serverResponse?.total_count || 0
  const aggregations = serverResponse?.aggregations
  const fournisseurs = serverResponse?.fournisseurs || []
  const rawExtractions = extractionsData?.extractions || []
  const extractionsTotalCount = extractionsData?.total_count || 0

  // Replaced codes: filtre serveur via is_active=false dans extractionsParams
  const allExtractions = rawExtractions

  // Prefetch next page of documents
  useEffect(() => {
    const totalPages = Math.ceil(totalCount / perPage)
    if (page < totalPages) {
      const nextParams = {
        offset: page * perPage,
        limit: perPage,
        categorie_fournisseur: activeType,
        fournisseur: selectedFournisseur || undefined,
        status: filters.status?.[0] || undefined,
        search: searchTerm || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        date_from: filters.dateRange?.from ? filters.dateRange.from.toISOString().split('T')[0] : undefined,
        date_to: filters.dateRange?.to ? filters.dateRange.to.toISOString().split('T')[0] : undefined,
      }
      queryClient.prefetchQuery({
        queryKey: ['documents', nextParams],
        queryFn: () => documentsService.getAll(nextParams),
      })
    }
  }, [page, perPage, totalCount, activeType, selectedFournisseur, searchTerm, sortBy, sortOrder, filters, queryClient])

  // Prefetch next page of extractions (lines view)
  useEffect(() => {
    if (viewMode !== 'lines') return
    const totalPages = Math.ceil(extractionsTotalCount / linesPerPage)
    if (linesPage < totalPages) {
      const nextParams = {
        offset: linesPage * linesPerPage,
        limit: linesPerPage,
        categorie_fournisseur: activeType,
        search: searchTerm || undefined,
        ...(productFilters.is_active !== undefined && productFilters.is_active !== null && { is_active: productFilters.is_active }),
        ...(productFilters.is_cold_chain !== undefined && productFilters.is_cold_chain !== null && { is_cold_chain: productFilters.is_cold_chain }),
        ...(productFilters.categorie_produit && { categorie_produit: productFilters.categorie_produit }),
        ...(productFilters.is_stupefiant !== undefined && productFilters.is_stupefiant !== null && { is_stupefiant: productFilters.is_stupefiant }),
        ...(productFilters.taux_remboursement && { taux_remboursement: productFilters.taux_remboursement }),
        ...(productFilters.lifecycle_filter && { lifecycle_filter: productFilters.lifecycle_filter }),
      }
      queryClient.prefetchQuery({
        queryKey: ['extractions', nextParams],
        queryFn: () => extractionsService.getAll(nextParams),
      })
    }
  }, [linesPage, linesPerPage, extractionsTotalCount, viewMode, activeType, searchTerm, productFilters, queryClient])

  // Tab counts from server aggregations
  const counts = {
    GROSSISTE: aggregations?.by_categorie?.GROSSISTE ?? 0,
    LABO: aggregations?.by_categorie?.LABO ?? 0,
  }

  // Totals from server aggregations
  const totals = {
    count: totalCount,
    ht: aggregations?.totals?.total_ht ?? 0,
    ttc: aggregations?.totals?.total_ttc ?? 0,
  }

  // Selected document
  const selectedDocument = documents.find((d) => d.id === selectedId)
    || buildDocumentFromExtraction(allExtractions.find(e => e.document_id === selectedId))
    || null

  // Export handlers (use dedicated export endpoint)
  const handleExportCSV = useCallback(async () => {
    if (viewMode === 'documents') {
      const exportData = await documentsService.exportAll({
        categorie_fournisseur: activeType,
        fournisseur: selectedFournisseur || undefined,
        status: filters.status?.[0] || undefined,
        search: searchTerm || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        date_from: filters.dateRange?.from ? filters.dateRange.from.toISOString().split('T')[0] : undefined,
        date_to: filters.dateRange?.to ? filters.dateRange.to.toISOString().split('T')[0] : undefined,
      })
      exportToCSV(exportData.documents as unknown as Record<string, unknown>[], 'documents_export')
    } else {
      exportToCSV(allExtractions as unknown as Record<string, unknown>[], 'extractions_export')
    }
  }, [viewMode, activeType, selectedFournisseur, filters, searchTerm, sortBy, sortOrder, allExtractions, exportToCSV])

  const handleExportXLSX = useCallback(async () => {
    if (viewMode === 'documents') {
      const exportData = await documentsService.exportAll({
        categorie_fournisseur: activeType,
        fournisseur: selectedFournisseur || undefined,
        status: filters.status?.[0] || undefined,
        search: searchTerm || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        date_from: filters.dateRange?.from ? filters.dateRange.from.toISOString().split('T')[0] : undefined,
        date_to: filters.dateRange?.to ? filters.dateRange.to.toISOString().split('T')[0] : undefined,
      })
      exportToXLSX(exportData.documents as unknown as Record<string, unknown>[], 'documents_export')
    } else {
      exportToXLSX(allExtractions as unknown as Record<string, unknown>[], 'extractions_export')
    }
  }, [viewMode, activeType, selectedFournisseur, filters, searchTerm, sortBy, sortOrder, allExtractions, exportToXLSX])

  const isLoading = loadingDocs || (viewMode === 'lines' && loadingExtractions)

  const actionButtons = (
    <>
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
    </>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* KPI Bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex gap-3 items-center shrink-0 shadow-sm z-10 overflow-x-auto">
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

        {nonEnrichedCount > 0 && (
          <>
            <div className="w-px h-8 bg-gray-200" />
            <button
              onClick={() => setShowNonEnriched(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200 transition"
            >
              <span>{nonEnrichedCount} non enrichi{nonEnrichedCount > 1 ? 's' : ''}</span>
            </button>
          </>
        )}

        {replacedCodesCount > 0 && (
          <>
            <div className="w-px h-8 bg-gray-200" />
            <button
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition ${
                showReplacedCodes
                  ? 'bg-orange-200 text-orange-800 ring-2 ring-orange-400'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
              onClick={() => {
                const next = !showReplacedCodes
                setShowReplacedCodes(next)
                if (next) setViewMode('lines')
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{replacedCodesCount} code{replacedCodesCount > 1 ? 's' : ''} retiré{replacedCodesCount > 1 ? 's' : ''}</span>
            </button>
          </>
        )}

        <div className="w-px h-8 bg-gray-200" />

        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">
            {viewMode === 'documents' ? 'Documents' : 'Lignes extraites'}
          </span>
          <span className="text-base font-bold text-gray-800">
            {isLoading ? '...' : viewMode === 'documents' ? totals.count.toLocaleString('fr-FR') : extractionsTotalCount.toLocaleString('fr-FR')}
          </span>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">HT</span>
          <span className="text-base font-bold text-gray-800">{formatCurrency(totals.ht)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">TTC</span>
          <span className="text-base font-bold text-blue-600">{formatCurrency(totals.ttc)}</span>
        </div>

      </div>

      {showNonEnriched ? (
        <NonEnrichedView
          onClose={() => setShowNonEnriched(false)}
          onGoToSearch={(code) => {
            setSearchTerm(code)
            setShowNonEnriched(false)
          }}
        />
      ) : (
        <>
          {/* Filters */}
          <DocumentFilters fournisseurs={fournisseurs} actions={actionButtons} />

          {/* Split View: Table + Drawer */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <div
              ref={scrollRef}
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
                  <ExtractionsTable data={documents} />
                ) : (
                  <ExtractionsTable data={documents} extractions={allExtractions} viewMode="lines" />
                )}
              </div>
            </div>

            {/* Pagination (documents view) */}
            {viewMode === 'documents' && !isLoading && totalCount > 0 && (
              <Pagination
                page={page}
                perPage={perPage}
                totalCount={totalCount}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
              />
            )}

            {/* Pagination (lines view) */}
            {viewMode === 'lines' && !isLoading && extractionsTotalCount > 0 && (
              <Pagination
                page={linesPage}
                perPage={linesPerPage}
                totalCount={extractionsTotalCount}
                onPageChange={setLinesPage}
                onPerPageChange={(pp) => { setLinesPerPage(pp); setLinesPage(1) }}
              />
            )}

            {/* Drawer */}
            <ExtractionDrawer document={selectedDocument} isOpen={drawerOpen} />
          </div>
        </>
      )}
    </div>
  )
}
