import { useMemo } from 'react'
import { KPICards } from '@/components/dashboard/KPICards'
import { TimelineChart } from '@/components/dashboard/TimelineChart'
import { WeekRadarChart } from '@/components/dashboard/WeekRadarChart'
import { StatusStackedBar } from '@/components/dashboard/StatusStackedBar'
import { TVADonutChart } from '@/components/dashboard/TVADonutChart'
import { TopRankingChart } from '@/components/dashboard/TopRankingChart'
import { DashboardSkeleton } from '@/components/common/LoadingSkeleton'
import { generateMockDashboardData } from '@/services/mockData'
import { RefreshCw } from 'lucide-react'

export function Dashboard() {
  // In production, this would use TanStack Query
  const data = useMemo(() => generateMockDashboardData(), [])
  const isLoading = false

  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Transform data for charts
  const monthlyStatusData = useMemo(() => {
    const months = ['Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar']
    return months.map((name) => ({
      name,
      'Validé': Math.floor(Math.random() * 100) + 50,
      'En attente': Math.floor(Math.random() * 30) + 10,
      'Erreur': Math.floor(Math.random() * 15) + 2,
    }))
  }, [])

  const topFournisseurs = useMemo(() => {
    return data.by_fournisseur.slice(0, 5).map((f) => ({
      name: f.name,
      value: f.amount,
    }))
  }, [data])

  const topTemplates = useMemo(() => {
    return data.by_template.slice(0, 5).map((t) => ({
      name: t.name,
      value: t.success_rate,
    }))
  }, [data])

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tableau de Bord Analytique</h2>
          <p className="text-gray-500 text-sm">Vue à 360° des flux de facturation</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>30 derniers jours</option>
            <option>7 derniers jours</option>
            <option>Aujourd'hui</option>
            <option>Ce mois</option>
          </select>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards data={data} />

      {/* Row 1: Area Chart & Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-80">
        <div className="lg:col-span-2">
          <TimelineChart data={data.timeline} title="Évolution des Extractions" />
        </div>
        <WeekRadarChart data={data.by_day_of_week} />
      </div>

      {/* Row 2: Stacked Bar & Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-80">
        <StatusStackedBar data={monthlyStatusData} />
        <TVADonutChart data={data.by_tva} />
      </div>

      {/* Row 3: Top Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[350px]">
        <TopRankingChart
          data={topFournisseurs}
          title="Top Fournisseurs (par CA)"
          type="fournisseur"
          valueType="amount"
        />
        <TopRankingChart
          data={topTemplates}
          title="Performance Templates"
          type="template"
          valueType="percent"
        />
      </div>
    </div>
  )
}
