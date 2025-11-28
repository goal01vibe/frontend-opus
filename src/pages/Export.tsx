import { useState } from 'react'
import { FileDown, FileSpreadsheet, FileJson, Calendar, Filter, Download } from 'lucide-react'

export function Export() {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'json'>('xlsx')
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('30days')
  const [includeDetails, setIncludeDetails] = useState(true)

  const formats = [
    { id: 'csv', label: 'CSV', icon: FileDown, description: 'Fichier texte séparé par virgules' },
    {
      id: 'xlsx',
      label: 'Excel',
      icon: FileSpreadsheet,
      description: 'Microsoft Excel (.xlsx)',
    },
    { id: 'json', label: 'JSON', icon: FileJson, description: 'JavaScript Object Notation' },
  ]

  const ranges = [
    { id: 'today', label: "Aujourd'hui" },
    { id: '7days', label: '7 derniers jours' },
    { id: '30days', label: '30 derniers jours' },
    { id: 'all', label: 'Tout' },
  ]

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileDown className="w-6 h-6 text-gray-700" />
        <h2 className="text-xl font-bold text-gray-800">Export des Données</h2>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Format Selection */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-gray-500" />
            Format d'export
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {formats.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id as any)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  format === f.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <f.icon
                  className={`w-6 h-6 mb-2 ${format === f.id ? 'text-blue-600' : 'text-gray-400'}`}
                />
                <p
                  className={`font-medium ${format === f.id ? 'text-blue-700' : 'text-gray-700'}`}
                >
                  {f.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{f.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Période
          </h3>
          <div className="flex flex-wrap gap-2">
            {ranges.map((r) => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id as any)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  dateRange === r.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            Options
          </h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDetails}
              onChange={(e) => setIncludeDetails(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="font-medium text-gray-700">Inclure les lignes de détail</p>
              <p className="text-sm text-gray-500">
                Exporte toutes les lignes d'extraction pour chaque facture
              </p>
            </div>
          </label>
        </div>

        {/* Export Button */}
        <button className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold text-lg shadow-lg shadow-blue-200">
          <Download className="w-6 h-6" />
          Exporter les données
        </button>

        {/* Info */}
        <p className="text-center text-sm text-gray-500">
          L'export sera généré côté serveur. Le téléchargement démarrera automatiquement.
        </p>
      </div>
    </div>
  )
}
