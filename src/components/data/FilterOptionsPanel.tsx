import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * `node` renders an option the way it looks in the grid cell — a coloured badge,
 * a muted "Top-level". `label` is what the search box matches on, and the
 * fallback rendering when there's no node.
 *
 * `group` files the option under a heading. Options keep the order they're given;
 * a heading disappears when search empties it.
 */
export interface GridFilterOption {
  label: string
  value: string
  node?: ReactNode
  group?: string
}

/**
 * Search appears once a list is long enough that reading it top to bottom stops
 * being quicker than typing — a Category or Carat master grows past this, a
 * status enum never does.
 */
const SEARCH_AFTER = 8

interface FilterOptionsPanelProps {
  options: GridFilterOption[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Force the search box on even for a short list. */
  forceSearch?: boolean
  /**
   * Focus the search box on mount. Off for a panel the grid may build in the
   * background, where grabbing focus would pull the caret out of whatever the
   * user is actually typing in.
   */
  autoFocusSearch?: boolean
  /** Heading shown while nothing is picked. */
  emptyTitle?: string
  className?: string
}

/**
 * The checkbox list every fixed-option column filter opens.
 *
 * Values are multi-select on purpose: "Live or Private", "22K or 24K" is a
 * question people actually ask of a catalogue, and a single-value dropdown makes
 * them run the filter twice. An empty selection means "no filter on this column"
 * — never an empty array, which would leave the column looking filtered with
 * nothing ticked.
 *
 * It is a bare panel, not a popover: the caller supplies the surface, so the same
 * list can hang off a grid filter row or anything else without drifting apart.
 */
export function FilterOptionsPanel({
  options,
  selected,
  onChange,
  forceSearch = false,
  autoFocusSearch = true,
  emptyTitle = 'Select filters',
  className,
}: FilterOptionsPanelProps) {
  const [query, setQuery] = useState('')
  const searchable = forceSearch || options.length > SEARCH_AFTER

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  // Keep the caller's order, and collapse consecutive options into their heading.
  const grouped = useMemo(() => {
    const out: { group?: string; items: GridFilterOption[] }[] = []
    for (const option of filtered) {
      const last = out[out.length - 1]
      if (last && last.group === option.group) last.items.push(option)
      else out.push({ group: option.group, items: [option] })
    }
    return out
  }, [filtered])

  const toggle = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    )

  return (
    <div className={cn('w-60 text-popover-foreground', className)}>
      <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
        <span className="text-xs font-medium text-muted-foreground">
          {selected.length ? `${selected.length} selected` : emptyTitle}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {searchable && (
        <div className="relative px-1 pb-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus={autoFocusSearch}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search options"
            className="h-8 pl-8 text-sm"
          />
        </div>
      )}

      <div className="scrollbar-tw max-h-64 space-y-0.5 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
        ) : (
          grouped.map(({ group, items }) => (
            <div key={group ?? '__ungrouped'}>
              {group && (
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
              )}
              {items.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  // A toggle button, not a <label> around the checkbox: the row
                  // is one click target, so a click can't reach both the label
                  // and the box underneath and cancel itself out. The checkbox is
                  // along for the ride — it shows state and takes no clicks.
                  <button
                    key={`${option.group ?? ''}::${option.value}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(option.value)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent/60'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      readOnly
                      tabIndex={-1}
                      className="pointer-events-none"
                    />
                    {option.node ?? <span className="truncate">{option.label}</span>}
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
