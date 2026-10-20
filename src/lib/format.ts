export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Round to milligrams — float sums of 0.001-precision weights drift. */
export const round3 = (n: number) => Math.round(n * 1000) / 1000

/** A weight in grams, always to 3 decimals ("12.500"); '—' when there's none. */
export function formatWeight(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return round3(n).toFixed(3)
}

/**
 * Tidy a typed weight to 3 decimals once the admin leaves the field ("12.5" →
 * "12.500"). Blanks and junk are left as typed so validation can flag them.
 */
export function toWeightInput(value: string): string {
  const n = Number(value.trim())
  return value.trim() !== '' && Number.isFinite(n) ? formatWeight(n) : value
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
