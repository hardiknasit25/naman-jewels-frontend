import { FilterX, X } from 'lucide-react'
import type { GridFilterOption } from '@/components/data/FilterOptionsPanel'
import { cn } from '@/lib/utils'

/** One column's filter model, in either shape the grids use. */
export interface GridFilterEntry {
  /** Text search filter. */
  value?: string
  /** Fixed-option filter — one entry per ticked option. */
  values?: string[]
}

/** colId → that column's filter model, as AG Grid hands it over. */
export type GridFilterModel = Record<string, GridFilterEntry>

interface ActiveFilterChipsProps {
  model: GridFilterModel
  /** colId → the option list its filter panel was built from. */
  optionsByColumn: Record<string, GridFilterOption[]>
  /** colId → the column's header name, so a chip can say WHICH filter it is. */
  columnLabels: Record<string, string>
  /** Remove one value from one column's filter. */
  onRemove: (colId: string, value: string) => void
  /** Clear the search and every filter at once. */
  onClearAll?: () => void
  className?: string
}

/**
 * The row above the table saying what is currently narrowing it.
 *
 * A filter set in the header row is easy to forget the moment that column
 * scrolls out of view, which makes "why is this list missing rows?" a genuinely
 * hard question. Listing them here answers it at a glance, and lets ONE value be
 * dropped without hunting for the column it came from — the usual reason people
 * give up and clear everything.
 *
 * Layout is one group per column: the column's name once, then its values, with
 * groups separated by a pipe. Repeating "Status:" in front of every value buries
 * the values themselves, which are the part worth reading.
 *
 * Each value renders the way it does in the grid — a status keeps its badge
 * colour — because these are the very option objects the filter panel was built
 * from, so a chip can never drift from the tick that produced it.
 *
 * The toolbar search term is deliberately absent: that box is on screen with its
 * own clear button, so a chip would say the same thing twice. "Clear all" still
 * clears it.
 */
export function ActiveFilterChips({
  model,
  optionsByColumn,
  columnLabels,
  onRemove,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  const groups: {
    colId: string
    column: string
    values: { value: string; option?: GridFilterOption }[]
  }[] = []

  for (const [colId, entry] of Object.entries(model ?? {})) {
    const values = entry?.values ?? (entry?.value ? [entry.value] : [])
    if (!values.length) continue
    groups.push({
      colId,
      column: columnLabels[colId] ?? colId,
      values: values.map((value) => ({
        value,
        option: optionsByColumn[colId]?.find((o) => o.value === value),
      })),
    })
  }

  if (!groups.length) return null

  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-1.5', className)}
      aria-label="Applied filters"
    >
      {groups.map((group, i) => (
        <div key={group.colId} className="flex flex-wrap items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden className="select-none px-1 text-border">
              |
            </span>
          )}
          <span className="text-xs text-muted-foreground">{group.column}:</span>
          {group.values.map(({ value, option }) => (
            <span
              key={value}
              className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 py-0.5 pl-1 pr-1 text-xs"
            >
              {/* The option's own rendering. Falls back to the raw value, which
                  is what a text search chip always shows — and what a fixed-option
                  chip shows if its master list hasn't loaded yet. */}
              {option?.node ?? (
                <span className="truncate px-1 font-medium text-foreground">
                  {option?.label ?? value}
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove ${group.column} filter ${option?.label ?? value}`}
                title={`Remove ${group.column}: ${option?.label ?? value}`}
                onClick={() => onRemove(group.colId, value)}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ))}
      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          title="Clear the search and every column filter"
          className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <FilterX className="size-3" />
          Clear all
        </button>
      )}
    </div>
  )
}
