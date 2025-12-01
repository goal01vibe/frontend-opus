import { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, FileText, Loader2, AlertTriangle, CheckCircle, XCircle, RotateCcw, Trash2, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExtractionStore } from '@/stores/extractionStore'
import { extractionsService } from '@/services/extractions'
import { useAdminStream, type BatchProgressEvent } from '@/hooks/useAdminStream'
import { ErrorBadge } from './ErrorDisplay'
import { ProgressSummary } from './LiveMetrics'
import type { FileStatus, ExtractionErrorCode } from '@/types'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

interface LocalFileStatus extends Omit<FileStatus, 'file'> {
  file: File
}

export function ExtractionModal() {
  const { isUploadModalOpen, closeUploadModal, addBatch, removeBatch, incrementBatchCompleted, incrementBatchFailed, incrementCompleted, incrementFailed, incrementPartial } = useExtractionStore()
  const [files, setFiles] = useState<LocalFileStatus[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [confidence, setConfidence] = useState(60)
  const currentBatchIdRef = useRef<string | null>(null)

  // Utiliser le stream admin global (connexion permanente)
  const { isConnected, onBatchProgress } = useAdminStream({
    onBatchProgress: useCallback((data: BatchProgressEvent) => {
      // Ne traiter que les événements du batch actuel
      if (!currentBatchIdRef.current || data.batch_id !== currentBatchIdRef.current) {
        return
      }

      switch (data.type) {
        case 'file_start':
          setFiles((prev) =>
            prev.map((f) =>
              f.filename === data.filename
                ? { ...f, status: 'processing' as const, progress: 50 }
                : f
            )
          )
          break

        case 'file_complete':
          setFiles((prev) =>
            prev.map((f) =>
              f.filename === data.filename
                ? { ...f, status: 'complete' as const, progress: 100, documentId: data.document_id }
                : f
            )
          )
          // Mettre à jour le batch dans le store (pour FloatingExtractionModule)
          if (data.batch_id) {
            incrementBatchCompleted(data.batch_id)
          }
          incrementCompleted()
          break

        case 'file_warning':
          setFiles((prev) =>
            prev.map((f) =>
              f.filename === data.filename
                ? {
                    ...f,
                    status: 'partial' as const,
                    progress: 100,
                    documentId: data.document_id,
                    error: {
                      code: 'WARNING_PARTIAL' as const,
                      message: data.message || 'Extraction nécessite vérification',
                      recoverable: true,
                    },
                  }
                : f
            )
          )
          incrementPartial()
          break

        case 'file_error':
          setFiles((prev) =>
            prev.map((f) =>
              f.filename === data.filename
                ? {
                    ...f,
                    status: 'failed' as const,
                    error: {
                      code: (data.error_type || 'ERROR_UNKNOWN') as ExtractionErrorCode,
                      message: data.error || 'Erreur inconnue',
                      recoverable: true,
                    },
                  }
                : f
            )
          )
          // Mettre à jour le batch dans le store
          if (data.batch_id) {
            incrementBatchFailed(data.batch_id)
          }
          incrementFailed()
          break

        case 'batch_complete':
          console.log('Batch terminé:', data)
          // Retirer le batch de la liste des actifs
          if (data.batch_id) {
            removeBatch(data.batch_id)
          }
          currentBatchIdRef.current = null
          setIsUploading(false)
          break
      }
    }, [incrementCompleted, incrementFailed, incrementPartial, incrementBatchCompleted, incrementBatchFailed, removeBatch]),
  })

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Process accepted files
    const newFiles: LocalFileStatus[] = acceptedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      filename: file.name,
      size: file.size,
      status: 'pending' as const,
      progress: 0,
    }))

    // Process rejected files with error info
    const rejectedFilesWithErrors: LocalFileStatus[] = rejectedFiles.map(({ file, errors }) => {
      let errorCode: ExtractionErrorCode = 'ERROR_UNKNOWN'
      let message = 'Fichier rejeté'

      if (errors.some((e: any) => e.code === 'file-too-large')) {
        errorCode = 'ERROR_TOO_LARGE'
        message = `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
      } else if (errors.some((e: any) => e.code === 'file-invalid-type')) {
        errorCode = 'ERROR_CORRUPT'
        message = 'Format non supporté (PDF uniquement)'
      }

      return {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        filename: file.name,
        size: file.size,
        status: 'failed' as const,
        progress: 0,
        error: {
          code: errorCode,
          message,
          recoverable: false,
        },
      }
    })

    setFiles((prev) => [...prev, ...newFiles, ...rejectedFilesWithErrors])
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  })

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const clearAllFiles = () => {
    setFiles([])
  }

  const retryFile = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: 'pending' as const, progress: 0, error: undefined } : f
      )
    )
  }

  const retryAllFailed = () => {
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'failed' && f.error?.recoverable !== false
          ? { ...f, status: 'pending' as const, progress: 0, error: undefined }
          : f
      )
    )
  }

  const pendingFiles = useMemo(() => files.filter((f) => f.status === 'pending'), [files])
  const completedFiles = useMemo(() => files.filter((f) => f.status === 'complete'), [files])
  const failedFiles = useMemo(() => files.filter((f) => f.status === 'failed'), [files])
  const partialFiles = useMemo(() => files.filter((f) => f.status === 'partial'), [files])
  const processingFiles = useMemo(
    () => files.filter((f) => f.status === 'uploading' || f.status === 'processing'),
    [files]
  )

  // Cleanup on modal close
  const handleClose = useCallback(() => {
    currentBatchIdRef.current = null
    closeUploadModal()
  }, [closeUploadModal])

  const handleExtract = async () => {
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    // Mark all pending as uploading
    setFiles((prev) =>
      prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' as const } : f))
    )

    try {
      const filesToUpload = pendingFiles.map((f) => f.file)

      // Call batch extraction API
      const result = await extractionsService.extractBatch(filesToUpload, {
        template: undefined, // Auto-detect
      })

      // Stocker le batch_id pour filtrer les événements SSE
      currentBatchIdRef.current = result.batch_id

      // Create batch in store
      addBatch({
        batch_id: result.batch_id,
        total_files: filesToUpload.length,
        completed: 0,
        failed: 0,
        workers_active: 0,
        started_at: new Date().toISOString(),
      })

      // Update file statuses to processing
      setFiles((prev) =>
        prev.map((f) => (f.status === 'uploading' ? { ...f, status: 'processing' as const } : f))
      )

      // Les événements SSE seront reçus via useAdminStream (connexion permanente)
      console.log('Batch lancé:', result.batch_id, '- En attente des événements SSE...')

    } catch (error) {
      // Mark all uploading files as failed
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading' || f.status === 'processing'
            ? {
                ...f,
                status: 'failed' as const,
                error: {
                  code: 'ERROR_NETWORK' as const,
                  message: 'Erreur de connexion au serveur',
                  recoverable: true,
                },
              }
            : f
        )
      )
      setIsUploading(false)
      currentBatchIdRef.current = null
    }
  }

  const getStatusIcon = (status: LocalFileStatus['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="w-4 h-4 text-gray-400" />
      case 'validating':
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isUploadModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Nouvelle extraction</h2>
            {/* Connection indicator - toujours visible */}
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
              isConnected ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
            )}>
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  Connecté
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Déconnecté
                </>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
              isDragActive && isDragAccept && 'border-green-500 bg-green-50',
              isDragActive && isDragReject && 'border-red-500 bg-red-50',
              !isDragActive && 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            )}
          >
            <input {...getInputProps()} />
            <Upload
              className={cn(
                'w-12 h-12 mx-auto mb-4 pointer-events-none',
                isDragAccept && 'text-green-500',
                isDragReject && 'text-red-500',
                !isDragActive && 'text-gray-400'
              )}
            />
            {isDragAccept && <p className="text-lg font-medium text-green-600">Fichiers acceptés</p>}
            {isDragReject && <p className="text-lg font-medium text-red-600">Certains fichiers seront rejetés</p>}
            {!isDragActive && (
              <>
                <p className="text-lg font-medium text-gray-700 mb-1">Glissez-déposez vos PDFs</p>
                <p className="text-sm text-gray-500">ou cliquez pour sélectionner (max 50MB par fichier)</p>
              </>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  {files.length} fichier(s) sélectionné(s)
                </h3>
                <button
                  onClick={clearAllFiles}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Tout supprimer
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      file.status === 'failed' && 'bg-red-50',
                      file.status === 'complete' && 'bg-green-50',
                      file.status === 'partial' && 'bg-orange-50',
                      (file.status === 'pending' || file.status === 'uploading' || file.status === 'processing') &&
                        'bg-gray-50'
                    )}
                  >
                    {getStatusIcon(file.status)}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.filename}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                        {file.error && (
                          <ErrorBadge code={file.error.code} />
                        )}
                        {file.documentId && (
                          <span className="text-xs text-green-600">ID: {file.documentId}</span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {(file.status === 'uploading' || file.status === 'processing') && (
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {file.status === 'failed' && file.error?.recoverable !== false && (
                        <button
                          onClick={() => retryFile(file.id)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-blue-600"
                          title="Réessayer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      {file.status !== 'uploading' && file.status !== 'processing' && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-red-600"
                          title="Supprimer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Summary Bar */}
              {isUploading && files.length > 0 && (
                <ProgressSummary
                  total={files.length}
                  completed={completedFiles.length}
                  failed={failedFiles.length}
                  partial={partialFiles.length}
                />
              )}

              {/* Summary counts when not uploading */}
              {!isUploading && (
                <div className="flex items-center gap-4 text-sm">
                  {completedFiles.length > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      {completedFiles.length} réussi(s)
                    </span>
                  )}
                  {partialFiles.length > 0 && (
                    <span className="flex items-center gap-1 text-orange-500">
                      <AlertTriangle className="w-4 h-4" />
                      {partialFiles.length} partiel(s)
                    </span>
                  )}
                  {failedFiles.length > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="w-4 h-4" />
                      {failedFiles.length} échoué(s)
                    </span>
                  )}
                  {processingFiles.length > 0 && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {processingFiles.length} en cours
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Options */}
          {pendingFiles.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Confiance minimum: {confidence}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-gray-500 mt-2">
                Les extractions en dessous de ce seuil seront marquées pour vérification
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <div>
            {failedFiles.filter((f) => f.error?.recoverable !== false).length > 0 && (
              <button
                onClick={retryAllFailed}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Réessayer les échecs
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handleExtract}
              disabled={pendingFiles.length === 0 || isUploading || !isConnected}
              className={cn(
                'px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors',
                pendingFiles.length > 0 && !isUploading && isConnected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extraction en cours...
                </>
              ) : !isConnected ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  Reconnexion...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Extraire ({pendingFiles.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
