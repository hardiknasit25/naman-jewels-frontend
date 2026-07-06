import type { Id, Timestamped } from '@/types'

// ---------------------------------------------------------------------------
// HTTP data layer. Talks to the Express/Sequelize backend under /api.
//
// This is the "seam" the app was designed around: it keeps the same
// Collection interface (list/get/create/update/remove returning Promises), so
// the RTK Query layer, repositories and all UI code stay exactly the same.
//
// The backend is a separate app on its own origin. VITE_API_URL points at it
// (e.g. https://api.namanjewels.com). When it's unset, API_BASE falls back to
// the relative "/api", which in dev is proxied to the backend by Vite.
// ---------------------------------------------------------------------------

const API_ROOT = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
export const API_BASE = `${API_ROOT}/api`
export const TOKEN_KEY = 'njadmin:token'
const AUTH_KEY = 'njadmin:auth'

// Map each repository name to its REST resource path.
const PATHS: Record<string, string> = {
  customerTypes: 'customer-types',
  customers: 'customers',
  categories: 'categories',
  products: 'products',
  inquiries: 'inquiries',
  banners: 'banners',
  staticPages: 'static-pages',
  sessionLogs: 'session-logs',
  auditLogs: 'audit-logs',
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Shared fetch wrapper: attaches auth, parses JSON, and turns non-2xx responses
// into thrown Errors (which RTK Query surfaces as `{ error }`).
async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  // Expired/invalid session — clear auth and bounce to login.
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(AUTH_KEY)
    if (window.location.pathname !== '/login') window.location.assign('/login')
    throw new Error('Session expired')
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export interface Collection<T extends Timestamped> {
  list(): Promise<T[]>
  get(id: Id): Promise<T | undefined>
  create(data: Omit<T, 'id' | 'createdAt'>): Promise<T>
  update(id: Id, patch: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T>
  remove(id: Id): Promise<{ id: Id }>
}

// `_seed` and `_idPrefix` are ignored now that data lives in the backend; they
// remain in the signature so repositories.ts stays untouched.
export function collection<T extends Timestamped>(
  name: string,
  _seed?: T[],
  _idPrefix?: string
): Collection<T> {
  const path = `/${PATHS[name] ?? name}`
  return {
    list: () => http<T[]>(path),
    get: (id) => http<T>(`${path}/${id}`),
    create: (data) => http<T>(path, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, patch) => http<T>(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id) => http<{ id: Id }>(`${path}/${id}`, { method: 'DELETE' }),
  }
}

/** No-op kept for backwards compatibility (data now lives in the backend). */
export function resetDb() {
  /* handled by the backend seed */
}
