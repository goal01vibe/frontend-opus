import { useMemo } from 'react'
import { BarChart3, Zap, Clock, CheckCircle, AlertTriangle, Server } from 'lucide-react'
import { TimelineChart } from '@/components/dashboard/TimelineChart'
import { TopRankingChart } from '@/components/dashboard/TopRankingChart'
import { cn } from '@/lib/utils'

export function AdminMetrics() {
  // Mock metrics data
  const metrics = useMemo(
    () => ({
      extractions_per_hour: 156,
      avg_extraction_time_ms: 2340,
      success_rate_24h: 97.8,
      queue_depth: 12,
      cpu_usage: 45,
      memory_usage: 72,
      disk_usage: 58,
    }),
    []
  )

  const hourlyData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = new Date()
      hour.setHours(hour.getHours() - (23 - i))
      return {
        date: hour.toISOString(),
        count: Math.floor(Math.random() * 200) + 50,
        amount: Math.floor(Math.random() * 50000) + 10000,
      }
    })
  }, [])

  const templatePerformance = useMemo(
    () => [
      { name: 'ocp_v2', value: 97.8 },
      { name: 'cdp_v1', value: 94.2 },
      { name: 'alliance_v1', value: 91.5 },
      { name: 'cerp_v1', value: 89.3 },
      { name: 'labo_generic', value: 85.0 },
    ],
    []
  )

  const getBarColor = (value: number, thresholds: [number, number] = [70, 90]) => {
    if (value < thresholds[0]) return 'bg-green-500'
    if (value < thresholds[1]) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-gray-700" />
        <h2 className="text-xl font-bold text-gray-800">Métriques Système</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold">Extract/heure</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{metrics.extractions_per_hour}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold">Temps moyen</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {(metrics.avg_extraction_time_ms / 1000).toFixed(1)}s
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold">Succès (24h)</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{metrics.success_rate_24h}%</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold">En attente</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{metrics.queue_depth}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-80">
        <TimelineChart data={hourlyData} title="Extractions par heure (24h)" />
        <TopRankingChart
          data={templatePerformance}
          title="Performance Templates"
          type="template"
          valueType="percent"
        />
      </div>

      {/* System Resources */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Server className="w-5 h-5 text-gray-700" />
          <h3 className="font-bold text-gray-800">Ressources Système</h3>
        </div>

        <div className="space-y-4">
          {/* CPU */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">CPU</span>
              <span className="text-sm font-semibold text-gray-800">{metrics.cpu_usage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', getBarColor(metrics.cpu_usage))}
                style={{ width: `${metrics.cpu_usage}%` }}
              />
            </div>
          </div>

          {/* Memory */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Mémoire (RAM)</span>
              <span className="text-sm font-semibold text-gray-800">{metrics.memory_usage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  getBarColor(metrics.memory_usage)
                )}
                style={{ width: `${metrics.memory_usage}%` }}
              />
            </div>
          </div>

          {/* Disk */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Disque</span>
              <span className="text-sm font-semibold text-gray-800">{metrics.disk_usage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  getBarColor(metrics.disk_usage)
                )}
                style={{ width: `${metrics.disk_usage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
