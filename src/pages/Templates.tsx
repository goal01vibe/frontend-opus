import { useQuery } from '@tanstack/react-query'
import { Puzzle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { templatesService } from '@/services/templates'

export function Templates() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesService.getAll,
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Chargement des templates...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Puzzle className="w-6 h-6 text-gray-700" />
        <h2 className="text-xl font-bold text-gray-800">Templates Disponibles</h2>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          {templates.length} templates
        </span>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.name}
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{template.name}</h3>
                    <span className="text-xs text-gray-400 font-mono">v{template.version}</span>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>

              {/* Stats */}
              {template.usage_stats && (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-500">Extractions</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {template.usage_stats.total_extractions}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-500">Succès</p>
                    <p
                      className={cn(
                        'text-lg font-semibold',
                        template.usage_stats.success_rate >= 90
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      )}
                    >
                      {template.usage_stats.success_rate}%
                    </p>
                  </div>
                </div>
              )}

              {/* Headers / Detection Rules */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Règles de détection:</p>
                <div className="flex flex-wrap gap-1">
                  {(template.detection_rules?.required_headers || template.detection_rules?.required_text || []).slice(0, 4).map((h: string) => (
                    <span
                      key={h}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {h}
                    </span>
                  ))}
                  {(template.detection_rules?.required_headers || template.detection_rules?.required_text || []).length > 4 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-xs">
                      +{(template.detection_rules?.required_headers || template.detection_rules?.required_text || []).length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
