export interface BarDatum {
  label: string
  value: number
  color?: string
}

/**
 * Horizontal bars for categorical magnitude. Every bar carries a direct value
 * label (the palette's relief rule — never color alone).
 */
export function BarList({ data }: { data: BarDatum[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
  }
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{d.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
              {d.value}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.color ?? 'var(--nj-chart-1)',
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
