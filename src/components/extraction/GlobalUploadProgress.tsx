// src/components/extraction/GlobalUploadProgress.tsx
import { X } from 'lucide-react'

interface GlobalUploadProgressProps {
  totalFiles: number
  completedFiles: number
  failedFiles: number
  totalChunks: number
  chunksUploaded: number
  onCancel: () => void
}

export function GlobalUploadProgress({
  totalFiles,
  completedFiles,
  failedFiles,
  totalChunks,
  chunksUploaded,
  onCancel,
}: GlobalUploadProgressProps) {
  const processedFiles = completedFiles + failedFiles
  const percent = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0

  return (
    <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blue-800">
          Extraction en cours
        </span>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-blue-200 rounded text-blue-600 hover:text-red-600 transition-colors"
          title="Annuler"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-blue-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-300 flex"
        >
          {/* Green = completed */}
          {completedFiles > 0 && (
            <div
              className="h-full bg-green-500"
              style={{ width: `${(completedFiles / totalFiles) * 100}%` }}
            />
          )}
          {/* Red = failed */}
          {failedFiles > 0 && (
            <div
              className="h-full bg-red-400"
              style={{ width: `${(failedFiles / totalFiles) * 100}%` }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-blue-700">
        <span>
          {processedFiles} / {totalFiles} fichiers traites ({percent}%)
        </span>
        <span>
          Lot {Math.min(chunksUploaded + 1, totalChunks)} / {totalChunks} en upload
        </span>
      </div>
    </div>
  )
}
