import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL 

export const api = axios.create({
  baseURL: `${API_BASE_URL.replace(/\/$/, '')}/api`,
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      const p = window.location.pathname
      if (!p.startsWith('/login') && !p.startsWith('/register') && !p.startsWith('/customer')) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
