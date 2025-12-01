import { formatFullCurrency } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TVARow {
  taux: number
  base_ht: number
  tva: number
  base_ht_declared?: number
  tva_declared?: number
}

interface TVARecapTableProps {
  data: TVARow[]
  showDiscrepancies?: boolean
}

// Couleurs par taux de TVA
const TVA_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  2.1: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  5.5: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  10: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  20: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
}

function getTVAColor(taux: number) {
  return TVA_COLORS[taux] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
}

export function TVARecapTable({ data, showDiscrepancies = true }: TVARecapTableProps) {
  const totals = data.reduce(
    (acc, row) => ({
      base_ht: acc.base_ht + row.base_ht,
      tva: acc.tva + row.tva,
      ttc: acc.ttc + row.base_ht + row.tva,
    }),
    { base_ht: 0, tva: 0, ttc: 0 }
  )

  const hasDiscrepancy = (row: TVARow) => {
    if (!showDiscrepancies) return false
    if (row.base_ht_declared !== undefined) {
      return Math.abs(row.base_ht - row.base_ht_declared) > 0.01
    }
    if (row.tva_declared !== undefined) {
      return Math.abs(row.tva - row.tva_declared) > 0.01
    }
    return false
  }

  // Si aucune donnée TVA
  if (data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
        Données TVA non disponibles
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
              Taux
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
              Base HT
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
              TVA
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
              TTC
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row) => {
            const colors = getTVAColor(row.taux)
            return (
              <tr
                key={row.taux}
                className={cn(hasDiscrepancy(row) && 'bg-yellow-50')}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold border',
                      colors.bg,
                      colors.text,
                      colors.border
                    )}>
                      {row.taux}%
                    </span>
                    {hasDiscrepancy(row) && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {formatFullCurrency(row.base_ht)}
                </td>
                <td className={cn('px-3 py-2 text-right font-medium', colors.text)}>
                  {formatFullCurrency(row.tva)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-800">
                  {formatFullCurrency(row.base_ht + row.tva)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
          <tr>
            <td className="px-3 py-2 font-bold text-gray-800">TOTAL</td>
            <td className="px-3 py-2 text-right font-bold text-gray-800">
              {formatFullCurrency(totals.base_ht)}
            </td>
            <td className="px-3 py-2 text-right font-bold text-gray-800">
              {formatFullCurrency(totals.tva)}
            </td>
            <td className="px-3 py-2 text-right font-bold text-blue-600">
              {formatFullCurrency(totals.ttc)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
