<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(async () => {
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

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    await login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/account'
    router.push(redirect)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed'
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
          Login
        </h1>
        <p class="text-base text-gray-600">
          Sign in to your account
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
          <form @submit.prevent="handleSubmit" class="space-y-6">
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

            <!-- Email -->
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div class="relative">
                <EnvelopeIcon
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  :class="cn(
                    'w-full pl-10 pr-4 py-3 rounded-lg',
                    'bg-white/60 border border-gray-200/50',
                    'text-gray-700 placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-peach/50',
                    'transition-all duration-300',
                  )"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <!-- Password -->
            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
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
                  autocomplete="current-password"
                  :class="cn(
                    'w-full pl-10 pr-4 py-3 rounded-lg',
                    'bg-white/60 border border-gray-200/50',
                    'text-gray-700 placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-peach/50',
                    'transition-all duration-300',
                  )"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <!-- Submit button -->
            <button
              type="submit"
              :disabled="isLoading"
              :class="cn(
                'w-full px-4 py-3 rounded-lg text-sm font-normal',
                'bg-peach/30 text-gray-800',
                'hover:bg-peach/40 transition-all duration-300',
                'transform-gpu hover:scale-105 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-peach/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )"
            >
              {{ isLoading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <!-- Signup link -->
          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              Don't have an account?
              <router-link
                to="/signup"
                class="text-peach hover:text-coral transition-colors duration-300 font-medium"
              >
                Sign up
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
