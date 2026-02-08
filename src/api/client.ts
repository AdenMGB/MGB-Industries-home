import type { UserWithoutPassword } from '../../server/types/index.js'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export interface ApiResponse<T> {
  data?: T
  error?: string
  details?: any
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('auth_token')

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle 401 (unauthorized) - clear token and redirect to login
      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }

      return {
        error: data.error || 'Request failed',
        details: data.details,
      }
    }

    return { data }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

export const api = {
  async signup(email: string, password: string, name: string) {
    return request<{ token: string; user: UserWithoutPassword }>(
      '/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      },
    )
  },

  async login(email: string, password: string) {
    return request<{ token: string; user: UserWithoutPassword }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    )
  },

  async getMe() {
    return request<{ user: UserWithoutPassword }>('/auth/me')
  },

  async getUsers() {
    return request<{ users: UserWithoutPassword[] }>('/users')
  },

  async getUser(id: number) {
    return request<{ user: UserWithoutPassword }>(`/users/${id}`)
  },
}
