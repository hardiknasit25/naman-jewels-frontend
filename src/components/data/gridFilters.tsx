import { useEffect, useRef, useState, type Ref } from 'react'
import { useGridFilter, type CustomFilterProps } from 'ag-grid-react'
import type {
  ColDef,
  GridApi,
  IDoesFilterPassParams,
  IRowNode,
} from 'ag-grid-community'
import { Search, X } from 'lucide-react'
import {
  FilterOptionsPanel,
  type GridFilterOption,
} from '@/components/data/FilterOptionsPanel'
import { Input } from '@/components/ui/input'

/**
 * Column filters for every AG Grid in the admin panel.
 *
 * Both open from AG Grid's own filter icon in the column header, and there are
 * two kinds, on purpose:
 *
 * - a plain **search box** for free-text columns. AG Grid's own text filter ships
 *   with a "Contains / Equals / Does not contain …" dropdown and a second AND/OR
 *   condition, which is more machinery than this panel needs, so it's replaced
 *   wholesale rather than configured down.
 * - a **tick list of the column's options** for columns whose values come from a
 *   fixed set (a master table like Carats, or a status enum). Each option renders
 *   as the same badge the cell shows, and several can be ticked at once.
 *
 * Their models are plain objects that serialise straight into the URL — see
 * `DataGrid`'s state sync — and into the chips above the table, which is where a
 * filter set behind an icon stays visible instead of being forgotten.
 */

/** Text-search model. `null` (no model) means the column isn't filtering. */
export interface TextFilterModel {
  value: string
}

/** Fixed-option model — one entry per ticked option, never an empty array. */
export interface OptionsFilterModel {
  values: string[]
}

const textOf = (value: unknown) => (value == null ? '' : String(value))

/**
 * The column's cell value as text, behind a stable function. `getValue` is a
 * fresh closure on every render, so reading it through a ref is what lets the
 * `doesFilterPass` predicates below keep one identity for their whole life.
 */
function useCellText(getValue: (node: IRowNode) => unknown) {
  const ref = useRef(getValue)
  ref.current = getValue
  return useRef((node: IRowNode) => textOf(ref.current(node))).current
}

/**
 * Re-run filtering once a new model has actually reached this component.
 *
 * A model pushed in through the grid rather than typed into the panel —
 * `api.setFilterModel`, which is how a filtered URL is restored and how the chips
 * above the table remove a value — lands one render too early: the grid re-runs
 * filtering as soon as the hand-off resolves, while this component (and the
 * predicate reading its model) is still a render behind. Restoring a filtered URL
 * showed it plainly: the chips came back, the rows didn't.
 *
 * Asking the grid to filter again from an effect fixes the order, because by then
 * the render carrying the new model has committed. The first run is skipped — the
 * grid is already filtering with that model, it's what created this filter.
 */
function useReapplyOnModelChange(api: GridApi, model: unknown) {
  const applied = useRef<string | null>(null)

  useEffect(() => {
    const next = JSON.stringify(model ?? null)
    if (applied.current === next) return
    const isFirst = applied.current === null
    applied.current = next
    if (!isFirst) api.onFilterChanged()
  }, [api, model])
}

// ---------------------------------------------------------------------------
// Text search
// ---------------------------------------------------------------------------

/**
 * Debounced two-way binding between an input and a filter model. Typing shouldn't
 * re-run the filter (and rewrite the URL) on every keystroke, but a model arriving
 * from outside — a restored URL, a removed chip, "Clear all" — has to land at once.
 */
function useFilterText(
  model: TextFilterModel | null,
  onModelChange: (model: TextFilterModel | null) => void,
  delay = 250
) {
  const applied = model?.value ?? ''
  const [text, setText] = useState(applied)

  useEffect(() => setText(applied), [applied])

  useEffect(() => {
    if (text === applied) return
    const timer = setTimeout(() => onModelChange(text ? { value: text } : null), delay)
    return () => clearTimeout(timer)
  }, [text, applied, onModelChange, delay])

  return [text, setText] as const
}

function SearchBox({
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-7 rounded-lg pl-7 pr-7 text-xs"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear filter"
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

/**
 * Case-insensitive "contains" over whatever the column displays.
 *
 * The predicate keeps ONE identity for the filter's lifetime and reads the term
 * from a ref. `useGridFilter` re-registers during render, and AG Grid answers a
 * changed predicate by re-running the filter there and then — from inside our
 * render, which React rightly complains about. A stable predicate keeps that
 * path quiet; `useReapplyOnModelChange` asks for the re-run from an effect
 * instead, which is also where the ref is guaranteed to be current.
 */
function useTextFilter(
  model: TextFilterModel | null,
  getValue: (node: IRowNode) => unknown
) {
  const cellText = useCellText(getValue)
  const needle = useRef('')
  // Defensive `?? ''`: the model can come straight from a hand-edited URL.
  needle.current = (model?.value ?? '').trim().toLowerCase()

  return useRef(
    ({ node }: IDoesFilterPassParams) =>
      !needle.current || cellText(node).toLowerCase().includes(needle.current)
  ).current
}

/** Popup filter for text columns — a single search box, no operator dropdown. */
export function GridTextFilter({
  model,
  onModelChange,
  getValue,
  colDef,
  api,
}: CustomFilterProps<unknown, unknown, TextFilterModel>) {
  const [text, setText] = useFilterText(model, onModelChange)
  const inputRef = useRef<HTMLInputElement>(null)

  useReapplyOnModelChange(api, model)
  useGridFilter({
    doesFilterPass: useTextFilter(model, getValue),
    // Focus on open rather than on mount — the filter is built lazily and this
    // is the hook AG Grid calls each time the popup is actually shown.
    afterGuiAttached: () => inputRef.current?.focus(),
  })

  return (
    <div className="w-56 p-2">
      <SearchBox
        inputRef={inputRef}
        value={text}
        onChange={setText}
        placeholder={`Search ${colDef.headerName ?? ''}`.trim()}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fixed-option tick list
// ---------------------------------------------------------------------------

/** Extra `filterParams` an option-filtered column supplies. */
interface OptionsFilterParams {
  options: GridFilterOption[]
  /** Panel heading while nothing is ticked — also the "no filter" meaning. */
  anyLabel?: string
}

/** Row passes when its value is one of the ticked options. */
function useOptionsFilter(
  model: OptionsFilterModel | null,
  getValue: (node: IRowNode) => unknown
) {
  const cellText = useCellText(getValue)
  // Stable predicate reading a ref, for the reason spelled out on useTextFilter.
  const values = useRef<string[]>([])
  values.current = model?.values ?? []

  return useRef(
    ({ node }: IDoesFilterPassParams) =>
      values.current.length === 0 || values.current.includes(cellText(node))
  ).current
}

/** Popup filter for columns backed by a master list or a status enum. */
export function GridOptionsFilter({
  model,
  onModelChange,
  getValue,
  api,
  options,
  anyLabel = 'All',
}: CustomFilterProps<unknown, unknown, OptionsFilterModel> & OptionsFilterParams) {
  useReapplyOnModelChange(api, model)
  useGridFilter({ doesFilterPass: useOptionsFilter(model, getValue) })

  // AG Grid supplies the popup surface, so the panel goes in bare.
  return (
    <FilterOptionsPanel
      options={options}
      selected={model?.values ?? []}
      emptyTitle={anyLabel}
      onChange={(next) => onModelChange(next.length ? { values: next } : null)}
    />
  )
}

// ---------------------------------------------------------------------------

/**
 * Column definition fragment that swaps a column's search-box filter for a tick
 * list of `options`. Spread it into the `ColDef`:
 *
 * ```ts
 * { headerName: 'Carat', colId: 'carat', ...optionsFilter(caratOptions, 'All carats') }
 * ```
 *
 * The option `value`s must equal what the column renders (its `field` value or
 * `valueGetter` result, as text) — that's what the filter compares against. Give
 * an option a `node` and it shows as that in the list AND in the chips above the
 * table, which is how a Status filter keeps its badge colours.
 */
export function optionsFilter<T>(
  options: GridFilterOption[],
  anyLabel = 'All'
): ColDef<T> {
  return {
    filter: GridOptionsFilter,
    filterParams: { options, anyLabel } satisfies OptionsFilterParams,
  }
}
