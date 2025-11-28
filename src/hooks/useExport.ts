import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface ColumnMapping {
  key: string
  label: string
  format?: (value: unknown) => string
}

export function useExport() {
  const exportToXLSX = (
    data: Record<string, unknown>[],
    filename: string,
    columns?: ColumnMapping[]
  ) => {
    const exportData = columns
      ? data.map((row) =>
          columns.reduce(
            (acc, col) => ({
              ...acc,
              [col.label]: col.format ? col.format(row[col.key]) : row[col.key],
            }),
            {}
          )
        )
      : data

    const ws = XLSX.utils.json_to_sheet(exportData)

    // Auto-width columns
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...exportData.map((r) => String(r[key] || '').length)),
    }))
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Données')

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buffer]), `${filename}.xlsx`)
  }

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' }) // ; for Excel FR
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
  }

  const exportToJSON = (data: unknown, filename: string) => {
    const json = JSON.stringify(data, null, 2)
    saveAs(new Blob([json], { type: 'application/json' }), `${filename}.json`)
  }

  return {
    exportToXLSX,
    exportToCSV,
    exportToJSON,
  }
}
