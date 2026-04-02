import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enrichmentService } from '@/services/enrichment'
import { X, Loader2 } from 'lucide-react'

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
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (cat: string) =>
      enrichmentService.createManualEnrichment(
        codeArticle,
        cat,
        label.trim() || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['non-enriched-codes'] })
      queryClient.invalidateQueries({ queryKey: ['extractions'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      onSuccess()
      // Close immediately — the product disappearing from the list IS the feedback
      setCategorie('')
      setLabel('')
      mutation.reset()
      onClose()
    },
  })

  const handleClose = () => {
    if (mutation.isPending) return
    setCategorie('')
    setLabel('')
    mutation.reset()
    onClose()
  }

  const handleCategorize = (cat: string) => {
    setCategorie(cat)
    mutation.mutate(cat)
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

        {/* Form */}
          <div className="space-y-4">
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

            {/* Optional label — fill BEFORE clicking a badge */}
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

            {/* Category badges — click = submit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliquer pour categoriser :
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategorize(cat.value)}
                    disabled={mutation.isPending}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition cursor-pointer ${
                      categorie === cat.value
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className={`inline-flex items-center justify-center min-w-[36px] h-5 text-[10px] font-bold rounded text-white px-1.5 shadow-sm ${cat.bg}`}>
                      {cat.badge}
                    </span>
                    <span className="text-gray-700 truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {mutation.isError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {(mutation.error as any)?.response?.data?.detail || 'Erreur lors de la categorisation. Veuillez reessayer.'}
              </div>
            )}

            {/* Loading indicator */}
            {mutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                En cours...
              </div>
            )}

            {/* Annuler */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={mutation.isPending}
                className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
      </div>
    </div>
  )
}
