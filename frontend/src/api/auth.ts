import { apiClient } from './client'
import type { User, CompanyDetails } from '@picsonar/shared/types'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokenStore'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone: string
  legal?: unknown
}

export interface AuthResponse {
  token: string
  refreshToken?: string
  user: User
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400))
      return {
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          userId: 'mock-user-id',
          email: credentials.email,
          name: credentials.email.split('@')[0],
          role: 'user',
          subscriptionStatus: 'active',
          eventCredits: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    }
    const resp = await apiClient.post('/auth/login', credentials)
    return resp.data
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500))
      return {
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          userId: 'mock-user-id-' + Date.now(),
          email: data.email,
          name: data.name,
          phone: data.phone,
          role: 'user',
          subscriptionStatus: 'inactive',
          eventCredits: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    }
    const resp = await apiClient.post('/auth/register', data)
    return resp.data
  },

  getCurrentUser: async (): Promise<User> => {
    const resp = await apiClient.get('/auth/me')
    return resp.data
  },

  updateProfile: async (companyDetails: CompanyDetails): Promise<void> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      return
    }
    await apiClient.patch('/auth/profile', { companyDetails })
  },

  /** @deprecated Use `tokenStore.getAccessToken()` directly. */
  getToken: (): string | null => getAccessToken(),

  /**
   * Best-effort server-side logout: tells the backend to add the refresh
   * token's jti to the revocation table. Network or 4xx errors here don't
   * block the client-side logout — we still clear local tokens either way,
   * otherwise an offline user could never sign out.
   */
  logout: async (): Promise<void> => {
    const rt = getRefreshToken()
    if (rt && !USE_MOCK) {
      try {
        await apiClient.post('/auth/logout', { refreshToken: rt })
      } catch (err) {
        // Swallow — see docstring.
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('auth.logout server call failed, clearing local tokens anyway', err)
        }
      }
    }
    clearTokens()
  },

  /**
   * Exchange the current refresh token for a new (access, refresh) pair.
   * Called by the axios interceptor when it sees a 401 on a protected
   * endpoint. Returns the new access token, or null if the refresh has
   * been revoked / expired — in which case the caller should log the user
   * out fully.
   */
  refreshSession: async (): Promise<string | null> => {
    const rt = getRefreshToken()
    if (!rt) return null
    try {
      const resp = await apiClient.post('/auth/refresh', { refreshToken: rt })
      const { token, refreshToken: newRefresh } = resp.data as {
        token: string
        refreshToken: string
      }
      setTokens({ accessToken: token, refreshToken: newRefresh })
      return token
    } catch {
      clearTokens()
      return null
    }
  },

  getOrders: async (): Promise<unknown[]> => {
    const resp = await apiClient.get('/orders/me')
    return resp.data?.orders ?? resp.data
  },

  verifyEmail: async (token: string): Promise<{ success: boolean; alreadyVerified: boolean }> => {
    const resp = await apiClient.post('/auth/verify-email', { token })
    return resp.data
  },

  resendVerificationEmail: async (): Promise<void> => {
    await apiClient.post('/auth/resend-verification', {})
  },

  getLogoUploadUrl: async (): Promise<{
    uploadUrl: string
    readUrl: string
    key: string
  }> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      return {
        uploadUrl: 'mock-upload-url',
        readUrl: 'https://via.placeholder.com/150',
        key: 'mock-key',
      }
    }
    const resp = await apiClient.get('/user/logo-upload-url')
    return resp.data
  },
}
