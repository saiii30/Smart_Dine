import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, companyName?: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      fetchUser(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (_authToken: string) => {
    try {
      const response = await axios.get('/api/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      // Clear any existing token/headers before login
      delete axios.defaults.headers.common['Authorization']
      
      const formData = new FormData()
      formData.append('username', email)
      formData.append('password', password)

      const response = await axios.post('/api/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const { access_token } = response.data
      
      // Set new token and headers
      setToken(access_token)
      localStorage.setItem('token', access_token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      // Fetch user data
      await fetchUser(access_token)
    } catch (error: any) {
      // Clear any partial state on error
      setToken(null)
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      
      // Extract error message from response
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (typeof detail === 'string') {
          throw new Error(detail)
        }
      }
      // If no detail message, use a generic error message
      throw new Error(error.response?.data?.message || error.message || 'Failed to login')
    }
  }

  const register = async (email: string, password: string, fullName: string, companyName?: string) => {
    try {
      await axios.post('/api/auth/register', {
        email,
        password,
        full_name: fullName,
        company_name: companyName || null,
      })
      await login(email, password)
    } catch (error: any) {
      // Handle different error status codes
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        
        // Handle 422 validation errors (array format)
        if (error.response?.status === 422 && Array.isArray(detail)) {
          // Multiple validation errors
          const errorMessages = detail.map((err: any) => {
            // Extract field name from location array (skip 'body' if present)
            const loc = err.loc || []
            const fieldName = loc.filter((item: string) => item !== 'body').pop() || 'field'
            
            // Clean up error message (remove "Value error," prefix if present)
            let msg = err.msg || 'Invalid value'
            msg = msg.replace(/^Value error,\s*/i, '').trim()
            
            // Capitalize field name for display
            const displayFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
            
            return `${displayFieldName}: ${msg}`
          })
          throw new Error(errorMessages.join('. '))
        } 
        // Handle string detail messages (400, 401, etc.)
        else if (typeof detail === 'string') {
          throw new Error(detail)
        }
      }
      // If no detail message, use a generic error message
      throw new Error(error.response?.data?.message || error.message || 'An error occurred during registration')
    }
  }

  const logout = () => {
    // Clear all state
    setUser(null)
    setToken(null)
    setLoading(false)
    
    // Clear localStorage
    localStorage.removeItem('token')
    
    // Clear axios default headers
    delete axios.defaults.headers.common['Authorization']
    
    // Clear any axios interceptors or cached requests
    // Force a full page reload to ensure clean state
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

