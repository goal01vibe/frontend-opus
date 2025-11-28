import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, Building2, Puzzle } from 'lucide-react'
import { formatFullCurrency } from '@/lib/utils'
import { CHART_COLORS } from '@/lib/constants'

interface TopRankingChartProps {
  data: { name: string; value: number }[]
  title: string
  type?: 'fournisseur' | 'template' | 'product'
  valueType?: 'amount' | 'count' | 'percent'
}

export function TopRankingChart({
  data,
  title,
  type = 'fournisseur',
  valueType = 'amount',
}: TopRankingChartProps) {
  const Icon = type === 'fournisseur' ? Building2 : type === 'template' ? Puzzle : TrendingUp
  const iconColor =
    type === 'fournisseur'
      ? 'text-teal-500'
      : type === 'template'
      ? 'text-orange-500'
      : 'text-blue-500'

  const formatValue = (val: number) => {
    switch (valueType) {
      case 'amount':
        return formatFullCurrency(val)
      case 'percent':
        return `${val.toFixed(1)}%`
      default:
        return val.toLocaleString('fr-FR')
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        {title}
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              tick={{ fontSize: 11, fill: '#4B5563', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#F9FAFB' }}
              formatter={(value: number) => formatValue(value)}
              contentStyle={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
