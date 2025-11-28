import { useMemo, useState } from 'react'
import {
  Puzzle,
  Plus,
  Upload,
  Eye,
  Pencil,
  Download,
  FlaskConical,
  Pause,
  Play,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateMockTemplates } from '@/services/mockData'
import type { Template } from '@/types'

export function AdminTemplateManager() {
  const [templates, setTemplates] = useState(() => generateMockTemplates())
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  const toggleActive = (name: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.name === name ? { ...t, is_active: !t.is_active } : t))
    )
  }

  const activeCount = templates.filter((t) => t.is_active).length
  const inactiveCount = templates.filter((t) => !t.is_active).length

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Puzzle className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-800">Gestion Templates</h2>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            {activeCount} actifs
          </span>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            {inactiveCount} inactifs
          </span>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition">
            <Upload className="w-4 h-4" />
            Import JSON
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            Nouveau
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="space-y-4">
        {templates.map((template) => (
          <div
            key={template.name}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Puzzle className="w-5 h-5 text-gray-400" />
                  <h3 className="font-bold text-gray-800">{template.name}</h3>
                  <span className="text-xs text-gray-400 font-mono">v{template.version}</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      template.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {template.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Colonnes</p>
                  <p className="text-lg font-semibold text-gray-800">{template.column_count}</p>
                </div>
                {template.usage_stats && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Extractions</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {template.usage_stats.total_extractions}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Succès</p>
                      <p
                        className={cn(
                          'text-lg font-semibold',
                          template.usage_stats.success_rate >= 90
                            ? 'text-green-600'
                            : template.usage_stats.success_rate >= 70
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        )}
                      >
                        {template.usage_stats.success_rate}%
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Confiance moy.</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {template.usage_stats.avg_confidence}%
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Detection Rules */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Headers requis:</p>
                <div className="flex flex-wrap gap-2">
                  {template.detection_rules.required_headers.map((h) => (
                    <span
                      key={h}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                  <Eye className="w-4 h-4" />
                  Voir
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-sm">
                  <FlaskConical className="w-4 h-4" />
                  Test
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => toggleActive(template.name)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition text-sm',
                    template.is_active
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  )}
                >
                  {template.is_active ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Activer
                    </>
                  )}
                </button>
                {!template.is_active && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
