import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '../api/api'
import type { User } from '../types'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  email: string
  full_name: string
  password: string
  role?: string
  branch_id?: number | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (data: LoginPayload) => Promise<User>
  register: (data: RegisterPayload) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const res = await api.get<User>('/auth/me')
      setUser(res.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (stored) {
      setToken(stored)
      api.defaults.headers.common.Authorization = `Bearer ${stored}`
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token && !user) {
      void fetchUser()
    }
  }, [token])

  const login = async (data: LoginPayload) => {
    const res = await api.post<{ access_token: string }>('/auth/login', {
      email: data.email,
      password: data.password,
    })
    const access = res.data.access_token
    localStorage.setItem('token', access)
    setToken(access)
    api.defaults.headers.common.Authorization = `Bearer ${access}`
    const me = await api.get<User>('/auth/me')
    setUser(me.data)
    return me.data
  }

  const register = async (data: RegisterPayload) => {
    await api.post('/auth/register', {
      email: data.email,
      full_name: data.full_name,
      password: data.password,
      role: data.role || 'WAITER',
      branch_id: data.branch_id ?? undefined,
    })
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common.Authorization
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
