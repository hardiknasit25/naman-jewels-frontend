import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ActionItem } from '@/components/shared/ActionsMenu'

/**
 * Inline row actions — every action is its own icon button (no dropdown).
 * `title` gives a native tooltip on hover; used inside AG Grid action cells.
 */
export function RowActions({ items }: { items: ActionItem[] }) {
  const visible = items.filter((i) => !i.hidden)
  return (
    <div className="flex h-full w-full items-center justify-center gap-0.5">
      {visible.map((item) => (
        <Button
          key={item.label}
          variant="ghost"
          size="icon-sm"
          title={item.label}
          aria-label={item.label}
          className={cn(
            'size-7 text-muted-foreground hover:text-foreground',
            item.destructive && 'text-destructive hover:text-destructive'
          )}
          onClick={item.onClick}
        >
          {item.icon}
        </Button>
      ))}
    </div>
  )
}
