import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types'
import { authApi } from '../api/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, legal?: any) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (token) {
      authApi.getCurrentUser()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('authToken')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { token, user } = await authApi.login({ email, password })
    // Ensure subscriptionStatus exists for existing users in local storage if not returned by API (mock)
    if (!user.subscriptionStatus) {
      user.subscriptionStatus = 'inactive' // Default to inactive or active for testing? Let's say inactive to test enforcement.
      // Actually, for immediate testing, let's make it 'active' for existing users or handle it.
      // The requirement is strict, so maybe 'inactive'.
    }
    localStorage.setItem('authToken', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }

  const register = async (email: string, password: string, name: string, legal?: any) => {
    const { token, user } = await authApi.register({ email, password, name, legal })
    // New users get a trial or inactive? User didn't specify trial.
    // "Abone olmazsa" -> implies they start as inactive until they subscribe.
    if (!user.subscriptionStatus) user.subscriptionStatus = 'inactive'

    localStorage.setItem('authToken', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }

  const logout = () => {
    authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

