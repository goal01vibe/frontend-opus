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
          {data.map((row) => (
            <tr
              key={row.taux}
              className={cn(hasDiscrepancy(row) && 'bg-yellow-50')}
            >
              <td className="px-3 py-2 font-medium text-gray-700">
                <div className="flex items-center gap-2">
                  {row.taux}%
                  {hasDiscrepancy(row) && (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              </td>
              <td className="px-3 py-2 text-right text-gray-600">
                {formatFullCurrency(row.base_ht)}
              </td>
              <td className="px-3 py-2 text-right text-gray-600">
                {formatFullCurrency(row.tva)}
              </td>
              <td className="px-3 py-2 text-right font-medium text-gray-800">
                {formatFullCurrency(row.base_ht + row.tva)}
              </td>
            </tr>
          ))}
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
