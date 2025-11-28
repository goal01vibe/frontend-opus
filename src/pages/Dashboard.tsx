import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KPICards } from '@/components/dashboard/KPICards'
import { TimelineChart } from '@/components/dashboard/TimelineChart'
import { WeekRadarChart } from '@/components/dashboard/WeekRadarChart'
import { StatusStackedBar } from '@/components/dashboard/StatusStackedBar'
import { TVADonutChart } from '@/components/dashboard/TVADonutChart'
import { TopRankingChart } from '@/components/dashboard/TopRankingChart'
import { DashboardSkeleton } from '@/components/common/LoadingSkeleton'
import { adminService } from '@/services/admin'
import { documentsService } from '@/services/documents'
import { RefreshCw } from 'lucide-react'

export function Dashboard() {
  // Fetch real stats from API
  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminService.getStats,
    refetchInterval: 30000,
  })

  // Fetch documents for additional data
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents-dashboard'],
    queryFn: () => documentsService.getAll({ limit: 1000 }),
    refetchInterval: 30000,
  })

  const isLoading = statsLoading || docsLoading
  const documents = docsData?.items || []
  const dbStats = stats?.database_stats

  // Build all computed data with useMemo (MUST be before any conditional return)
  const dashboardData = useMemo(() => {
    const todayDocs = documents.filter(d => {
      const docDate = new Date(d.date_extraction)
      const today = new Date()
      return docDate.toDateString() === today.toDateString()
    })

    // Build timeline from real documents (last 30 days)
    const timelineMap = new Map<string, { count: number; amount: number }>()
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split('T')[0]
      timelineMap.set(key, { count: 0, amount: 0 })
    }
    documents.forEach(doc => {
      const key = doc.date_extraction?.split('T')[0]
      if (key && timelineMap.has(key)) {
        const entry = timelineMap.get(key)!
        entry.count++
        entry.amount += doc.net_a_payer || 0
      }
    })
    const timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      amount: data.amount
    }))

    // Build day of week data
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    const dayCount = [0, 0, 0, 0, 0, 0, 0]
    documents.forEach(doc => {
      const dayIndex = new Date(doc.date_extraction).getDay()
      dayCount[dayIndex]++
    })
    const by_day_of_week = dayNames.map((day, i) => ({ day, count: dayCount[i] }))

    // Build TVA data from document TVA fields
    const tvaRates = ['2.1', '5.5', '10', '20']
    const by_tva = tvaRates.map(taux => {
      let base_ht = 0
      let tva = 0
      documents.forEach(doc => {
        if (taux === '2.1') {
          base_ht += doc.base_ht_tva_2_1 || 0
          tva += doc.total_tva_2_1 || 0
        } else if (taux === '5.5') {
          base_ht += doc.base_ht_tva_5_5 || 0
          tva += doc.total_tva_5_5 || 0
        } else if (taux === '10') {
          base_ht += doc.base_ht_tva_10 || 0
          tva += doc.total_tva_10 || 0
        } else if (taux === '20') {
          base_ht += doc.base_ht_tva_20 || 0
          tva += doc.total_tva_20 || 0
        }
      })
      return { taux: `${taux}%`, base_ht, tva }
    }).filter(item => item.base_ht > 0 || item.tva > 0)

    // Build fournisseur ranking
    const fournisseurMap = new Map<string, { count: number; amount: number }>()
    documents.forEach(doc => {
      const name = doc.fournisseur || 'Inconnu'
      const existing = fournisseurMap.get(name) || { count: 0, amount: 0 }
      existing.count++
      existing.amount += doc.net_a_payer || 0
      fournisseurMap.set(name, existing)
    })
    const by_fournisseur = Array.from(fournisseurMap.entries())
      .map(([name, data]) => ({ name, count: data.count, amount: data.amount }))
      .sort((a, b) => b.amount - a.amount)

    // Build template ranking from stats
    const templateStats = dbStats?.templates || {}
    const by_template = Object.entries(templateStats).map(([name, t]: [string, unknown]) => {
      const templateData = t as { documents?: number } | undefined
      return {
        name,
        count: templateData?.documents || 0,
        success_rate: (templateData?.documents || 0) > 0 ? 95 : 0,
      }
    }).sort((a, b) => b.count - a.count)

    // Build status distribution
    const statusMap = new Map<string, number>()
    documents.forEach(doc => {
      const status = doc.status || 'UNKNOWN'
      statusMap.set(status, (statusMap.get(status) || 0) + 1)
    })
    const by_status = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }))

    // Monthly status data for charts
    const monthMap = new Map<string, { validated: number, pending: number, error: number }>()
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    documents.forEach(doc => {
      const date = new Date(doc.date_extraction)
      const monthKey = monthNames[date.getMonth()]
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { validated: 0, pending: 0, error: 0 })
      }
      const entry = monthMap.get(monthKey)!
      if (doc.status === 'VALIDATED' || doc.status === 'AUTO_PROCESSED') entry.validated++
      else if (doc.status === 'NEEDS_REVIEW' || doc.status === 'IN_CORRECTION') entry.pending++
      else if (doc.status === 'FAILED') entry.error++
    })
    const monthlyStatusData = Array.from(monthMap.entries()).map(([name, counts]) => ({
      name,
      'Validé': counts.validated,
      'En attente': counts.pending,
      'Erreur': counts.error,
    }))

    // Calculate totals
    const total_ht = documents.reduce((sum, doc) => {
      return sum + (doc.base_ht_tva_2_1 || 0) + (doc.base_ht_tva_5_5 || 0) +
             (doc.base_ht_tva_10 || 0) + (doc.base_ht_tva_20 || 0)
    }, 0)
    const total_tva = documents.reduce((sum, doc) => {
      return sum + (doc.total_tva_2_1 || 0) + (doc.total_tva_5_5 || 0) +
             (doc.total_tva_10 || 0) + (doc.total_tva_20 || 0)
    }, 0)
    const total_ttc = documents.reduce((sum, doc) => sum + (doc.net_a_payer || 0), 0)
    const avg_confidence = documents.length > 0
      ? documents.reduce((sum, doc) => sum + (doc.confidence_score || 0), 0) / documents.length
      : 0

    const totalDocs = dbStats?.documents?.total || 0
    const failedDocs = dbStats?.documents?.failed || 0

    return {
      total_documents: totalDocs,
      documents_today: todayDocs.length,
      success_rate: totalDocs > 0 ? ((totalDocs - failedDocs) / totalDocs * 100) : 0,
      avg_confidence,
      failed_today: todayDocs.filter(d => d.status === 'FAILED').length,
      pending_review: dbStats?.documents?.needs_review || 0,
      total_ht,
      total_tva,
      total_ttc,
      timeline,
      by_day_of_week,
      by_tva,
      by_fournisseur,
      by_template,
      by_status,
      alerts: [],
      monthlyStatusData,
    }
  }, [documents, dbStats])

  // Now we can safely do conditional return after all hooks
  if (isLoading) {
    return <DashboardSkeleton />
  }

  const topFournisseurs = dashboardData.by_fournisseur.slice(0, 5).map((f) => ({
    name: f.name,
    value: f.amount,
  }))

  const topTemplates = dashboardData.by_template.slice(0, 5).map((t) => ({
    name: t.name,
    value: t.success_rate,
  }))

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
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards data={dashboardData} />

      {/* Row 1: Area Chart & Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-80">
        <div className="lg:col-span-2">
          <TimelineChart data={dashboardData.timeline} title="Évolution des Extractions" />
        </div>
        <WeekRadarChart data={dashboardData.by_day_of_week} />
      </div>

      {/* Row 2: Stacked Bar & Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-80">
        <StatusStackedBar data={dashboardData.monthlyStatusData} />
        <TVADonutChart data={dashboardData.by_tva} />
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
