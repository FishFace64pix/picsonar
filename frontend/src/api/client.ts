/**
 * Shared axios client.
 *
 * - The access token is read from the in-memory tokenStore, NOT localStorage,
 *   so an XSS payload can no longer lift the JWT from storage.
 * - On a 401 that is not itself a refresh attempt, we try to rotate the
 *   access token via /auth/refresh. If refresh fails, we clear tokens and
 *   bounce the user to /login.
 * - `withCredentials: true` lets us move to httpOnly refresh cookies in a
 *   follow-up once the backend sets Set-Cookie headers.
 */
import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokenStore'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://iku0303aa5.execute-api.eu-central-1.amazonaws.com/prod'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})

// --- Refresh orchestration ------------------------------------------------
let refreshInFlight: Promise<string | null> | null = null

async function attemptRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  const rt = getRefreshToken()
  if (!rt) return null

  refreshInFlight = (async () => {
    try {
      const resp = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken: rt },
      )
      const { token, refreshToken: newRefresh } = resp.data ?? {}
      if (!token) return null
      setTokens({ accessToken: token, refreshToken: newRefresh ?? rt })
      return token
    } catch {
      clearTokens()
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { __retried?: boolean }
    const status = error.response?.status

    if (
      status === 401 &&
      original &&
      !original.__retried &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      original.__retried = true
      const newToken = await attemptRefresh()
      if (newToken) {
        original.headers = original.headers ?? {}
        ;(original.headers as any).Authorization = `Bearer ${newToken}`
        return apiClient.request(original)
      }
      // Refresh failed → hard logout
      clearTokens()
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
