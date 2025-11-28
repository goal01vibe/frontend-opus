import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { formatFullCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge'
import { useUIStore } from '@/stores/uiStore'
import type { Document } from '@/types'
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'

interface ExtractionsTableProps {
  data: Document[]
  isLoading?: boolean
}

export function ExtractionsTable({ data, isLoading }: ExtractionsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const { openDrawer, selectedId } = useUIStore()

  // Group documents by ID for alternating colors
  const documentGroups = useMemo(() => {
    const groups = new Set<number>()
    data.forEach((doc) => groups.add(doc.id))
    return Array.from(groups)
  }, [data])

  const getRowColor = (documentId: number): string => {
    const groupIndex = documentGroups.indexOf(documentId)
    return groupIndex % 2 === 0 ? 'bg-slate-50' : 'bg-slate-100'
  }

  const columns: ColumnDef<Document>[] = useMemo(
    () => [
      {
        accessorKey: 'status',
        header: 'Statut',
        size: 120,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'date_document',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        ),
        cell: ({ getValue }) => formatDate(getValue() as string),
        size: 100,
      },
      {
        accessorKey: 'numero_facture',
        header: 'N° Facture',
        size: 130,
        cell: ({ getValue }) => (
          <span className="font-medium text-gray-800">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'fournisseur',
        header: 'Fournisseur',
        size: 150,
        cell: ({ getValue }) => (
          <span className="truncate block max-w-[150px]" title={getValue() as string}>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'template_used',
        header: 'Template',
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'net_a_payer',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 ml-auto"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Montant TTC
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        ),
        size: 120,
        cell: ({ getValue }) => (
          <span className="font-bold text-gray-800 text-right block">
            {formatFullCurrency(getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'confidence_score',
        header: 'Confiance',
        size: 130,
        cell: ({ getValue }) => <ConfidenceBadge score={getValue() as number} />,
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-auto custom-scrollbar">
      <table className="w-full text-left border-collapse min-w-[900px]">
        <thead className="bg-gray-50 sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => openDrawer(row.original.id)}
              className={cn(
                'cursor-pointer transition-colors duration-150 border-l-4',
                getRowColor(row.original.id),
                'hover:bg-blue-50',
                selectedId === row.original.id
                  ? 'bg-blue-50 border-blue-500'
                  : 'border-transparent'
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-3 px-4 text-sm text-gray-600">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          <p>Aucune extraction trouvée</p>
        </div>
      )}
    </div>
  )
}
