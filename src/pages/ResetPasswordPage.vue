<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { gsap } from 'gsap'
import {
  LockClosedIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()

const token = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const error = ref('')
const success = ref('')
const isLoading = ref(false)
const isValidatingToken = ref(true)
const tokenValid = ref(false)
const userEmail = ref('')

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(async () => {
  const tokenParam = route.query.token as string
  if (!tokenParam) {
    error.value = 'No reset token provided.'
    isValidatingToken.value = false
    return
  }

  token.value = tokenParam
  await verifyToken()

  await nextTick()

  gsap.set('.auth-card', { opacity: 0, y: 24, scale: 0.98 })
  gsap.set('.auth-field', { opacity: 0, y: 16 })

  const tl = gsap.timeline({ defaults: { ease: premiumEase } })
  tl.to('.auth-card', { opacity: 1, y: 0, scale: 1, duration: 0.6 }, 0)
  tl.to('.auth-field', { opacity: 1, y: 0, duration: 0.45, stagger: 0.06 }, 0.2)
})

async function verifyToken() {
  isValidatingToken.value = true
  error.value = ''
  try {
    const response = await fetch(
      `/api/auth/verify-reset-token?token=${encodeURIComponent(token.value)}`,
    )
    const data = await response.json()
    if (!response.ok) {
      error.value = data.error || 'Invalid or expired reset token.'
      tokenValid.value = false
    } else {
      tokenValid.value = true
      userEmail.value = data.email || ''
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to verify token.'
    tokenValid.value = false
  } finally {
    isValidatingToken.value = false
  }
}

async function handleSubmit() {
  error.value = ''
  success.value = ''
  if (!password.value || password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  isLoading.value = true
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value, password: password.value }),
    })
    const data = await response.json()
    if (!response.ok) {
      error.value = data.error || 'Failed to reset password.'
    } else {
      success.value = 'Password reset. Redirecting you to sign in…'
      setTimeout(() => router.push('/login'), 1700)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to reset password.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen pt-32 pb-16 px-4 md:px-8 flex items-center justify-center">
    <div class="max-w-md w-full">
      <div class="auth-card rounded-3xl glass glass-edge p-8 md:p-10">
        <header class="mb-7">
          <p class="font-mono text-xs uppercase tracking-[0.32em] text-ochre-500/90 mb-2">
            Recovery
          </p>
          <h1 class="font-display text-3xl md:text-4xl tracking-tight text-charcoal-500 dark:text-cream-100">
            New password,<br />
            <span class="italic text-terracotta-500 dark:text-ochre-300">fresh start.</span>
          </h1>
        </header>

        <div v-if="isValidatingToken" class="auth-field py-8 text-center">
          <span class="inline-block h-5 w-5 rounded-full border-2 border-ochre-500 border-t-transparent animate-spin" />
          <p class="mt-3 text-sm text-charcoal-300 dark:text-cream-100/60">
            Verifying reset token…
          </p>
        </div>

        <div v-else-if="!tokenValid" class="auth-field space-y-4">
          <div
            class="rounded-xl px-4 py-3 bg-terracotta-500/10 ring-1 ring-terracotta-500/30 text-terracotta-500 text-sm flex items-start gap-2"
          >
            <ShieldExclamationIcon class="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p class="font-medium">Invalid or expired link</p>
              <p class="opacity-80 mt-0.5">{{ error }}</p>
            </div>
          </div>
          <router-link
            to="/login"
            class="block w-full text-center rounded-xl px-5 py-3 text-sm font-medium text-charcoal-500 dark:text-cream-100 ring-1 ring-charcoal-500/15 dark:ring-cream-100/15 hover:ring-ochre-500/40 hover:bg-ochre-500/5 transition-all duration-300"
          >
            Back to sign in
          </router-link>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-5">
          <div
            v-if="success"
            class="auth-field rounded-xl px-4 py-3 bg-eucalyptus-400/10 ring-1 ring-eucalyptus-400/30 text-eucalyptus-500 text-sm flex items-center gap-2"
          >
            <CheckCircleIcon class="w-4 h-4 shrink-0" />
            {{ success }}
          </div>

          <div
            v-if="error"
            class="auth-field rounded-xl px-4 py-3 bg-terracotta-500/10 ring-1 ring-terracotta-500/30 text-terracotta-500 text-sm flex items-center gap-2"
          >
            <ShieldExclamationIcon class="w-4 h-4 shrink-0" />
            {{ error }}
          </div>

          <div
            v-if="userEmail"
            class="auth-field rounded-xl px-4 py-3 bg-cream-100/50 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/8 dark:ring-cream-100/8 text-sm text-charcoal-400 dark:text-cream-100/75"
          >
            <span class="font-mono text-[10px] uppercase tracking-widest text-charcoal-200 dark:text-cream-100/50 mr-2">
              Account
            </span>
            {{ userEmail }}
          </div>

          <div class="auth-field">
            <label
              for="password"
              class="flex items-center justify-between text-xs font-mono uppercase tracking-[0.24em] text-charcoal-300 dark:text-cream-100/60 mb-2"
            >
              <span>New password</span>
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="inline-flex items-center gap-1 text-charcoal-300 hover:text-ochre-500 transition-colors normal-case tracking-normal font-sans"
              >
                <EyeSlashIcon v-if="showPassword" class="w-3.5 h-3.5" />
                <EyeIcon v-else class="w-3.5 h-3.5" />
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </label>
            <div class="relative">
              <LockClosedIcon
                class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-200 dark:text-cream-100/40"
              />
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="At least 8 characters"
                minlength="8"
                class="w-full pl-11 pr-4 py-3 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 placeholder-charcoal-200 dark:placeholder-cream-100/30 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
              />
            </div>
          </div>

          <div class="auth-field">
            <label
              for="confirmPassword"
              class="block text-xs font-mono uppercase tracking-[0.24em] text-charcoal-300 dark:text-cream-100/60 mb-2"
            >
              Confirm password
            </label>
            <div class="relative">
              <LockClosedIcon
                class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-200 dark:text-cream-100/40"
              />
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                minlength="8"
                placeholder="One more time"
                class="w-full pl-11 pr-4 py-3 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 placeholder-charcoal-200 dark:placeholder-cream-100/30 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading || !!success"
            data-cursor="magnetic"
            class="auth-field group relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3.5 text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            <span class="relative z-10 inline-flex items-center gap-2">
              {{ isLoading ? 'Resetting…' : success ? 'Redirecting…' : 'Reset password' }}
              <ArrowRightIcon class="w-4 h-4" />
            </span>
            <span
              aria-hidden="true"
              class="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-[linear-gradient(120deg,transparent_0%,transparent_35%,rgba(255,255,255,0.45)_50%,transparent_65%,transparent_100%)] transition-transform duration-700"
            />
          </button>
        </form>

        <div
          v-if="tokenValid && !success"
          class="mt-7 pt-5 border-t border-charcoal-500/8 dark:border-cream-100/10 flex items-center justify-between gap-3"
        >
          <p class="text-xs text-charcoal-300 dark:text-cream-100/55">
            Remembered it?
          </p>
          <router-link
            to="/login"
            class="text-sm text-ochre-500 hover:text-terracotta-500 transition-colors font-medium"
          >
            Sign in →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
