import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { API_BASE, TOKEN_KEY } from '@/services/db'

export interface AuthUser {
  id?: string
  name: string
  email: string
  mobile?: string
  sessionDuration?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const STORAGE_KEY = 'njadmin:auth'

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // Only treat the user as signed in if we also hold a token.
    if (!raw || !localStorage.getItem(TOKEN_KEY)) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readUser())

  // Real JWT login against the backend. Stores the token + user for later
  // authenticated requests (see services/db.ts).
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as { token: string; user: AuthUser }
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user))
      setUser(data.user)
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    // Best-effort: tell the backend to close the session log entry.
    if (token) {
      void fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), login, logout }),
    [user, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
