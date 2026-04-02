import { cn } from '@/lib/utils'
import type { Categorie, TauxRemboursement, Extraction } from '@/types'

// ============================================================
// CategorieBadge — Badge type produit (MED / LPP / PARA)
// ============================================================

interface CategorieBadgeProps {
  categorie: Categorie
  isStupefiant?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const categorieConfig: Record<string, { bg: string; text: string; label: string }> = {
  MEDICAMENT: { bg: 'bg-blue-500', text: 'text-white', label: 'MED' },
  LPP: { bg: 'bg-green-500', text: 'text-white', label: 'LPP' },
  AUTRES: { bg: 'bg-gray-400', text: 'text-white', label: 'PARA' },
  CONSOMMABLE: { bg: 'bg-orange-500', text: 'text-white', label: 'CONSO' },
  SERVICE: { bg: 'bg-purple-500', text: 'text-white', label: 'SERV' },
  MEDICAMENT_IMPORT: { bg: 'bg-indigo-600', text: 'text-white', label: 'MED IMP' },
}

export function CategorieBadge({ categorie, isStupefiant = false, size = 'sm' }: CategorieBadgeProps) {
  if (!categorie) return null

  const style = categorieConfig[categorie]
  if (!style) return null

  return (
    <span className="inline-flex items-center gap-0.5">
      <span
        className={cn(
          'inline-flex items-center justify-center font-bold rounded',
          style.bg,
          style.text,
          'shadow-sm',
          size === 'sm' && 'min-w-[24px] h-4 text-[9px] px-1',
          size === 'md' && 'min-w-[28px] h-5 text-[10px] px-1.5',
          size === 'lg' && 'min-w-[32px] h-6 text-xs px-2'
        )}
        title={categorie}
      >
        {style.label}
      </span>
      {isStupefiant && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"
          title="Stupefiant"
        />
      )}
    </span>
  )
}

// ============================================================
// TauxBadge — Badge taux de remboursement
// ============================================================

interface TauxBadgeProps {
  taux: TauxRemboursement
  size?: 'sm' | 'md' | 'lg'
}

const tauxConfig: Record<string, { bg: string; text: string; border?: string; label: string }> = {
  '100%': { bg: 'bg-green-600', text: 'text-white', label: '100' },
  '90%': { bg: 'bg-emerald-500', text: 'text-white', label: '90' },
  '70%': { bg: 'bg-cyan-500', text: 'text-white', label: '70' },
  '65%': { bg: 'bg-white', text: 'text-gray-700', border: 'border border-gray-300', label: '65' },
  '60%': { bg: 'bg-teal-500', text: 'text-white', label: '60' },
  '30%': { bg: 'bg-yellow-500', text: 'text-white', label: '30' },
  '15%': { bg: 'bg-orange-500', text: 'text-white', label: '15' },
  NR: { bg: 'bg-gray-400', text: 'text-white', label: 'NR' },
}

export function TauxBadge({ taux, size = 'sm' }: TauxBadgeProps) {
  if (!taux) return null

  const style = tauxConfig[taux]
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

// ============================================================
// ProductBadges — Composant principal (combine categorie + taux)
// ============================================================

interface ProductBadgesProps {
  extraction: Extraction
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Determine la categorie effective d'une extraction.
 * Priorise le nouveau champ `categorie` (BCB/VIDAL),
 * avec fallback sur l'ancien `type_produit` (BDPM) pour compatibilite.
 */
function getEffectiveCategorie(extraction: Extraction): Categorie {
  // Nouveau systeme BCB/VIDAL
  if (extraction.categorie) return extraction.categorie

  // Fallback ancien systeme BDPM
  if (extraction.type_produit === 'MEDICAMENT') return 'MEDICAMENT'
  if (extraction.type_produit === 'AUTRE') return 'AUTRES'

  return null
}

/**
 * Badge principal qui combine tout :
 * - MEDICAMENT : badge "MED" bleu + badge taux (2 badges)
 * - LPP : badge "LPP" vert seul (1 badge, pas de taux)
 * - AUTRES : badge "PARA" gris seul. Si NR, badge "NR" violet a la place
 * - Pas de categorie : aucun badge
 * - Stupefiant : point rouge a cote du badge type
 */
export function ProductBadges({ extraction, size = 'sm' }: ProductBadgesProps) {
  const categorie = getEffectiveCategorie(extraction)
  if (!categorie) return null

  const taux = extraction.taux_remboursement
  const isStupefiant = extraction.is_stupefiant === true

  // AUTRES + NR : afficher badge "NR" violet a la place du "PARA" gris
  if (categorie === 'AUTRES' && taux === 'NR') {
    return (
      <span className="inline-flex items-center gap-0.5">
        <span
          className={cn(
            'inline-flex items-center justify-center font-bold rounded bg-violet-500 text-white shadow-sm',
            size === 'sm' && 'min-w-[20px] h-4 text-[9px] px-1',
            size === 'md' && 'min-w-[24px] h-5 text-[10px] px-1.5',
            size === 'lg' && 'min-w-[28px] h-6 text-xs px-2'
          )}
          title="Parapharmacie - Non remboursable"
        >
          NR
        </span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      <CategorieBadge categorie={categorie} isStupefiant={isStupefiant} size={size} />
      {categorie === 'MEDICAMENT' && taux && <TauxBadge taux={taux} size={size} />}
    </span>
  )
}

// ============================================================
// ProductSummary — Resume enrichissement pour le drawer
// ============================================================

interface ProductSummaryProps {
  extractions: Array<Extraction>
}

/**
 * Resume enrichissement BCB/VIDAL pour le drawer document.
 * Compte les 3 categories (MEDICAMENT, LPP, AUTRES) et les taux.
 */
export function ProductSummary({ extractions }: ProductSummaryProps) {
  const stats = extractions.reduce(
    (acc, ext) => {
      const cat = getEffectiveCategorie(ext)

      if (cat === 'MEDICAMENT') {
        acc.medicaments++
        const taux = ext.taux_remboursement
        if (taux === '100%') acc.taux100++
        else if (taux === '90%') acc.taux90++
        else if (taux === '70%') acc.taux70++
        else if (taux === '65%') acc.taux65++
        else if (taux === '60%') acc.taux60++
        else if (taux === '30%') acc.taux30++
        else if (taux === '15%') acc.taux15++
        else if (taux === 'NR') acc.nrMed++
        if (ext.is_stupefiant) acc.stupefiants++
      } else if (cat === 'LPP') {
        acc.lpp++
      } else if (cat === 'AUTRES') {
        acc.autres++
      } else if (cat === 'CONSOMMABLE') {
        acc.consommable++
      } else if (cat === 'SERVICE') {
        acc.service++
      } else if (cat === 'MEDICAMENT_IMPORT') {
        acc.medicament_import++
      }
      return acc
    },
    {
      medicaments: 0,
      lpp: 0,
      autres: 0,
      consommable: 0,
      service: 0,
      medicament_import: 0,
      taux100: 0,
      taux90: 0,
      taux70: 0,
      taux65: 0,
      taux60: 0,
      taux30: 0,
      taux15: 0,
      nrMed: 0,
      stupefiants: 0,
    }
  )

  if (stats.medicaments === 0 && stats.lpp === 0 && stats.autres === 0 && stats.consommable === 0 && stats.service === 0 && stats.medicament_import === 0) return null

  // Badges de taux pour le resume
  const tauxBadges: Array<{ count: number; bg: string; text: string; border?: string; label: string }> = [
    { count: stats.taux100, bg: 'bg-green-600', text: 'text-white', label: '100' },
    { count: stats.taux90, bg: 'bg-emerald-500', text: 'text-white', label: '90' },
    { count: stats.taux70, bg: 'bg-cyan-500', text: 'text-white', label: '70' },
    { count: stats.taux65, bg: 'bg-white', text: 'text-gray-700', border: 'border border-gray-300', label: '65' },
    { count: stats.taux60, bg: 'bg-teal-500', text: 'text-white', label: '60' },
    { count: stats.taux30, bg: 'bg-yellow-500', text: 'text-white', label: '30' },
    { count: stats.taux15, bg: 'bg-orange-500', text: 'text-white', label: '15' },
    { count: stats.nrMed, bg: 'bg-gray-400', text: 'text-white', label: 'NR' },
  ]

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Enrichissement BCB/VIDAL
      </h4>
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        {/* Medicaments */}
        {stats.medicaments > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-blue-500 text-white px-1.5 shadow-sm">
                  MED
                </span>
                Medicaments
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {stats.medicaments}
                {stats.stupefiants > 0 && (
                  <span className="text-red-500 text-xs ml-1" title="dont stupefiants">
                    ({stats.stupefiants} stup.)
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tauxBadges
                .filter((b) => b.count > 0)
                .map((b) => (
                  <div key={b.label} className="flex items-center gap-1">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded px-1.5 shadow-sm',
                        b.bg,
                        b.text,
                        b.border
                      )}
                    >
                      {b.label}
                    </span>
                    <span className="text-xs text-gray-500">x{b.count}</span>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* LPP */}
        {stats.lpp > 0 && (
          <div className={cn(
            'flex items-center justify-between',
            stats.medicaments > 0 && 'pt-1 border-t border-gray-200'
          )}>
            <span className="text-sm text-gray-600 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-green-500 text-white px-1.5 shadow-sm">
                LPP
              </span>
              Dispositifs medicaux
            </span>
            <span className="text-sm font-semibold text-gray-800">{stats.lpp}</span>
          </div>
        )}

        {/* Autres / Para */}
        {stats.autres > 0 && (
          <div className={cn(
            'flex items-center justify-between',
            (stats.medicaments > 0 || stats.lpp > 0) && 'pt-1 border-t border-gray-200'
          )}>
            <span className="text-sm text-gray-600 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-gray-400 text-white px-1.5 shadow-sm">
                PARA
              </span>
              Parapharmacie
            </span>
            <span className="text-sm font-semibold text-gray-800">{stats.autres}</span>
          </div>
        )}

        {/* Consommables */}
        {stats.consommable > 0 && (
          <div className={cn(
            'flex items-center justify-between',
            (stats.medicaments > 0 || stats.lpp > 0 || stats.autres > 0) && 'pt-1 border-t border-gray-200'
          )}>
            <span className="text-sm text-gray-600 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-orange-500 text-white px-1.5 shadow-sm">
                CONSO
              </span>
              Consommables
            </span>
            <span className="text-sm font-semibold text-gray-800">{stats.consommable}</span>
          </div>
        )}

        {/* Services */}
        {stats.service > 0 && (
          <div className={cn(
            'flex items-center justify-between',
            (stats.medicaments > 0 || stats.lpp > 0 || stats.autres > 0 || stats.consommable > 0) && 'pt-1 border-t border-gray-200'
          )}>
            <span className="text-sm text-gray-600 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-purple-500 text-white px-1.5 shadow-sm">
                SERV
              </span>
              Services
            </span>
            <span className="text-sm font-semibold text-gray-800">{stats.service}</span>
          </div>
        )}

        {/* Medicaments Import */}
        {stats.medicament_import > 0 && (
          <div className={cn(
            'flex items-center justify-between',
            (stats.medicaments > 0 || stats.lpp > 0 || stats.autres > 0 || stats.consommable > 0 || stats.service > 0) && 'pt-1 border-t border-gray-200'
          )}>
            <span className="text-sm text-gray-600 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center min-w-[24px] h-5 text-[10px] font-bold rounded bg-indigo-600 text-white px-1.5 shadow-sm">
                MED IMP
              </span>
              Med. import
            </span>
            <span className="text-sm font-semibold text-gray-800">{stats.medicament_import}</span>
          </div>
        )}
      </div>
    </div>
  )
}
