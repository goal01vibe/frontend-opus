import { Zap, CheckCircle, Clock, Users, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LiveMetrics as LiveMetricsType } from '@/types'

interface LiveMetricsProps {
  metrics: LiveMetricsType
  className?: string
  compact?: boolean
}

interface MetricCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color: 'blue' | 'green' | 'orange' | 'purple' | 'gray'
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-500',
    text: 'text-blue-700',
    trend: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-500',
    text: 'text-green-700',
    trend: 'text-green-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-500',
    text: 'text-orange-700',
    trend: 'text-orange-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-500',
    text: 'text-purple-700',
    trend: 'text-purple-600',
  },
  gray: {
    bg: 'bg-gray-50',
    icon: 'text-gray-500',
    text: 'text-gray-700',
    trend: 'text-gray-600',
  },
}

function MetricCard({ label, value, icon, trend, trendValue, color }: MetricCardProps) {
  const colors = colorClasses[color]

  return (
    <div className={cn('rounded-lg p-3', colors.bg)}>
      <div className="flex items-center gap-2 mb-1">
        <span className={colors.icon}>{icon}</span>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className={cn('text-xl font-bold', colors.text)}>{value}</span>
        {trend && trendValue && (
          <span className={cn('flex items-center text-xs', colors.trend)}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3 mr-0.5" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-3 h-3 mr-0.5" />
            ) : null}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '--:--'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.ceil(seconds % 60)
    return `${mins}m ${secs}s`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.ceil((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

export function LiveMetrics({ metrics, className, compact = false }: LiveMetricsProps) {
  const successRateColor = metrics.successRate >= 90 ? 'green' : metrics.successRate >= 70 ? 'orange' : 'gray'

  if (compact) {
    return (
      <div className={cn('flex items-center gap-4 text-sm', className)}>
        <div className="flex items-center gap-1.5 text-blue-600">
          <Zap className="w-4 h-4" />
          <span className="font-medium">{metrics.docsPerSecond.toFixed(1)}/s</span>
        </div>
        <div className={cn(
          'flex items-center gap-1.5',
          successRateColor === 'green' ? 'text-green-600' :
          successRateColor === 'orange' ? 'text-orange-600' : 'text-gray-600'
        )}>
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">{metrics.successRate.toFixed(0)}%</span>
        </div>
        {metrics.estimatedTimeRemaining > 0 && (
          <div className="flex items-center gap-1.5 text-purple-600">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{formatTime(metrics.estimatedTimeRemaining)}</span>
          </div>
        )}
        {metrics.activeWorkers > 0 && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <Users className="w-4 h-4" />
            <span className="font-medium">{metrics.activeWorkers}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3', className)}>
      <MetricCard
        label="Vitesse"
        value={`${metrics.docsPerSecond.toFixed(1)}/s`}
        icon={<Zap className="w-4 h-4" />}
        color="blue"
      />
      <MetricCard
        label="Taux de succès"
        value={`${metrics.successRate.toFixed(0)}%`}
        icon={<CheckCircle className="w-4 h-4" />}
        color={successRateColor}
        trend={metrics.successRate >= 90 ? 'up' : metrics.successRate < 70 ? 'down' : 'neutral'}
      />
      <MetricCard
        label="Temps restant"
        value={formatTime(metrics.estimatedTimeRemaining)}
        icon={<Clock className="w-4 h-4" />}
        color="purple"
      />
      <MetricCard
        label="Workers actifs"
        value={metrics.activeWorkers}
        icon={<Users className="w-4 h-4" />}
        color="gray"
      />
    </div>
  )
}

/**
 * Mini metrics bar for header/floating display
 */
export function MetricsBar({ metrics, className }: { metrics: LiveMetricsType; className?: string }) {
  if (!metrics || (metrics.totalProcessed === 0 && metrics.activeWorkers === 0)) {
    return null
  }

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg text-xs',
      className
    )}>
      <div className="flex items-center gap-1 text-blue-600">
        <Zap className="w-3 h-3" />
        <span className="font-medium">{metrics.docsPerSecond.toFixed(1)}/s</span>
      </div>

      <div className="w-px h-4 bg-gray-200" />

      <div className="flex items-center gap-1.5">
        <span className="text-green-600 font-medium">{metrics.totalProcessed}</span>
        <span className="text-gray-400">/</span>
        <span className="text-red-500 font-medium">{metrics.totalFailed}</span>
      </div>

      {metrics.activeWorkers > 0 && (
        <>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-gray-500">
            <Users className="w-3 h-3" />
            <span>{metrics.activeWorkers}</span>
          </div>
        </>
      )}

      {metrics.estimatedTimeRemaining > 0 && (
        <>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-purple-600">
            <Clock className="w-3 h-3" />
            <span>{formatTime(metrics.estimatedTimeRemaining)}</span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Progress summary with metrics
 */
export function ProgressSummary({
  total,
  completed,
  failed,
  partial,
  className,
}: {
  total: number
  completed: number
  failed: number
  partial: number
  className?: string
}) {
  const progress = total > 0 ? ((completed + failed + partial) / total) * 100 : 0

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full flex"
          style={{ width: `${progress}%` }}
        >
          <div
            className="bg-green-500 transition-all duration-300"
            style={{ width: `${completed > 0 ? (completed / (completed + failed + partial)) * 100 : 0}%` }}
          />
          <div
            className="bg-orange-400 transition-all duration-300"
            style={{ width: `${partial > 0 ? (partial / (completed + failed + partial)) * 100 : 0}%` }}
          />
          <div
            className="bg-red-500 transition-all duration-300"
            style={{ width: `${failed > 0 ? (failed / (completed + failed + partial)) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {completed + failed + partial} / {total} traités
        </span>
        <div className="flex items-center gap-3">
          <span className="text-green-600 font-medium">{completed} OK</span>
          {partial > 0 && <span className="text-orange-500 font-medium">{partial} partiels</span>}
          {failed > 0 && <span className="text-red-500 font-medium">{failed} erreurs</span>}
        </div>
      </div>
    </div>
  )
}
