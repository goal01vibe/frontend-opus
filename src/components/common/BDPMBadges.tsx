import { cn } from '@/lib/utils'
import type { TauxRemboursement, TypeProduit } from '@/types'

interface RemboursementBadgeProps {
  taux?: TauxRemboursement
  typeProduit?: TypeProduit
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Badge coloré pour le taux de remboursement
 * - 100% : Vert foncé
 * - 65% : Blanc avec bordure (visible sur fond blanc)
 * - 30% : Bleu
 * - 15% : Orange
 * - NR : Violet
 *
 * Ne s'affiche que pour les MEDICAMENTS
 */
export function RemboursementBadge({ taux, typeProduit, size = 'sm' }: RemboursementBadgeProps) {
  // Ne rien afficher si pas un médicament ou pas de taux
  if (typeProduit !== 'MEDICAMENT' || !taux) return null

  const config: Record<string, { bg: string; text: string; border?: string; label: string }> = {
    '100%': { bg: 'bg-green-600', text: 'text-white', label: '100' },
    '65%': { bg: 'bg-white', text: 'text-gray-700', border: 'border border-gray-300', label: '65' },
    '30%': { bg: 'bg-blue-500', text: 'text-white', label: '30' },
    '15%': { bg: 'bg-orange-500', text: 'text-white', label: '15' },
    'NR': { bg: 'bg-violet-500', text: 'text-white', label: 'NR' },
  }

  const style = config[taux]
  if (!style) return null

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold rounded',
        style.bg,
        style.text,
        style.border,
        'shadow-sm',
        size === 'sm' && 'min-w-[20px] h-4 text-[9px] px-1',
        size === 'md' && 'min-w-[24px] h-5 text-[10px] px-1.5',
        size === 'lg' && 'min-w-[28px] h-6 text-xs px-2'
      )}
      title={`Remboursement: ${taux}`}
    >
      {style.label}
    </span>
  )
}

interface BDPMSummaryProps {
  extractions: Array<{ type_produit?: TypeProduit; taux_remboursement?: TauxRemboursement }>
}

/**
 * Résumé BDPM pour le drawer (comptage par taux)
 */
export function BDPMSummary({ extractions }: BDPMSummaryProps) {
  // Compter les médicaments et les taux
  const stats = extractions.reduce(
    (acc, ext) => {
      if (ext.type_produit === 'MEDICAMENT') {
        acc.medicaments++
        const taux = ext.taux_remboursement
        if (taux === '100%') acc.taux100++
        else if (taux === '65%') acc.taux65++
        else if (taux === '30%') acc.taux30++
        else if (taux === '15%') acc.taux15++
        else if (taux === 'NR') acc.nr++
      } else if (ext.type_produit === 'AUTRE') {
        acc.autres++
      }
      return acc
    },
    { medicaments: 0, autres: 0, taux100: 0, taux65: 0, taux30: 0, taux15: 0, nr: 0 }
  )

  if (stats.medicaments === 0 && stats.autres === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Enrichissement BDPM
      </h4>
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        {/* Ligne médicaments avec détail par taux */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Médicaments</span>
          <span className="text-sm font-semibold text-gray-800">{stats.medicaments}</span>
        </div>

        {/* Détail par taux */}
        {stats.medicaments > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.taux100 > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-green-600 text-white px-1.5 shadow-sm">
                  100
                </span>
                <span className="text-xs text-gray-500">×{stats.taux100}</span>
              </div>
            )}
            {stats.taux65 > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-white text-gray-700 border border-gray-300 px-1.5 shadow-sm">
                  65
                </span>
                <span className="text-xs text-gray-500">×{stats.taux65}</span>
              </div>
            )}
            {stats.taux30 > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-blue-500 text-white px-1.5 shadow-sm">
                  30
                </span>
                <span className="text-xs text-gray-500">×{stats.taux30}</span>
              </div>
            )}
            {stats.taux15 > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-orange-500 text-white px-1.5 shadow-sm">
                  15
                </span>
                <span className="text-xs text-gray-500">×{stats.taux15}</span>
              </div>
            )}
            {stats.nr > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-violet-500 text-white px-1.5 shadow-sm">
                  NR
                </span>
                <span className="text-xs text-gray-500">×{stats.nr}</span>
              </div>
            )}
          </div>
        )}

        {/* Autres produits */}
        {stats.autres > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-gray-200">
            <span className="text-sm text-gray-600">Autres produits</span>
            <span className="text-sm font-semibold text-gray-800">{stats.autres}</span>
          </div>
        )}
      </div>
    </div>
  )
}
