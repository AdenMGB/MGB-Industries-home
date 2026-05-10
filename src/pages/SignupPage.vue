<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { gsap } from 'gsap'
import {
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldExclamationIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const { signup } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const error = ref('')
const isLoading = ref(false)

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const passwordStrength = computed(() => {
  const v = password.value
  if (!v) return { score: 0, label: '—', tone: 'muted' as const }
  let score = 0
  if (v.length >= 8) score++
  if (v.length >= 12) score++
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++
  if (/\d/.test(v)) score++
  if (/[^A-Za-z0-9]/.test(v)) score++
  const tones = ['muted', 'weak', 'okay', 'good', 'great', 'great'] as const
  const labels = ['—', 'too short', 'okay', 'good', 'great', 'great']
  return { score: Math.min(score, 5), label: labels[score], tone: tones[score] }
})

onMounted(async () => {
  await nextTick()
  gsap.set('.auth-aside', { opacity: 0, x: -30 })
  gsap.set('.auth-card', { opacity: 0, y: 24, scale: 0.98 })
  gsap.set('.auth-field', { opacity: 0, y: 16 })

  const tl = gsap.timeline({ defaults: { ease: premiumEase } })
  tl.to('.auth-aside', { opacity: 1, x: 0, duration: 0.7 }, 0)
  tl.to('.auth-card', { opacity: 1, y: 0, scale: 1, duration: 0.6 }, 0.05)
  tl.to('.auth-field', { opacity: 1, y: 0, duration: 0.45, stagger: 0.06 }, 0.2)
})

const handleSubmit = async () => {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }

  isLoading.value = true
  try {
    await signup(email.value, password.value, name.value)
    const redirect = (route.query.redirect as string) || '/account'
    router.push(redirect)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Sign up failed'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen pt-32 pb-16 px-4 md:px-8 flex items-center justify-center">
    <div class="max-w-5xl w-full grid md:grid-cols-12 gap-10 md:gap-16 items-center">
      <aside class="auth-aside md:col-span-5 space-y-6">
        <p class="font-mono text-xs uppercase tracking-[0.32em] text-ochre-500/90">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-ochre-500 align-middle mr-2" />
          New here
        </p>
        <h1
          class="font-display text-balance text-5xl md:text-6xl tracking-tight leading-[0.95] text-charcoal-500 dark:text-cream-100"
        >
          Save your
          <span class="italic text-terracotta-500 dark:text-ochre-300">work.</span>
        </h1>
        <p class="text-base text-charcoal-300 dark:text-cream-100/70 leading-relaxed max-w-md">
          An account is optional &mdash; the toolkit is fully usable without one.
          Signing up just lets the conversion trainer remember you across devices,
          and lets you host private multiplayer rooms.
        </p>
        <ul class="space-y-2 pt-2 text-sm text-charcoal-400 dark:text-cream-100/70">
          <li class="flex items-center gap-2">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-ochre-500" />
            We ask for one email and one password. That&rsquo;s it.
          </li>
          <li class="flex items-center gap-2">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-eucalyptus-400" />
            No newsletters, no marketing emails, no upsells.
          </li>
          <li class="flex items-center gap-2">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-terracotta-500" />
            Delete the account at any time and the data goes with it.
          </li>
        </ul>
      </aside>

      <div class="md:col-span-7">
        <div class="auth-card rounded-3xl glass glass-edge p-8 md:p-10">
          <header class="mb-7">
            <p class="font-mono text-xs uppercase tracking-[0.32em] text-charcoal-200 dark:text-cream-100/50 mb-2">
              Create account
            </p>
            <h2 class="font-display text-3xl md:text-4xl tracking-tight text-charcoal-500 dark:text-cream-100">
              Pull up a chair.
            </h2>
          </header>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div
              v-if="error"
              class="auth-field rounded-xl px-4 py-3 bg-terracotta-500/10 ring-1 ring-terracotta-500/30 text-terracotta-500 text-sm flex items-center gap-2"
            >
              <ShieldExclamationIcon class="w-4 h-4 shrink-0" />
              {{ error }}
            </div>

            <div class="auth-field">
              <label
                for="name"
                class="block text-xs font-mono uppercase tracking-[0.24em] text-charcoal-300 dark:text-cream-100/60 mb-2"
              >
                Display name
              </label>
              <div class="relative">
                <UserIcon
                  class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-200 dark:text-cream-100/40"
                />
                <input
                  id="name"
                  v-model="name"
                  type="text"
                  required
                  autocomplete="name"
                  placeholder="What should we call you?"
                  class="w-full pl-11 pr-4 py-3 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 placeholder-charcoal-200 dark:placeholder-cream-100/30 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
                />
              </div>
            </div>

            <div class="auth-field">
              <label
                for="email"
                class="block text-xs font-mono uppercase tracking-[0.24em] text-charcoal-300 dark:text-cream-100/60 mb-2"
              >
                Email
              </label>
              <div class="relative">
                <EnvelopeIcon
                  class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-200 dark:text-cream-100/40"
                />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="you@example.com"
                  class="w-full pl-11 pr-4 py-3 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 placeholder-charcoal-200 dark:placeholder-cream-100/30 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
                />
              </div>
            </div>

            <div class="auth-field">
              <label
                for="password"
                class="flex items-center justify-between text-xs font-mono uppercase tracking-[0.24em] text-charcoal-300 dark:text-cream-100/60 mb-2"
              >
                <span>Password</span>
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
                  class="w-full pl-11 pr-4 py-3 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 placeholder-charcoal-200 dark:placeholder-cream-100/30 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
                />
              </div>
              <div class="mt-2 flex items-center gap-2">
                <div class="flex-1 grid grid-cols-5 gap-1 h-1">
                  <span
                    v-for="i in 5"
                    :key="i"
                    class="rounded-full transition-colors duration-300"
                    :class="
                      i <= passwordStrength.score
                        ? passwordStrength.score <= 1
                          ? 'bg-terracotta-500/70'
                          : passwordStrength.score <= 2
                            ? 'bg-ochre-500/60'
                            : passwordStrength.score <= 3
                              ? 'bg-ochre-500'
                              : 'bg-eucalyptus-400'
                        : 'bg-charcoal-500/10 dark:bg-cream-100/10'
                    "
                  />
                </div>
                <span class="text-[10px] uppercase tracking-widest font-mono text-charcoal-300 dark:text-cream-100/55">
                  {{ passwordStrength.label }}
                </span>
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
                  placeholder="One more time"
                  class="w-full pl-11 pr-4 py-3 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 placeholder-charcoal-200 dark:placeholder-cream-100/30 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              data-cursor="magnetic"
              class="auth-field group relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3.5 text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            >
              <span class="relative z-10 inline-flex items-center gap-2">
                {{ isLoading ? 'Setting up your shop…' : 'Create account' }}
                <ArrowRightIcon
                  class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                />
              </span>
              <span
                aria-hidden="true"
                class="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-[linear-gradient(120deg,transparent_0%,transparent_35%,rgba(255,255,255,0.45)_50%,transparent_65%,transparent_100%)] transition-transform duration-700"
              />
            </button>
          </form>

          <div
            class="mt-7 pt-5 border-t border-charcoal-500/8 dark:border-cream-100/10 flex items-center justify-between gap-3"
          >
            <p class="text-xs text-charcoal-300 dark:text-cream-100/55">
              By signing up, you agree to be a thoughtful neighbour.
            </p>
            <router-link
              :to="{
                path: '/login',
                query: route.query.redirect ? { redirect: route.query.redirect } : {},
              }"
              class="text-sm text-ochre-500 hover:text-terracotta-500 transition-colors font-medium"
            >
              Sign in →
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
