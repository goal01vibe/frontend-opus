import { AlertTriangle, XCircle, FileQuestion, Lock, WifiOff, Scan, HelpCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExtractionError, ExtractionErrorCode } from '@/types'

interface ErrorDisplayProps {
  error: ExtractionError
  onRetry?: () => void
  compact?: boolean
  className?: string
}

interface ErrorConfig {
  icon: React.ReactNode
  bgColor: string
  borderColor: string
  textColor: string
  iconColor: string
}

const ERROR_CONFIGS: Record<ExtractionErrorCode, ErrorConfig> = {
  ERROR_CORRUPT: {
    icon: <XCircle className="w-5 h-5" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
  },
  ERROR_ENCRYPTED: {
    icon: <Lock className="w-5 h-5" />,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    iconColor: 'text-amber-500',
  },
  ERROR_SCANNED: {
    icon: <Scan className="w-5 h-5" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    iconColor: 'text-purple-500',
  },
  ERROR_TOO_LARGE: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-500',
  },
  WARNING_NO_TEMPLATE: {
    icon: <FileQuestion className="w-5 h-5" />,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
  },
  WARNING_PARTIAL: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-500',
  },
  ERROR_NETWORK: {
    icon: <WifiOff className="w-5 h-5" />,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-500',
  },
  ERROR_UNKNOWN: {
    icon: <HelpCircle className="w-5 h-5" />,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-500',
  },
}

const ERROR_LABELS: Record<ExtractionErrorCode, string> = {
  ERROR_CORRUPT: 'Fichier corrompu',
  ERROR_ENCRYPTED: 'PDF protégé',
  ERROR_SCANNED: 'PDF scanné',
  ERROR_TOO_LARGE: 'Fichier trop volumineux',
  WARNING_NO_TEMPLATE: 'Template non détecté',
  WARNING_PARTIAL: 'Extraction partielle',
  ERROR_NETWORK: 'Erreur réseau',
  ERROR_UNKNOWN: 'Erreur inconnue',
}

export function ErrorDisplay({ error, onRetry, compact = false, className }: ErrorDisplayProps) {
  const config = ERROR_CONFIGS[error.code] || ERROR_CONFIGS.ERROR_UNKNOWN
  const label = ERROR_LABELS[error.code] || 'Erreur'

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          config.bgColor,
          config.textColor,
          className
        )}
      >
        <span className={config.iconColor}>
          {config.icon}
        </span>
        <span>{label}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn('text-sm font-semibold', config.textColor)}>
            {label}
          </h4>
          <p className={cn('mt-1 text-sm', config.textColor, 'opacity-90')}>
            {error.message}
          </p>
          {error.suggestion && (
            <p className={cn('mt-2 text-xs', config.textColor, 'opacity-75')}>
              <strong>Solution:</strong> {error.suggestion}
            </p>
          )}

          {/* Retry button for recoverable errors */}
          {error.recoverable && onRetry && (
            <button
              onClick={onRetry}
              className={cn(
                'mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
                'bg-white border shadow-sm hover:bg-gray-50 transition-colors',
                config.borderColor,
                config.textColor
              )}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline error badge for use in lists
 */
export function ErrorBadge({ code }: { code: ExtractionErrorCode }) {
  const config = ERROR_CONFIGS[code] || ERROR_CONFIGS.ERROR_UNKNOWN
  const label = ERROR_LABELS[code] || 'Erreur'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
        config.bgColor,
        config.textColor
      )}
    >
      <span className={cn('w-3 h-3', config.iconColor)}>
        {config.icon}
      </span>
      {label}
    </span>
  )
}

/**
 * Get error severity for sorting/filtering
 */
export function getErrorSeverity(code: ExtractionErrorCode): 'error' | 'warning' | 'info' {
  switch (code) {
    case 'ERROR_CORRUPT':
    case 'ERROR_ENCRYPTED':
    case 'ERROR_SCANNED':
    case 'ERROR_TOO_LARGE':
    case 'ERROR_NETWORK':
    case 'ERROR_UNKNOWN':
      return 'error'
    case 'WARNING_NO_TEMPLATE':
    case 'WARNING_PARTIAL':
      return 'warning'
    default:
      return 'info'
  }
}

/**
 * Check if an error is recoverable (can be retried)
 */
export function isRecoverableError(code: ExtractionErrorCode): boolean {
  switch (code) {
    case 'ERROR_NETWORK':
    case 'WARNING_NO_TEMPLATE':
    case 'WARNING_PARTIAL':
      return true
    case 'ERROR_CORRUPT':
    case 'ERROR_ENCRYPTED':
    case 'ERROR_SCANNED':
    case 'ERROR_TOO_LARGE':
    case 'ERROR_UNKNOWN':
      return false
    default:
      return false
  }
}
