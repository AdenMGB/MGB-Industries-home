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
    ...options.headers,
  }

  // Only set Content-Type for requests with a body
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
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

  async updateOwnAccount(data: { email?: string; name?: string }) {
    return request<{ user: UserWithoutPassword }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  async getUsers() {
    return request<{ users: UserWithoutPassword[] }>('/users')
  },

  async getUser(id: string) {
    return request<{ user: UserWithoutPassword }>(`/users/${id}`)
  },

  async updateUser(id: string, data: { email?: string; name?: string; role?: 'user' | 'admin' }) {
    return request<{ user: UserWithoutPassword }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async resetUserPassword(id: string) {
    return request<{ message: string; temporaryPassword: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
    })
  },

  async generateResetLink(id: string) {
    return request<{ message: string; resetLink: string; token: string; expiresAt: string }>(`/users/${id}/reset-link`, {
      method: 'POST',
    })
  },

  async deleteUser(id: string) {
    return request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    })
  },

  async getGameSaves() {
    return request<{ saves: Record<string, any> }>('/game-saves')
  },

  async getGameSave(gameId: string) {
    return request<{ saveData: any }>(`/game-saves/${gameId}`)
  },

  async saveGame(gameId: string, saveData: Record<string, any>) {
    return request<{ message: string }>('/game-saves', {
      method: 'POST',
      body: JSON.stringify({ gameId, saveData }),
    })
  },

  async deleteGameSave(gameId: string) {
    return request<{ message: string }>(`/game-saves/${gameId}`, {
      method: 'DELETE',
    })
  },
}
