import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Calendar } from 'lucide-react'

interface WeekRadarChartProps {
  data: { day: string; count: number }[]
}

export function WeekRadarChart({ data }: WeekRadarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.count))

  const chartData = data.map((d) => ({
    subject: d.day,
    A: d.count,
    fullMark: maxValue,
  }))

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-purple-500" />
        Activité Hebdomadaire
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#E5E7EB" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#6B7280', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 'auto']}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Factures"
              dataKey="A"
              stroke="#8B5CF6"
              strokeWidth={2}
              fill="#8B5CF6"
              fillOpacity={0.4}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
