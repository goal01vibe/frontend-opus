import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onFileSelect: (files: File[]) => void
  onExtract: (files: File[], options: ExtractOptions) => void
  isLoading?: boolean
  multiple?: boolean
}

interface ExtractOptions {
  template_name?: string
  min_confidence: number
}

export function UploadZone({
  onFileSelect,
  onExtract,
  isLoading = false,
  multiple = true,
}: UploadZoneProps) {
  const [files, setFiles] = useState<File[]>([])
  const [confidence, setConfidence] = useState(60)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFiles(acceptedFiles)
      onFileSelect(acceptedFiles)
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleExtract = () => {
    if (files.length === 0) return
    onExtract(files, { min_confidence: confidence })
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            'w-12 h-12 mx-auto mb-4',
            isDragActive ? 'text-blue-500' : 'text-gray-400'
          )}
        />
        <p className="text-lg font-medium text-gray-700 mb-1">
          {isDragActive ? 'Déposez les fichiers ici' : 'Glissez-déposez vos PDFs'}
        </p>
        <p className="text-sm text-gray-500">
          ou cliquez pour sélectionner des fichiers
        </p>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            {files.length} fichier(s) sélectionné(s)
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  <span className="text-xs text-gray-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      {files.length > 0 && (
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Confiance minimum: {confidence}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <button
            onClick={handleExtract}
            disabled={isLoading}
            className={cn(
              'px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2',
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extraction...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Extraire
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
