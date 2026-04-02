import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { enrichmentService, type NonEnrichedCode } from '@/services/enrichment'
import { CategorizeModal } from './CategorizeModal'
import { ArrowLeft, Loader2, Tag, AlertCircle } from 'lucide-react'

interface NonEnrichedViewProps {
  onClose: () => void
}

export function NonEnrichedView({ onClose }: NonEnrichedViewProps) {
  const queryClient = useQueryClient()
  const [selectedCode, setSelectedCode] = useState<NonEnrichedCode | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['non-enriched-codes'],
    queryFn: () => enrichmentService.getNonEnrichedCodes(),
  })

  const codes = data?.codes ?? []
  const totalCodes = data?.total_unique_codes ?? 0
  const totalExtractions = data?.total_extractions ?? 0

  const handleCategorizeSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['non-enriched-codes'] })
    queryClient.invalidateQueries({ queryKey: ['extractions'] })
    queryClient.invalidateQueries({ queryKey: ['documents'] })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-3 shrink-0 shadow-sm">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="w-px h-8 bg-gray-200" />

        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-600" />
          <h2 className="text-base font-semibold text-gray-900">Produits non enrichis</h2>
        </div>

        <div className="w-px h-8 bg-gray-200" />

        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">Codes uniques</span>
          <span className="text-base font-bold text-gray-800">
            {isLoading ? '...' : totalCodes.toLocaleString('fr-FR')}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">Extractions</span>
          <span className="text-base font-bold text-amber-600">
            {isLoading ? '...' : totalExtractions.toLocaleString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 custom-scrollbar">
        <div className="px-6 pb-6 pt-0 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500">Chargement...</span>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-64 gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Erreur : {(error as any)?.message || 'Impossible de charger les donnees'}</span>
            </div>
          ) : codes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500">
              <Tag className="w-8 h-8 text-gray-300" />
              <p className="text-base font-medium">Tous les produits sont enrichis</p>
              <p className="text-sm">Aucun code article sans categorisation.</p>
            </div>
          ) : (
            <div className="overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-gray-50 sticky top-0 z-20">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                      Code article
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                      Denomination
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 text-center">
                      Occurrences
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                      Periode
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {codes.map((code, idx) => (
                    <tr
                      key={code.code_article}
                      className={`${idx % 2 === 0 ? 'bg-slate-50' : 'bg-slate-100'} hover:bg-blue-50 transition-colors duration-150`}
                    >
                      <td className="py-3 px-4 text-sm">
                        <span className="font-mono text-sm text-gray-800">{code.code_article}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <span className="truncate block max-w-[250px]" title={code.denomination_sample}>
                          {code.denomination_sample || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">
                          {code.extraction_count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(code.first_seen)}
                        {code.last_seen && code.first_seen !== code.last_seen && (
                          <> → {formatDate(code.last_seen)}</>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-center">
                        <button
                          onClick={() => setSelectedCode(code)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                        >
                          <Tag className="w-3 h-3" />
                          Categoriser
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Categorize Modal */}
      {selectedCode && (
        <CategorizeModal
          isOpen={!!selectedCode}
          onClose={() => setSelectedCode(null)}
          codeArticle={selectedCode.code_article}
          denominationSample={selectedCode.denomination_sample}
          onSuccess={handleCategorizeSuccess}
        />
      )}
    </div>
  )
}
