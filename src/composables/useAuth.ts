import { ref, computed } from 'vue'
import { api } from '../api/client'
import type { UserWithoutPassword } from '../../server/types/index.js'
import { getCookie, setCookie, removeCookie } from '@/utils/cookies'

const user = ref<UserWithoutPassword | null>(null)
const token = ref<string | null>(getCookie('auth_token'))

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(email: string, password: string) {
    const response = await api.login(email, password)

    if (response.error || !response.data) {
      throw new Error(response.error || 'Login failed')
    }

    token.value = response.data.token
    user.value = response.data.user
    setCookie('auth_token', response.data.token)

    return response.data
  }

  async function signup(email: string, password: string, name: string) {
    const response = await api.signup(email, password, name)

    if (response.error || !response.data) {
      throw new Error(response.error || 'Signup failed')
    }

    token.value = response.data.token
    user.value = response.data.user
    setCookie('auth_token', response.data.token)

    return response.data
  }

  async function checkAuth() {
    const storedToken = getCookie('auth_token')
    if (!storedToken) {
      user.value = null
      token.value = null
      return false
    }

    // Set token immediately (optimistic) so UI can render
    token.value = storedToken

    try {
      const response = await api.getMe()
      if (response.error || !response.data) {
        removeCookie('auth_token')
        user.value = null
        token.value = null
        return false
      }

      user.value = response.data.user
      token.value = storedToken
      return true
    } catch (error) {
      removeCookie('auth_token')
      user.value = null
      token.value = null
      return false
    }
  }

  function logout() {
    removeCookie('auth_token')
    user.value = null
    token.value = null
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    login,
    signup,
    logout,
    checkAuth,
  }
}
