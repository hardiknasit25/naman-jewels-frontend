import { useMemo } from 'react'
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridOptions,
} from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { shadcnGridTheme } from '@/components/data/gridTheme'
import { cn } from '@/lib/utils'

// Register all community features once for the whole app.
ModuleRegistry.registerModules([AllCommunityModule])

interface DataGridProps<T> extends GridOptions<T> {
  rowData: T[] | undefined
  columnDefs: ColDef<T>[]
  loading?: boolean
  /** Tailwind height utility for the scroll container. */
  className?: string
}

export function DataGrid<T>({
  rowData,
  columnDefs,
  loading,
  className,
  ...gridOptions
}: DataGridProps<T>) {
  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      flex: 1,
      minWidth: 130,
      resizable: true,
      sortable: true,
      filter: true,
      suppressHeaderMenuButton: true,
    }),
    []
  )

  return (
    // Fills the remaining height of a flex-column parent; min-h-0 lets it shrink.
    <div
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border',
        className
      )}
    >
      <div className="min-h-[320px] flex-1">
        <AgGridReact<T>
          theme={shadcnGridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          loading={loading}
          pagination
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50]}
          animateRows
          {...gridOptions}
        />
      </div>
    </div>
  )
}
