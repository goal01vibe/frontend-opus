import { useMemo, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
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
import { formatFullCurrency, formatDate, formatCurrency } from '@/lib/utils'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge'
import { useUIStore } from '@/stores/uiStore'
import { useFilterStore } from '@/stores/filterStore'
import type { Document, Extraction } from '@/types'
import { ArrowUpDown, ChevronDown, ChevronUp, AlertTriangle, ArrowRightLeft, Copy, Check, Thermometer } from 'lucide-react'
import { ProductBadges } from '@/components/common/ProductBadges'

/** Inline cell component for code_article with lifecycle icons + popover (portal-based) */
function CodeArticleCell({ code, ext }: { code: string; ext: Extraction }) {
  const [showPopover, setShowPopover] = useState(false)
  const [copied, setCopied] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (ext.replaced_by) {
      navigator.clipboard.writeText(ext.replaced_by)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [ext.replaced_by])

  const togglePopover = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (showPopover) {
      setShowPopover(false)
      setPopoverPos(null)
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const popoverWidth = 256 // w-64 = 16rem = 256px
      const popoverHeight = 80 // approximate height of popover content
      const gap = 4

      // Determine vertical position: below by default, above if not enough space
      let top = rect.bottom + gap
      if (top + popoverHeight > window.innerHeight) {
        top = rect.top - popoverHeight - gap
      }

      // Clamp horizontal position so popover doesn't go off-screen right
      let left = rect.left
      if (left + popoverWidth > window.innerWidth - 8) {
        left = window.innerWidth - popoverWidth - 8
      }
      if (left < 8) left = 8

      setPopoverPos({ top, left })
      setShowPopover(true)
    }
  }, [showPopover])

  const closePopover = useCallback(() => {
    setShowPopover(false)
    setPopoverPos(null)
  }, [])

  const hasReplacement = !!ext.replaced_by
  const isRetiredOnly = ext.is_active === false && !ext.replaced_by

  return (
    <span className="inline-flex items-center">
      <span className="font-mono text-sm">{code || '-'}</span>
      {hasReplacement && (
        <>
          <span
            title={`Remplacé par ${ext.replaced_by_denomination || ''} (${ext.replaced_by})`}
            className="ml-1 shrink-0 cursor-pointer"
            onClick={togglePopover}
          >
            <ArrowRightLeft className="w-[18px] h-[18px] text-red-500" />
          </span>
          {showPopover && popoverPos && ReactDOM.createPortal(
            <>
              {/* Backdrop to close on click outside */}
              <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); closePopover(); }} />
              <div
                className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm w-64"
                style={{ top: popoverPos.top, left: popoverPos.left }}
                onClick={(e) => e.stopPropagation()}
              >
                {ext.replaced_by_denomination && (
                  <div className="font-medium text-gray-700 mb-1">{ext.replaced_by_denomination}</div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{ext.replaced_by}</span>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-gray-100 transition"
                    title="Copier le code"
                  >
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-green-500" />
                      : <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                    }
                  </button>
                  {copied && <span className="text-xs text-green-600">Copié !</span>}
                </div>
              </div>
            </>,
            document.body
          )}
        </>
      )}
      {isRetiredOnly && (
        <span
          title={`Produit retiré du marché${ext.retired_date ? ` le ${ext.retired_date}` : ''}`}
          className="ml-1 shrink-0"
        >
          <AlertTriangle className="w-[18px] h-[18px] text-amber-500" />
        </span>
      )}
    </span>
  )
}

interface ExtractionsTableProps {
  data: Document[]
  extractions?: Extraction[]
  viewMode?: 'documents' | 'lines'
  isLoading?: boolean
}

export function ExtractionsTable({ data, extractions = [], viewMode = 'documents', isLoading }: ExtractionsTableProps) {
  const { sortBy, sortOrder, setSort } = useFilterStore()

  // Convert store sort to TanStack SortingState
  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  const handleSortingChange = (updater: any) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater
    if (newSorting.length > 0) {
      setSort(newSorting[0].id, newSorting[0].desc ? 'desc' : 'asc')
    } else {
      setSort('date_extraction', 'desc')
    }
  }
  const { openDrawer, selectedId } = useUIStore()

  // For documents view: group by document ID
  const documentGroups = useMemo(() => {
    const groups = new Set<number>()
    data.forEach((doc) => groups.add(doc.id))
    return Array.from(groups)
  }, [data])

  // For lines view: group extractions by document_id with alternating colors
  const extractionGroups = useMemo(() => {
    if (viewMode !== 'lines' || extractions.length === 0) return new Map<number, number>()

    const groups = new Map<number, number>()
    let colorIndex = 0
    let prevDocId: number | null = null

    extractions.forEach((ext) => {
      if (ext.document_id !== prevDocId) {
        colorIndex = prevDocId !== null ? (colorIndex + 1) % 2 : 0
        prevDocId = ext.document_id
      }
      groups.set(ext.id, colorIndex)
    })

    return groups
  }, [extractions, viewMode])

  const getRowColor = (id: number, isExtraction: boolean = false): string => {
    if (isExtraction) {
      const colorIndex = extractionGroups.get(id) ?? 0
      return colorIndex === 0 ? 'bg-slate-50' : 'bg-slate-100'
    }
    const groupIndex = documentGroups.indexOf(id)
    return groupIndex % 2 === 0 ? 'bg-slate-50' : 'bg-slate-100'
  }

  // Document columns
  const documentColumns: ColumnDef<Document>[] = useMemo(
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
            Date facture
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
        accessorKey: 'date_echeance',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Échéance
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        ),
        size: 100,
        cell: ({ row }) => {
          const dateStr = row.original.date_echeance
          if (!dateStr) return <span className="text-gray-400">-</span>

          const echeance = new Date(dateStr)
          const today = new Date()
          const isOverdue = echeance < today
          const isNearDue = !isOverdue && echeance.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000

          return (
            <span className={cn(
              'flex items-center gap-1',
              isOverdue && 'text-red-600 font-medium',
              isNearDue && 'text-orange-600'
            )}>
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
              {formatDate(dateStr)}
            </span>
          )
        },
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
        size: 100,
        cell: ({ getValue }) => <ConfidenceBadge score={getValue() as number} />,
      },
    ],
    []
  )

  // Extraction lines columns
  const extractionColumns: ColumnDef<Extraction>[] = useMemo(
    () => [
      {
        accessorKey: 'document_id',
        header: 'Doc #',
        size: 60,
        meta: { sticky: true, stickyLeft: 0 },
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-gray-500">#{getValue() as number}</span>
        ),
      },
      {
        accessorKey: 'date_document',
        header: 'Date facture',
        size: 95,
        cell: ({ getValue }) => {
          const d = getValue() as string | null
          if (!d) return <span className="text-gray-400">-</span>
          try {
            return <span className="text-xs text-gray-600">{new Date(d).toLocaleDateString('fr-FR')}</span>
          } catch {
            return <span className="text-xs text-gray-600">{d}</span>
          }
        },
      },
      {
        accessorKey: 'code_article',
        header: 'Code article',
        size: 145,
        meta: { sticky: true, stickyLeft: 60 },
        cell: ({ row, getValue }) => {
          const ext = row.original
          return (
            <CodeArticleCell code={getValue() as string} ext={ext} />
          )
        },
      },
      {
        accessorKey: 'designation_article',
        header: 'Désignation',
        size: 250,
        cell: ({ row, getValue }) => {
          const ext = row.original
          return (
            <span className="inline-flex items-center gap-1">
              <span className="truncate max-w-[230px]" title={getValue() as string}>
                {getValue() as string}
              </span>
              {ext.is_cold_chain && (
                <span title="Produit chaine du froid (conservation 2-8°C)" className="shrink-0">
                  <Thermometer className="w-[16px] h-[16px] text-blue-500" />
                </span>
              )}
            </span>
          )
        },
      },
      {
        accessorKey: 'quantite',
        header: 'Qté',
        size: 70,
        cell: ({ getValue }) => (
          <span className="text-center block">{getValue() as number}</span>
        ),
      },
      {
        accessorKey: 'prix_unitaire_ht',
        header: 'P.U. HT',
        size: 90,
        cell: ({ getValue }) => (
          <span className="text-right block">{formatCurrency(getValue() as number)}</span>
        ),
      },
      {
        accessorKey: 'remise_taux',
        header: 'Remise',
        size: 70,
        cell: ({ getValue }) => {
          const remise = getValue() as number | undefined
          if (!remise) return <span className="text-gray-400 text-center block">-</span>
          return (
            <span className="text-orange-600 font-medium text-center block">
              {remise}%
            </span>
          )
        },
      },
      {
        accessorKey: 'prix_net_unitaire_ht',
        header: 'P. Net U. HT',
        size: 100,
        cell: ({ getValue }) => {
          const val = getValue() as number | undefined
          if (!val) return <span className="text-gray-400 text-right block">-</span>
          return (
            <span className="text-right block">{formatCurrency(val)}</span>
          )
        },
      },
      {
        accessorKey: 'taux_remboursement',
        header: 'Type',
        size: 75,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <ProductBadges extraction={row.original} size="sm" />
          </div>
        ),
      },
      {
        accessorKey: 'taux_tva',
        header: 'TVA %',
        size: 70,
        cell: ({ getValue }) => {
          const taux = getValue() as number
          return (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded text-center block',
              taux === 2.1 && 'bg-green-100 text-green-700',
              taux === 5.5 && 'bg-blue-100 text-blue-700',
              taux === 10 && 'bg-yellow-100 text-yellow-700',
              taux === 20 && 'bg-red-100 text-red-700'
            )}>
              {taux}%
            </span>
          )
        },
      },
      {
        accessorKey: 'montant_ligne_ht',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 ml-auto"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Montant HT
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        ),
        size: 110,
        cell: ({ getValue }) => (
          <span className="font-bold text-gray-800 text-right block">
            {formatCurrency(getValue() as number)}
          </span>
        ),
      },
    ],
    []
  )

  const documentsTable = useReactTable({
    data,
    columns: documentColumns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const extractionsTable = useReactTable({
    data: extractions,
    columns: extractionColumns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const table = viewMode === 'documents' ? documentsTable : extractionsTable
  const displayData = viewMode === 'documents' ? data : extractions

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

  // Helper pour obtenir les styles sticky
  const getStickyStyles = (columnDef: ColumnDef<Document | Extraction>) => {
    const meta = columnDef.meta as { sticky?: boolean; stickyLeft?: number } | undefined
    if (meta?.sticky) {
      return {
        position: 'sticky' as const,
        left: meta.stickyLeft ?? 0,
        zIndex: 1,
      }
    }
    return {}
  }

  return (
    <div className="overflow-auto custom-scrollbar">
      <table className="w-full text-left border-collapse min-w-[900px]">
        <thead className="bg-gray-50 sticky top-0 z-20">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const stickyStyles = getStickyStyles(header.column.columnDef)
                const isSticky = !!(header.column.columnDef.meta as { sticky?: boolean })?.sticky
                return (
                  <th
                    key={header.id}
                    className={cn(
                      "py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50",
                      isSticky && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                    )}
                    style={{ width: header.getSize(), ...stickyStyles, zIndex: isSticky ? 21 : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header as string, header.getContext() as never)}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => {
            const rowId = viewMode === 'documents'
              ? (row.original as Document).id
              : (row.original as Extraction).id
            const docId = viewMode === 'documents'
              ? (row.original as Document).id
              : (row.original as Extraction).document_id
            const rowBgClass = getRowColor(rowId, viewMode === 'lines')

            return (
              <tr
                key={row.id}
                data-testid="document-row"
                onClick={() => openDrawer(docId)}
                className={cn(
                  'cursor-pointer transition-colors duration-150 border-l-4',
                  rowBgClass,
                  'hover:bg-blue-50',
                  selectedId === docId
                    ? 'bg-blue-50 border-blue-500'
                    : 'border-transparent'
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const stickyStyles = getStickyStyles(cell.column.columnDef)
                  const isSticky = !!(cell.column.columnDef.meta as { sticky?: boolean })?.sticky
                  // Pour les cellules sticky, on reprend la couleur de fond de la ligne
                  const bgClass = isSticky ? (selectedId === docId ? 'bg-blue-50' : rowBgClass) : ''
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "py-3 px-4 text-sm text-gray-600",
                        isSticky && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                        bgClass
                      )}
                      style={stickyStyles}
                    >
                      {flexRender(cell.column.columnDef.cell as string, cell.getContext() as never)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {displayData.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          <p>Aucune donnée trouvée</p>
        </div>
      )}
    </div>
  )
}
