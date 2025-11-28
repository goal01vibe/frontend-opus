export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const GROSSISTES = ['OCP', 'CDP', 'ALLIANCE', 'CERP', 'PHOENIX'] as const

export const TVA_RATES = [2.1, 5.5, 10, 20] as const

export const DOCUMENT_STATUSES = [
  'AUTO_PROCESSED',
  'NEEDS_REVIEW',
  'IN_CORRECTION',
  'VALIDATED',
  'FAILED'
] as const

export const COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6',
}

export const CHART_COLORS = [
  COLORS.blue,
  COLORS.green,
  COLORS.yellow,
  COLORS.red,
  COLORS.purple,
  COLORS.pink,
  COLORS.indigo,
]

export const TVA_COLORS = ['#60A5FA', '#34D399', '#F472B6', '#A78BFA']

export const STATUS_COLORS = {
  'AUTO_PROCESSED': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'NEEDS_REVIEW': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  'IN_CORRECTION': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  'VALIDATED': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  'FAILED': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
}
