// Validated categorical palette (see index.css --nj-chart-*). Assigned in fixed
// order, never cycled beyond the set — a 6th category folds back deliberately.
export const CHART_COLORS = [
  'var(--nj-chart-1)',
  'var(--nj-chart-2)',
  'var(--nj-chart-3)',
  'var(--nj-chart-4)',
  'var(--nj-chart-5)',
]

export const colorAt = (i: number) => CHART_COLORS[i % CHART_COLORS.length]
