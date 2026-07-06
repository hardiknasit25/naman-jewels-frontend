import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: ReactNode
  hint?: string
  /** Tailwind classes for the icon tile (bg + text). */
  accentClassName?: string
}

export function StatCard({ label, value, icon, hint, accentClassName }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary',
            accentClassName
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
