import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  X,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2,
  Hash,
  Clock,
  User,
  Maximize2
} from 'lucide-react'
import { cn, formatFullCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge'
import { TVARecapTable } from '@/components/common/TVARecapTable'
import { useUIStore } from '@/stores/uiStore'
import { documentsService } from '@/services/documents'
import type { Document as DocumentType } from '@/types'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface ExtractionDrawerProps {
  document: DocumentType | null
  isOpen: boolean
}

export function ExtractionDrawer({ document, isOpen }: ExtractionDrawerProps) {
  const { closeDrawer } = useUIStore()
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(0.6)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'pdf'>('info')

  // Reset state when document changes
  useEffect(() => {
    setPageNumber(1)
    setScale(0.6)
    setPdfError(null)
  }, [document?.id])

  if (!document) return null

  const pdfUrl = documentsService.getPdfUrl(document.id)

  // Build TVA data from document
  const tvaData = [
    { taux: 2.1, base_ht: document.base_ht_tva_2_1 || 0, tva: document.total_tva_2_1 || 0 },
    { taux: 5.5, base_ht: document.base_ht_tva_5_5 || 0, tva: document.total_tva_5_5 || 0 },
    { taux: 10, base_ht: document.base_ht_tva_10 || 0, tva: document.total_tva_10 || 0 },
    { taux: 20, base_ht: document.base_ht_tva_20 || 0, tva: document.total_tva_20 || 0 },
  ].filter((row) => row.base_ht > 0 || row.tva > 0)

  const totalHT = tvaData.reduce((acc, row) => acc + row.base_ht, 0)
  const totalTVA = tvaData.reduce((acc, row) => acc + row.tva, 0)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPdfError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    setPdfError('Impossible de charger le PDF')
    console.error('PDF load error:', error)
  }

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 2))
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.3))
  const handlePrevPage = () => setPageNumber((p) => Math.max(p - 1, 1))
  const handleNextPage = () => setPageNumber((p) => Math.min(p + 1, numPages))

  const handleOpenInNewWindow = () => {
    window.open(pdfUrl, '_blank', 'width=900,height=700')
  }

  const handleDownload = async () => {
    try {
      const blob = await documentsService.getPdf(document.id)
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.nom_fichier
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-full bg-white shadow-2xl z-30 border-l border-gray-200',
        'transition-transform duration-300 ease-in-out flex flex-col overflow-hidden',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
      style={{ width: '420px' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-800">Facture #{document.id}</h2>
            <p className="text-xs text-gray-500">{document.numero_facture}</p>
          </div>
        </div>
        <button
          onClick={closeDrawer}
          className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-2">
        <button
          onClick={() => setActiveTab('info')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px',
            activeTab === 'info'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Informations
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px',
            activeTab === 'pdf'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Aperçu PDF
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' ? (
          <div className="p-5 space-y-5">
            {/* Status & Confidence */}
            <div className="flex items-center justify-between">
              <StatusBadge status={document.status} size="md" />
              <ConfidenceBadge score={document.confidence_score} />
            </div>

            {/* Main Info Grid */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={Building2} label="Fournisseur" value={document.fournisseur} />
                <InfoItem icon={Hash} label="Type" value={document.categorie_fournisseur} />
                <InfoItem icon={Calendar} label="Date facture" value={formatDate(document.date_document)} />
                <InfoItem icon={Calendar} label="Échéance" value={formatDate(document.date_echeance)} highlight />
                {document.operateur && (
                  <InfoItem icon={User} label="Opérateur" value={document.operateur} />
                )}
                {document.heure_document && (
                  <InfoItem icon={Clock} label="Heure" value={document.heure_document} />
                )}
              </div>
            </div>

            {/* Montants */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Montants</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total HT</p>
                  <p className="text-sm font-bold text-gray-800">{formatFullCurrency(totalHT)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total TVA</p>
                  <p className="text-sm font-bold text-gray-800">{formatFullCurrency(totalTVA)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 text-center border border-blue-100">
                  <p className="text-xs text-blue-600 mb-1">Net à payer</p>
                  <p className="text-sm font-bold text-blue-700">{formatFullCurrency(document.net_a_payer)}</p>
                </div>
              </div>
            </div>

            {/* TVA Breakdown */}
            {tvaData.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ventilation TVA</h4>
                <TVARecapTable data={tvaData} />
              </div>
            )}

            {/* Technical Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informations techniques</h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Template utilisé</span>
                  <span className="font-mono text-gray-700">{document.template_used || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date extraction</span>
                  <span className="text-gray-700">{formatDate(document.date_extraction)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dernière modification</span>
                  <span className="text-gray-700">{formatDate(document.date_derniere_modification)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fichier</span>
                  <span className="text-gray-700 truncate max-w-[180px]" title={document.nom_fichier}>
                    {document.nom_fichier}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* PDF Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="Zoom arrière"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 w-12 text-center">{Math.round(scale * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="Zoom avant"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevPage}
                  disabled={pageNumber <= 1}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 min-w-[60px] text-center">
                  {pageNumber} / {numPages || '?'}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={pageNumber >= numPages}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleOpenInNewWindow}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition"
                title="Ouvrir dans une nouvelle fenêtre"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-auto bg-gray-200 flex items-start justify-center p-4">
              {pdfError ? (
                <div className="text-center text-gray-500 py-10">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>{pdfError}</p>
                  <button
                    onClick={handleOpenInNewWindow}
                    className="mt-3 text-blue-600 hover:underline text-sm flex items-center gap-1 mx-auto"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir le PDF directement
                  </button>
                </div>
              ) : (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    className="shadow-lg"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2 shrink-0">
        <button
          onClick={handleDownload}
          className="flex-1 px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Télécharger
        </button>
        <button className="px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-100 hover:text-orange-600 hover:border-orange-200 transition text-sm">
          <AlertTriangle className="w-4 h-4" />
        </button>
        <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm shadow-sm flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Valider
        </button>
      </div>
    </div>
  )
}

// Helper component for info items
function InfoItem({
  icon: Icon,
  label,
  value,
  highlight = false
}: {
  icon: React.ElementType
  label: string
  value: string | undefined | null
  highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className={cn('w-4 h-4 mt-0.5', highlight ? 'text-orange-500' : 'text-gray-400')} />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={cn('text-sm font-medium', highlight ? 'text-orange-600' : 'text-gray-800')}>
          {value || 'N/A'}
        </p>
      </div>
    </div>
  )
}
