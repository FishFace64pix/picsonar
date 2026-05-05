/**
 * Auth context.
 *
 * - The access token lives in-memory only (see tokenStore). The user is
 *   re-hydrated from the server via /auth/me on mount — no user-JSON dumps in
 *   localStorage.
 * - The refresh token is held in-memory in this demo; the follow-up is to
 *   have the backend return it as an httpOnly cookie and drop it from JSON.
 * - On 401, the axios interceptor transparently refreshes the access token.
 */
import axios from 'axios'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@picsonar/shared/types'
import { authApi } from '../api/auth'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../api/tokenStore'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://iku0303aa5.execute-api.eu-central-1.amazonaws.com/prod'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    name: string,
    phone: string,
    legal?: unknown,
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore session from in-memory token (SPA nav) or persisted
  // refresh token (hard refresh / new tab).
  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      try {
        if (!getAccessToken()) {
          const rt = getRefreshToken()
          if (!rt) return
          const resp = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: rt })
          const { token, refreshToken: newRt } = resp.data ?? {}
          if (!token) return
          setTokens({ accessToken: token, refreshToken: newRt ?? rt })
        }
        const u = await authApi.getCurrentUser()
        if (!cancelled) setUser(u)
      } catch {
        clearTokens()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restore()
    return () => { cancelled = true }
  }, [])

  const login = async (email: string, password: string) => {
    const { token, refreshToken, user: u } = await authApi.login({
      email,
      password,
    })
    setTokens({ accessToken: token, refreshToken: refreshToken ?? null })
    setUser(u)
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    legal?: unknown,
  ) => {
    const { token, refreshToken, user: u } = await authApi.register({
      email,
      password,
      name,
      phone,
      legal,
    })
    setTokens({ accessToken: token, refreshToken: refreshToken ?? null })
    setUser(u)
  }

  const logout = async () => {
    // Always clear local state first so the UI flips to signed-out without
    // waiting on the network. Server revocation happens in the background;
    // a failed round-trip doesn't leave a logged-in UI.
    setUser(null)
    try {
      await authApi.logout()
    } finally {
      clearTokens()
    }
  }

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
