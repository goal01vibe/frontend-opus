import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  score: number
  showLabel?: boolean
}

export function ConfidenceBadge({ score, showLabel = false }: ConfidenceBadgeProps) {
  const getColor = () => {
    if (score >= 90) return 'bg-green-100 text-green-700 border-green-200'
    if (score >= 70) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  const getBarColor = () => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', getBarColor())}
            style={{ width: `${score}%` }}
          />
        </div>
        <span
          className={cn(
            'px-1.5 py-0.5 rounded text-xs font-semibold border',
            getColor()
          )}
        >
          {score}%
        </span>
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500">
          {score >= 90 ? 'Excellent' : score >= 70 ? 'Bon' : 'Faible'}
        </span>
      )}
    </div>
  )
}
