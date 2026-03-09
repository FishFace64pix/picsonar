import { apiClient } from './client'
import { User, CompanyDetails } from '../types'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  legal?: any
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
console.log('Auth API: Mock Mode is:', USE_MOCK, 'Value:', import.meta.env.VITE_USE_MOCK)

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ token: string; user: User }> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay

      // Mock success response
      const mockUser: User = {
        userId: 'mock-user-id',
        email: credentials.email,
        name: credentials.email.split('@')[0],
        subscriptionStatus: 'active',
        eventCredits: 5 // Mock credits
      }

      return {
        token: 'mock-jwt-token',
        user: mockUser
      }
    }

    const response = await apiClient.post('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterData): Promise<{ token: string; user: User }> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 800)) // Simulate network delay

      const mockUser: User = {
        userId: 'mock-user-id-' + Date.now(),
        email: data.email,
        name: data.name,
        subscriptionStatus: 'active',
        eventCredits: 1
      }

      return {
        token: 'mock-jwt-token',
        user: mockUser
      }
    }

    const response = await apiClient.post('/auth/register', data)
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    if (USE_MOCK) {
      // In a real app, we would validate the token here.
      // For mock, we check if we have stored user data in localStorage (handled by Context mostly, but here if needed)
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        return JSON.parse(storedUser)
      }
      // Fallback or throw error if not logged in
      throw new Error('User not found')
    }

    const response = await apiClient.get('/auth/me')
    return response.data
  },

  updateProfile: async (companyDetails: CompanyDetails): Promise<void> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return
    }
    await apiClient.put('/auth/profile', { companyDetails })
  },

  getToken: () => {
    return localStorage.getItem('authToken')
  },

  logout: () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    if (!USE_MOCK) {
      // Optional: Call logout endpoint if exists
    }
  },

  getOrders: async (): Promise<any[]> => {
    const response = await apiClient.get('/orders/me')
    return response.data
  },

  getLogoUploadUrl: async (): Promise<{ uploadUrl: string, readUrl: string, key: string }> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return {
        uploadUrl: 'mock-upload-url',
        readUrl: 'https://via.placeholder.com/150',
        key: 'mock-key'
      }
    }
    const response = await apiClient.get('/user/logo-upload-url')
    return response.data
  }
}
