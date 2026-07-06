export interface DonutSlice {
  label: string
  value: number
  color: string
}

/** Distribution donut with a legend (identity by legend + value, not color alone). */
export function Donut({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
  }

  const R = 15.915 // circumference ≈ 100, so dash values are percentages
  let acc = 0

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <svg viewBox="0 0 42 42" className="size-40 shrink-0" role="img" aria-label="Distribution">
        <circle cx="21" cy="21" r={R} fill="none" stroke="var(--muted)" strokeWidth="5" />
        {data.map((d) => {
          const frac = d.value / total
          const dash = frac * 100
          const seg = (
            <circle
              key={d.label}
              cx="21"
              cy="21"
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth="5"
              strokeDasharray={`${Math.max(dash - 0.6, 0)} ${100 - Math.max(dash - 0.6, 0)}`}
              strokeDashoffset={25 - acc * 100}
            />
          )
          acc += frac
          return seg
        })}
        <text
          x="21"
          y="21"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          style={{ fontSize: '6px', fontWeight: 600 }}
        >
          {total}
        </text>
      </svg>

      <ul className="flex w-full flex-col gap-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 truncate">{d.label}</span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {d.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
