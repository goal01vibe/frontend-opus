import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { FileText, CheckCircle, Clock, Euro, TrendingUp, AlertTriangle } from 'lucide-react'
import type { DashboardData } from '@/types'

interface KPICardsProps {
  data: DashboardData
}

export function KPICards({ data }: KPICardsProps) {
  const cards = [
    {
      id: 'volume',
      label: 'Volumétrie',
      value: data.total_documents.toLocaleString('fr-FR'),
      subtext: `+${data.documents_today} aujourd'hui`,
      icon: FileText,
      color: 'blue',
      subtextColor: 'text-blue-600',
    },
    {
      id: 'success',
      label: 'Taux Succès',
      value: `${data.success_rate.toFixed(1)}%`,
      subtext: `${data.failed_today} échecs aujourd'hui`,
      icon: CheckCircle,
      color: 'green',
      subtextColor: data.failed_today > 0 ? 'text-red-500' : 'text-green-600',
    },
    {
      id: 'pending',
      label: 'À Valider',
      value: data.pending_review.toString(),
      subtext: 'Actions requises',
      icon: Clock,
      color: 'yellow',
      subtextColor: 'text-yellow-600',
    },
    {
      id: 'amount',
      label: 'CA Total (TTC)',
      value: formatCurrency(data.total_ttc),
      subtext: `HT: ${formatCurrency(data.total_ht)}`,
      icon: Euro,
      color: 'indigo',
      subtextColor: 'text-gray-500',
    },
  ]

  const colorClasses: Record<string, { bg: string; text: string; border: string; hover: string }> = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'hover:border-blue-300',
      hover: 'group-hover:bg-blue-600 group-hover:text-white',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      border: 'hover:border-green-300',
      hover: 'group-hover:bg-green-600 group-hover:text-white',
    },
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      border: 'hover:border-yellow-300',
      hover: 'group-hover:bg-yellow-500 group-hover:text-white',
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'hover:border-indigo-300',
      hover: 'group-hover:bg-indigo-600 group-hover:text-white',
    },
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const colors = colorClasses[card.color]
        return (
          <div
            key={card.id}
            className={cn(
              'bg-white p-5 rounded-xl border border-gray-200 shadow-sm',
              'flex items-center justify-between group transition-colors',
              colors.border
            )}
          >
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
              <p className={cn('text-xs mt-1', card.subtextColor)}>{card.subtext}</p>
            </div>
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                colors.bg,
                colors.text,
                colors.hover
              )}
            >
              <card.icon className="w-5 h-5" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
