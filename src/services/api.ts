import axios from 'axios'
import { API_URL } from '@/lib/constants'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add dev mode header from localStorage (persisted by zustand)
    // Read directly from localStorage to avoid circular dependency with store
    try {
      const uiStorage = localStorage.getItem('ui-storage')
      if (uiStorage) {
        const parsed = JSON.parse(uiStorage)
        if (parsed?.state?.devMode) {
          config.headers['X-Debug-Mode'] = 'true'
        }
      }
    } catch {
      // Ignore parse errors
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
