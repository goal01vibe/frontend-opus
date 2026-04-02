import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enrichmentService } from '@/services/enrichment'
import { X, Check, Loader2 } from 'lucide-react'

interface CategorizeModalProps {
  isOpen: boolean
  onClose: () => void
  codeArticle: string
  denominationSample: string
  onSuccess: () => void
}

const CATEGORIES = [
  { value: 'MEDICAMENT', label: 'Medicament', badge: 'MED', bg: 'bg-blue-500' },
  { value: 'MEDICAMENT_IMPORT', label: 'Med. import', badge: 'MED IMP', bg: 'bg-indigo-600' },
  { value: 'LPP', label: 'Dispositif medical', badge: 'LPP', bg: 'bg-green-500' },
  { value: 'CONSOMMABLE', label: 'Consommable', badge: 'CONSO', bg: 'bg-orange-500' },
  { value: 'AUTRES', label: 'Parapharmacie', badge: 'PARA', bg: 'bg-gray-400' },
  { value: 'SERVICE', label: 'Service / Abo', badge: 'SERV', bg: 'bg-purple-500' },
  { value: 'CONSIGNE', label: 'Consigne', badge: 'CSG', bg: 'bg-teal-500' },
] as const

export function CategorizeModal({
  isOpen,
  onClose,
  codeArticle,
  denominationSample,
  onSuccess,
}: CategorizeModalProps) {
  const [categorie, setCategorie] = useState('')
  const [label, setLabel] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      enrichmentService.createManualEnrichment(
        codeArticle,
        categorie,
        label.trim() || undefined
      ),
    onSuccess: () => {
      setShowSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['non-enriched-codes'] })
      queryClient.invalidateQueries({ queryKey: ['extractions'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      onSuccess()
      setTimeout(() => {
        setShowSuccess(false)
        handleClose()
      }, 1200)
    },
  })

  const handleClose = () => {
    if (mutation.isPending) return
    setCategorie('')
    setLabel('')
    mutation.reset()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!categorie) return
    mutation.mutate()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Categoriser un produit</h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success overlay */}
        {showSuccess && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-green-700 font-medium">
              Categorisation enregistree ({mutation.data?.extractions_updated ?? 0} extractions mises a jour)
            </p>
          </div>
        )}

        {/* Form */}
        {!showSuccess && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Code article (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code article</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md font-mono text-sm text-gray-800">
                {codeArticle}
              </div>
            </div>

            {/* Denomination (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Denomination</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600 truncate" title={denominationSample}>
                {denominationSample || '-'}
              </div>
            </div>

            {/* Category select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categorie <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategorie(cat.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition ${
                      categorie === cat.value
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center min-w-[36px] h-5 text-[10px] font-bold rounded text-white px-1.5 shadow-sm ${cat.bg}`}>
                      {cat.badge}
                    </span>
                    <span className="text-gray-700 truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label <span className="text-gray-400 text-xs">(optionnel)</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Produit special import Allemagne"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Error */}
            {mutation.isError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {(mutation.error as any)?.response?.data?.detail || 'Erreur lors de la categorisation. Veuillez reessayer.'}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={mutation.isPending}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!categorie || mutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    En cours...
                  </>
                ) : (
                  'Valider'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
