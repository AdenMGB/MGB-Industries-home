<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '@/api/client'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import { LockClosedIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()

const token = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const isLoading = ref(false)
const isValidatingToken = ref(true)
const tokenValid = ref(false)
const userEmail = ref('')

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(async () => {
  // Get token from query params
  const tokenParam = route.query.token as string
  if (!tokenParam) {
    error.value = 'No reset token provided'
    isValidatingToken.value = false
    return
  }

  token.value = tokenParam
  await verifyToken()

  await nextTick()
  
  gsap.set('.page-header', { opacity: 0, y: 30, scale: 0.96 })
  gsap.set('.form-container', { opacity: 0, y: 20, scale: 0.98 })
  
  const tl = gsap.timeline({ defaults: { ease: premiumEase } })
  
  tl.to('.page-header', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.6,
  }, 0)
  
  tl.to('.form-container', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.5,
    delay: 0.1,
  }, 0)
})

async function verifyToken() {
  isValidatingToken.value = true
  error.value = ''
  
  try {
    const response = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token.value)}`)
    const data = await response.json()
    
    if (!response.ok) {
      error.value = data.error || 'Invalid or expired reset token'
      tokenValid.value = false
    } else {
      tokenValid.value = true
      userEmail.value = data.email || ''
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to verify token'
    tokenValid.value = false
  } finally {
    isValidatingToken.value = false
  }
}

async function handleSubmit() {
  error.value = ''
  success.value = ''
  
  // Validation
  if (!password.value || password.value.length < 8) {
    error.value = 'Password must be at least 8 characters long'
    return
  }
  
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  
  isLoading.value = true
  
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token.value,
        password: password.value,
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      error.value = data.error || 'Failed to reset password'
    } else {
      success.value = 'Password reset successfully! Redirecting to login...'
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to reset password'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8 flex items-center justify-center">
    <div class="max-w-md w-full">
      <!-- Header -->
      <div class="page-header mb-8 text-center">
        <h1 class="text-5xl md:text-6xl font-light mb-4 tracking-tight text-gray-800">
          Reset Password
        </h1>
        <p class="text-base text-gray-600">
          Enter your new password
        </p>
      </div>

      <!-- Form -->
      <div class="form-container">
        <div
          :class="cn(
            'p-8 rounded-xl',
            'bg-white/40 backdrop-blur-md',
            'border border-gray-200/50',
            'shadow-lg',
          )"
        >
          <!-- Token Validation -->
          <div v-if="isValidatingToken" class="text-center py-8">
            <p class="text-gray-600">Verifying reset token...</p>
          </div>

          <!-- Invalid Token -->
          <div v-else-if="!tokenValid" class="space-y-4">
            <div
              :class="cn(
                'p-4 rounded-lg flex items-start gap-3',
                'bg-red-50 border border-red-200',
              )"
            >
              <XCircleIcon class="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
              <div class="flex-1">
                <p class="text-red-700 font-medium mb-1">Invalid Reset Link</p>
                <p class="text-red-600 text-sm">{{ error }}</p>
              </div>
            </div>
            <router-link
              to="/login"
              :class="cn(
                'block w-full text-center px-4 py-3 rounded-lg text-sm font-medium',
                'bg-peach/30 hover:bg-peach/40 text-gray-800',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
              )"
            >
              Go to Login
            </router-link>
          </div>

          <!-- Reset Form -->
          <form v-else @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Success message -->
            <div
              v-if="success"
              :class="cn(
                'p-4 rounded-lg flex items-start gap-3',
                'bg-green-50 border border-green-200',
              )"
            >
              <CheckCircleIcon class="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
              <p class="text-green-700 text-sm">{{ success }}</p>
            </div>

            <!-- Error message -->
            <div
              v-if="error"
              :class="cn(
                'p-4 rounded-lg',
                'bg-red-50 border border-red-200',
                'text-red-700 text-sm',
              )"
            >
              {{ error }}
            </div>

            <!-- User Email Info -->
            <div
              v-if="userEmail"
              :class="cn(
                'p-3 rounded-lg',
                'bg-peach/20 border border-peach/30',
              )"
            >
              <p class="text-sm text-gray-700">
                <span class="font-medium">Account:</span> {{ userEmail }}
              </p>
            </div>

            <!-- New Password -->
            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <div class="relative">
                <LockClosedIcon
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                />
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  required
                  autocomplete="new-password"
                  :class="cn(
                    'w-full pl-10 pr-4 py-3 rounded-lg',
                    'bg-white/60 border border-gray-200/50',
                    'text-gray-700 placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-peach/50',
                    'transition-all duration-300',
                  )"
                  placeholder="Enter new password (min. 8 characters)"
                  minlength="8"
                />
              </div>
            </div>

            <!-- Confirm Password -->
            <div>
              <label
                for="confirmPassword"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <div class="relative">
                <LockClosedIcon
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                />
                <input
                  id="confirmPassword"
                  v-model="confirmPassword"
                  type="password"
                  required
                  autocomplete="new-password"
                  :class="cn(
                    'w-full pl-10 pr-4 py-3 rounded-lg',
                    'bg-white/60 border border-gray-200/50',
                    'text-gray-700 placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-peach/50',
                    'transition-all duration-300',
                  )"
                  placeholder="Confirm new password"
                  minlength="8"
                />
              </div>
            </div>

            <!-- Submit button -->
            <button
              type="submit"
              :disabled="isLoading || !!success"
              :class="cn(
                'w-full px-4 py-3 rounded-lg text-sm font-normal',
                'bg-peach/30 text-gray-800',
                'hover:bg-peach/40 transition-all duration-300',
                'transform-gpu hover:scale-105 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-peach/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )"
            >
              {{ isLoading ? 'Resetting Password...' : success ? 'Redirecting...' : 'Reset Password' }}
            </button>
          </form>

          <!-- Login link -->
          <div v-if="tokenValid" class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              Remember your password?
              <router-link
                to="/login"
                class="text-peach hover:text-coral transition-colors duration-300 font-medium"
              >
                Sign in
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
