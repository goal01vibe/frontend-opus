import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { formatFullCurrency } from '@/lib/utils'

interface TimelineChartProps {
  data: { date: string; count: number; amount: number }[]
  dataKey?: 'count' | 'amount'
  title?: string
}

export function TimelineChart({
  data,
  dataKey = 'count',
  title = 'Évolution des Extractions',
}: TimelineChartProps) {
  const formatXAxis = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-500" />
        {title}
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorData" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={formatXAxis}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(val) =>
                dataKey === 'amount' ? `${(val / 1000).toFixed(0)}k` : val
              }
            />
            <Tooltip
              formatter={(value: number) =>
                dataKey === 'amount' ? formatFullCurrency(value) : value
              }
              labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR')}
              contentStyle={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="#2563EB"
              fillOpacity={1}
              fill="url(#colorData)"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
