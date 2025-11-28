import { cn } from '@/lib/utils'
import type { FournisseurType } from '@/types'
import { useFilterStore } from '@/stores/filterStore'
import { Building2, FlaskConical } from 'lucide-react'

interface TypeTabsProps {
  counts?: { LABO: number; GROSSISTE: number }
}

export function TypeTabs({ counts }: TypeTabsProps) {
  const { activeType, setActiveType } = useFilterStore()

  const tabs = [
    {
      type: 'GROSSISTE' as FournisseurType,
      label: 'Grossiste',
      icon: Building2,
      count: counts?.GROSSISTE ?? 0,
    },
    {
      type: 'LABO' as FournisseurType,
      label: 'Labo',
      icon: FlaskConical,
      count: counts?.LABO ?? 0,
    },
  ]

  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.type}
          onClick={() => setActiveType(tab.type)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
            activeType === tab.type
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          )}
        >
          <tab.icon className="w-4 h-4" />
          <span>{tab.label}</span>
          {tab.count > 0 && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-semibold',
                activeType === tab.type
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-600'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
