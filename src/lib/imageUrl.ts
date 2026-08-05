import { API_ROOT } from '@/services/db'

/**
 * Turn a stored image value into something an <img src> can load.
 *
 * Uploaded images are stored as API-relative paths (`/uploads/ab/….webp`) so the
 * database never hard-codes a hostname — the backend can move domain without a
 * data migration. Resolving them against the API origin is this function's job.
 *
 * Anything else is passed through untouched: absolute `https://…` URLs, and the
 * legacy `data:` Base64 values that predate the migration, which must keep
 * rendering for any row the migration hasn't converted.
 */
export function resolveImageUrl(value: string | null | undefined): string {
  if (!value) return ''
  if (!value.startsWith('/uploads/')) return value
  return `${API_ROOT}${value}`
}
