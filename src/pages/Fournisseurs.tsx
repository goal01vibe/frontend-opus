import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, TrendingUp, FileText, ArrowUpRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { documentsService } from '@/services/documents'

export function Fournisseurs() {
  const { data: docsData, isLoading } = useQuery({
    queryKey: ['documents-fournisseurs'],
    queryFn: () => documentsService.getAll({ limit: 1000 }),
  })

  const documents = docsData?.items || []

  // Aggregate by fournisseur
  const fournisseurs = useMemo(() => {
    const map = new Map<
      string,
      { name: string; type: string; count: number; amount: number; lastDate: string }
    >()

    documents.forEach((doc) => {
      const existing = map.get(doc.fournisseur) || {
        name: doc.fournisseur,
        type: doc.categorie_fournisseur,
        count: 0,
        amount: 0,
        lastDate: doc.date_document,
      }

      existing.count += 1
      existing.amount += doc.net_a_payer
      if (doc.date_document > existing.lastDate) {
        existing.lastDate = doc.date_document
      }

      map.set(doc.fournisseur, existing)
    })

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
  }, [documents])

  const grossistes = fournisseurs.filter((f) => f.type === 'GROSSISTE')
  const labos = fournisseurs.filter((f) => f.type === 'LABO')

  const totalGrossiste = grossistes.reduce((acc, f) => acc + f.amount, 0)
  const totalLabo = labos.reduce((acc, f) => acc + f.amount, 0)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Chargement des fournisseurs...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-gray-700" />
        <h2 className="text-xl font-bold text-gray-800">Fournisseurs</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-blue-100 uppercase text-sm font-semibold">Grossistes</span>
            <Building2 className="w-8 h-8 text-blue-200" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalGrossiste)}</p>
          <p className="text-blue-200 text-sm mt-1">
            {grossistes.length} fournisseurs •{' '}
            {grossistes.reduce((acc, f) => acc + f.count, 0)} factures
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-100 uppercase text-sm font-semibold">Laboratoires</span>
            <TrendingUp className="w-8 h-8 text-purple-200" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalLabo)}</p>
          <p className="text-purple-200 text-sm mt-1">
            {labos.length} fournisseurs •{' '}
            {labos.reduce((acc, f) => acc + f.count, 0)} factures
          </p>
        </div>
      </div>

      {/* Fournisseurs List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Fournisseur
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                Factures
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                Montant Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                Dernière Facture
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fournisseurs.map((f) => (
              <tr key={f.name} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm',
                        f.type === 'GROSSISTE' ? 'bg-blue-500' : 'bg-purple-500'
                      )}
                    >
                      {f.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{f.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      f.type === 'GROSSISTE'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    )}
                  >
                    {f.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 text-gray-600">
                    <FileText className="w-4 h-4" />
                    {f.count}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-semibold text-gray-800">{formatCurrency(f.amount)}</span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-500">
                  {new Date(f.lastDate).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
