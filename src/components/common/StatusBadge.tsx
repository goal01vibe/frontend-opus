import { cn } from '@/lib/utils'
import type { DocumentStatus } from '@/types'
import { CheckCircle, Clock, AlertTriangle, XCircle, Loader2 } from 'lucide-react'

interface StatusBadgeProps {
  status: DocumentStatus | string
  size?: 'sm' | 'md'
}

const statusConfig: Record<string, {
  label: string
  icon: React.ElementType
  colors: string
}> = {
  AUTO_PROCESSED: {
    label: 'Auto',
    icon: Loader2,
    colors: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  NEEDS_REVIEW: {
    label: 'À valider',
    icon: Clock,
    colors: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  IN_CORRECTION: {
    label: 'En correction',
    icon: AlertTriangle,
    colors: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  VALIDATED: {
    label: 'Validé',
    icon: CheckCircle,
    colors: 'bg-green-100 text-green-800 border-green-200',
  },
  FAILED: {
    label: 'Erreur',
    icon: XCircle,
    colors: 'bg-red-100 text-red-800 border-red-200',
  },
  // Aliases
  'Validé': {
    label: 'Validé',
    icon: CheckCircle,
    colors: 'bg-green-100 text-green-800 border-green-200',
  },
  'En attente': {
    label: 'En attente',
    icon: Clock,
    colors: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  'Erreur': {
    label: 'Erreur',
    icon: XCircle,
    colors: 'bg-red-100 text-red-800 border-red-200',
  },
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    icon: Clock,
    colors: 'bg-gray-100 text-gray-800 border-gray-200',
  }

  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.colors,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      {config.label}
    </span>
  )
}
