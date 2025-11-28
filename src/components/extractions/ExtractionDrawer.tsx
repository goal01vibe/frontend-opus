import { X, FileText, Download, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFullCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge'
import { TVARecapTable } from '@/components/common/TVARecapTable'
import { useUIStore } from '@/stores/uiStore'
import type { Document } from '@/types'

interface ExtractionDrawerProps {
  document: Document | null
  isOpen: boolean
}

export function ExtractionDrawer({ document, isOpen }: ExtractionDrawerProps) {
  const { closeDrawer } = useUIStore()

  if (!document) return null

  // Build TVA data from document
  const tvaData = [
    { taux: 2.1, base_ht: document.base_ht_tva_2_1 || 0, tva: document.total_tva_2_1 || 0 },
    { taux: 5.5, base_ht: document.base_ht_tva_5_5 || 0, tva: document.total_tva_5_5 || 0 },
    { taux: 10, base_ht: document.base_ht_tva_10 || 0, tva: document.total_tva_10 || 0 },
    { taux: 20, base_ht: document.base_ht_tva_20 || 0, tva: document.total_tva_20 || 0 },
  ].filter((row) => row.base_ht > 0 || row.tva > 0)

  return (
    <div
      className={cn(
        'bg-white shadow-xl z-20 border-l border-gray-200',
        'transition-[width,opacity] duration-300 ease-in-out flex flex-col overflow-hidden',
        isOpen ? 'w-[400px] opacity-100' : 'w-0 opacity-0'
      )}
    >
      <div className="w-[400px] flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Détails Extraction</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-gray-500 bg-gray-200 px-1.5 rounded">
                #{document.id}
              </span>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                Information Facture
              </span>
              <StatusBadge status={document.status} size="md" />
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Numéro Facture</p>
                <p className="text-sm font-bold text-gray-800 select-all">
                  {document.numero_facture}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Date Facturation</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatDate(document.date_document)}
                </p>
              </div>
              <div className="col-span-2 pt-3 border-t border-gray-100 mt-1">
                <p className="text-xs text-gray-400 mb-1">Fournisseur</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                    {document.fournisseur.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">{document.fournisseur}</p>
                    <p className="text-xs text-gray-400">{document.categorie_fournisseur}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confidence */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 ml-1">
              Score de Confiance
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <ConfidenceBadge score={document.confidence_score} showLabel />
              <p className="text-xs text-gray-500 mt-2">
                Template: <span className="font-mono">{document.template_used}</span>
              </p>
            </div>
          </div>

          {/* TVA Recap */}
          {tvaData.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 ml-1">
                Données TVA
              </h3>
              <TVARecapTable data={tvaData} />
            </div>
          )}

          {/* Net à payer */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 ml-1">
              Net à Payer
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 text-center">
              <span className="text-3xl font-bold text-blue-700">
                {formatFullCurrency(document.net_a_payer)}
              </span>
            </div>
          </div>

          {/* File Info */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 ml-1">
              Fichier Source
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-red-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {document.nom_fichier}
                  </p>
                  <p className="text-xs text-gray-400">
                    Extrait le {formatDate(document.date_extraction)}
                  </p>
                </div>
                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 shrink-0">
          <button className="flex-1 px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-100 hover:text-red-600 hover:border-red-200 transition font-medium text-sm flex items-center justify-center gap-2 group">
            <AlertTriangle className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
            Signaler
          </button>
          <button className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm shadow-sm shadow-blue-200 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}
