import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { BarChart3 } from 'lucide-react'

interface StatusStackedBarProps {
  data: { name: string; Validé: number; 'En attente': number; Erreur: number }[]
}

export function StatusStackedBar({ data }: StatusStackedBarProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-indigo-500" />
        Qualité Extraction par Mois
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: '#F9FAFB' }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar
              dataKey="Validé"
              stackId="a"
              fill="#10B981"
              barSize={32}
              radius={[0, 0, 0, 0]}
            />
            <Bar dataKey="En attente" stackId="a" fill="#F59E0B" barSize={32} />
            <Bar
              dataKey="Erreur"
              stackId="a"
              fill="#EF4444"
              barSize={32}
              radius={[4, 4, 0, 0]}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ paddingTop: '10px' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Helper to generate monthly status data from raw data
export function generateMonthlyStatusData(
  documents: { date_document: string; status: string }[]
): { name: string; Validé: number; 'En attente': number; Erreur: number }[] {
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  const monthlyMap = new Map<string, { Validé: number; 'En attente': number; Erreur: number }>()

  documents.forEach((doc) => {
    const month = new Date(doc.date_document).getMonth()
    const monthLabel = monthNames[month]

    if (!monthlyMap.has(monthLabel)) {
      monthlyMap.set(monthLabel, { 'Validé': 0, 'En attente': 0, 'Erreur': 0 })
    }

    const current = monthlyMap.get(monthLabel)!
    if (doc.status === 'VALIDATED' || doc.status === 'Validé') {
      current['Validé']++
    } else if (doc.status === 'NEEDS_REVIEW' || doc.status === 'En attente') {
      current['En attente']++
    } else if (doc.status === 'FAILED' || doc.status === 'Erreur') {
      current['Erreur']++
    }
  })

  return Array.from(monthlyMap.entries()).map(([name, counts]) => ({
    name,
    ...counts,
  }))
}
