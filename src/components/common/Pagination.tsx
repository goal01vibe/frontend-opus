import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  perPage: number
  totalCount: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

export function Pagination({ page, perPage, totalCount, onPageChange, onPerPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const start = Math.min((page - 1) * perPage + 1, totalCount)
  const end = Math.min(page * perPage, totalCount)

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
      {/* Left: rows info */}
      <div className="text-sm text-gray-500">
        {totalCount > 0 ? (
          <>
            <span className="font-medium text-gray-700">{start}</span>
            {' - '}
            <span className="font-medium text-gray-700">{end}</span>
            {' sur '}
            <span className="font-medium text-gray-700">{totalCount.toLocaleString('fr-FR')}</span>
            {' documents'}
          </>
        ) : (
          'Aucun document'
        )}
      </div>

      {/* Center: page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Première page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 text-sm text-gray-700">
          Page <span className="font-medium">{page}</span> sur <span className="font-medium">{totalPages}</span>
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Dernière page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right: per page selector */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Par page :</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="px-2 py-1 bg-white border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  )
}
