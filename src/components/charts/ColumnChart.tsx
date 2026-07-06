export interface ColumnDatum {
  label: string
  value: number
}

/** Vertical bars for a single series over time (magnitude → one hue). */
export function ColumnChart({ data }: { data: ColumnDatum[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
  }
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d) => (
        <div
          key={d.label}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          title={`${d.label}: ${d.value}`}
        >
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {d.value}
          </span>
          <div
            className="w-full rounded-t-md bg-[var(--nj-chart-1)]"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value > 0 ? 4 : 0,
            }}
          />
          <span className="w-full truncate text-center text-[10px] text-muted-foreground">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}
