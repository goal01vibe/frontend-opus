import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin'

interface ClearDatabaseDialogProps {
  open: boolean
  onClose: () => void
}

export function ClearDatabaseDialog({ open, onClose }: ClearDatabaseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const queryClient = useQueryClient()

  if (!open) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      const result = await adminService.clearDatabase()
      const documents = result?.deleted?.documents ?? 0
      const extractions = result?.deleted?.extractions ?? 0
      toast.success(`Base vidée : ${documents} documents et ${extractions} extractions supprimés`)
      queryClient.invalidateQueries()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={!isDeleting ? onClose : undefined} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Vider la base de données</h2>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Cette action supprimera <strong>tous les documents et extractions</strong>.
          Les IDs seront remis à zéro. Cette opération est <strong>irréversible</strong>.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Suppression...
              </>
            ) : (
              'Supprimer tout'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
