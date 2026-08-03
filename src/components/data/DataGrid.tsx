import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type FilterChangedEvent,
  type GridApi,
  type GridOptions,
  type GridReadyEvent,
} from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { Search, X } from 'lucide-react'
import { shadcnGridTheme } from '@/components/data/gridTheme'
import { GridTextFilter } from '@/components/data/gridFilters'
import {
  ActiveFilterChips,
  type GridFilterModel,
} from '@/components/data/ActiveFilterChips'
import type { GridFilterOption } from '@/components/data/FilterOptionsPanel'
import { Input } from '@/components/ui/input'
import { useUrlState } from '@/hooks/useUrlState'
import { cn } from '@/lib/utils'

// Register all community features once for the whole app.
ModuleRegistry.registerModules([AllCommunityModule])

interface DataGridProps<T> extends GridOptions<T> {
  rowData: T[] | undefined
  columnDefs: ColDef<T>[]
  loading?: boolean
  /** Tailwind height utility for the scroll container. */
  className?: string
  /**
   * Query-string prefix for this grid's search box and column filters, e.g.
   * `products` writes `?products_q=ring&products_f={…}`. Grids that share a page
   * (tabs) need distinct keys so their state doesn't overwrite each other's.
   */
  stateKey?: string
  /** Switch off column filtering entirely (the drag-ordered Categories grid). */
  filters?: boolean
  /** Hide the toolbar search box. */
  searchable?: boolean
  searchPlaceholder?: string
}

const parseFilterModel = (raw: string) => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    // A truncated or hand-edited URL shouldn't wedge the grid.
    return null
  }
}

export function DataGrid<T>({
  rowData,
  columnDefs,
  loading,
  className,
  stateKey = 'grid',
  filters = true,
  searchable = true,
  searchPlaceholder = 'Search…',
  ...gridOptions
}: DataGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null)

  // Search text and the column filter model both live in the URL, so a refresh
  // (or a shared link) reopens the table exactly as the user left it.
  const [urlSearch, setUrlSearch] = useUrlState(`${stateKey}_q`)
  const [urlFilters, setUrlFilters] = useUrlState(`${stateKey}_f`)

  // Typed text is kept locally as well so the input stays responsive; the URL
  // catches up a beat later. `pushedSearch` marks values this grid itself wrote,
  // which is how an external change (back button, pasted link) is told apart.
  const [search, setSearch] = useState(urlSearch)
  const pushedSearch = useRef(urlSearch)
  const syncedFilters = useRef(urlFilters)
  // The live filter model mirrored into React state, purely so the chips above
  // the table can render it — AG Grid keeps the real one internally.
  const [activeModel, setActiveModel] = useState<GridFilterModel>(
    () => parseFilterModel(urlFilters) ?? {}
  )

  useEffect(() => {
    if (urlSearch === pushedSearch.current) return
    pushedSearch.current = urlSearch
    setSearch(urlSearch)
  }, [urlSearch])

  useEffect(() => {
    if (search === urlSearch) return
    const timer = setTimeout(() => {
      pushedSearch.current = search
      setUrlSearch(search)
    }, 250)
    return () => clearTimeout(timer)
  }, [search, urlSearch, setUrlSearch])

  const applyUrlFilters = useCallback(
    (api: GridApi<T>) => api.setFilterModel(parseFilterModel(urlFilters)),
    [urlFilters]
  )

  // Re-apply when the URL changes from outside the grid (back / forward).
  useEffect(() => {
    if (urlFilters === syncedFilters.current) return
    syncedFilters.current = urlFilters
    const api = gridRef.current?.api
    if (!api) return
    applyUrlFilters(api)
  }, [urlFilters, applyUrlFilters])

  const onGridReady = (event: GridReadyEvent<T>) => {
    syncedFilters.current = urlFilters
    if (urlFilters) applyUrlFilters(event.api)
    gridOptions.onGridReady?.(event)
  }

  const onFilterChanged = (event: FilterChangedEvent<T>) => {
    const model = event.api.getFilterModel()
    setActiveModel(model as GridFilterModel)
    const next = Object.keys(model).length > 0 ? JSON.stringify(model) : ''
    if (next !== syncedFilters.current) {
      syncedFilters.current = next
      setUrlFilters(next)
    }
    gridOptions.onFilterChanged?.(event)
  }

  // Drop ONE value from one column — the chips' ×. Removing a column's last
  // value drops the whole entry, since an empty array would leave the column
  // looking filtered with nothing ticked (same rule as the panel itself).
  const removeFilterValue = (colId: string, value: string) => {
    const api = gridRef.current?.api
    if (!api) return
    const model = { ...(api.getFilterModel() as GridFilterModel) }
    const remaining = (model[colId]?.values ?? []).filter((v) => v !== value)
    if (remaining.length) model[colId] = { values: remaining }
    else delete model[colId]
    api.setFilterModel(model)
  }

  const clearAll = () => {
    gridRef.current?.api.setFilterModel(null)
    setSearch('')
  }

  // Chips render each value the way its filter panel does, and name the column
  // it came from — both read straight off the column defs, so a chip can't drift
  // from the column it belongs to.
  const { optionsByColumn, columnLabels } = useMemo(() => {
    const options: Record<string, GridFilterOption[]> = {}
    const labels: Record<string, string> = {}
    for (const col of columnDefs) {
      const colId = col.colId ?? col.field
      if (!colId) continue
      if (col.headerName) labels[colId] = col.headerName
      const columnOptions = (col.filterParams as { options?: GridFilterOption[] } | undefined)
        ?.options
      if (columnOptions) options[colId] = columnOptions
    }
    return { optionsByColumn: options, columnLabels: labels }
  }, [columnDefs])

  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      flex: 1,
      minWidth: 130,
      resizable: true,
      sortable: true,
      // Filters open from AG Grid's own filter icon in the column header — a
      // search box for text columns, a tick list for fixed-option ones (see
      // gridFilters.tsx). The column menu button stays hidden; the filter icon
      // is the only header control.
      filter: filters ? GridTextFilter : false,
      suppressHeaderMenuButton: true,
      ...gridOptions.defaultColDef,
    }),
    [filters, gridOptions.defaultColDef]
  )

  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col gap-3', className)}>
      {searchable && (
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 pl-8 pr-8"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* What's currently narrowing the table, and a one-click way out of it. */}
      <ActiveFilterChips
        model={activeModel}
        optionsByColumn={optionsByColumn}
        columnLabels={columnLabels}
        onRemove={removeFilterValue}
        onClearAll={clearAll}
      />

      {/* Fills the remaining height of a flex-column parent; min-h-0 lets it shrink. */}
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="min-h-80 flex-1">
          <AgGridReact<T>
            ref={gridRef}
            theme={shadcnGridTheme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            loading={loading}
            quickFilterText={search}
            pagination
            paginationPageSize={20}
            paginationPageSizeSelector={[10, 20, 50]}
            animateRows
            {...gridOptions}
            onGridReady={onGridReady}
            onFilterChanged={onFilterChanged}
          />
        </div>
      </div>
    </div>
  )
}
