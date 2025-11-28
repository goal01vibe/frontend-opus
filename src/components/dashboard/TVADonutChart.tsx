import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Percent } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { TVA_COLORS } from '@/lib/constants'

interface TVADonutChartProps {
  data: { taux: string; base_ht: number; tva: number }[]
}

export function TVADonutChart({ data }: TVADonutChartProps) {
  const chartData = data.map((d) => ({
    name: d.taux,
    value: d.tva,
  }))

  const totalTVA = data.reduce((acc, d) => acc + d.tva, 0)

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Percent className="w-4 h-4 text-pink-500" />
        Répartition TVA
      </h3>
      <div className="flex flex-row flex-1 min-h-0">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={TVA_COLORS[index % TVA_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-1/3 flex flex-col justify-center gap-3 pr-4">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: TVA_COLORS[index % TVA_COLORS.length] }}
                />
                <span className="text-gray-600 font-medium">{entry.name}</span>
              </div>
              <span className="text-gray-800 font-bold">
                {totalTVA > 0 ? Math.round((entry.value / totalTVA) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
