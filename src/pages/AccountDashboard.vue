<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { api } from '@/api/client'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import {
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  LockClosedIcon,
  XMarkIcon,
  CheckIcon,
  BoltIcon,
  ClockIcon,
  CalendarDaysIcon,
  TrophyIcon,
  ChartBarIcon,
  KeyIcon,
  ArrowRightIcon,
  ShieldExclamationIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/vue/24/outline'
import {
  StarIcon,
  HeartIcon,
  TrophyIcon as TrophyIconSolid,
} from '@heroicons/vue/24/solid'
import { CONVERSION_TRAINER_ACHIEVEMENTS } from '@/config/conversionTrainerAchievements'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { success, error: showError } = useToast()
const { user, isAdmin, logout, checkAuth } = useAuth()

type EditField = null | 'name' | 'email' | 'password'
const editingField = ref<EditField>(null)

const editName = ref('')
const editEmail = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrent = ref(false)
const showNew = ref(false)

const errorMessage = ref('')
const isLoading = ref(false)

const conversionAchievements = ref<Set<string>>(new Set())
const conversionProgress = ref<{
  totalXp: number
  level: number
  bestStreak: number
  bestClassicStreak: number
  dailyStreak: number
  bestSpeedRound: number
  bestSurvival: number
  bestNibbleSprint: number
  bestOctetSprint: number
} | null>(null)

const achievementIcons: Record<string, typeof TrophyIconSolid> = {
  trophy: TrophyIconSolid,
  bolt: BoltIcon,
  heart: HeartIcon,
  clock: ClockIcon,
  star: StarIcon,
}

const totalAchievements = computed(() => Object.keys(CONVERSION_TRAINER_ACHIEVEMENTS).length)
const achievementPct = computed(() =>
  totalAchievements.value === 0
    ? 0
    : Math.round((conversionAchievements.value.size / totalAchievements.value) * 100),
)

const memberSince = computed(() => {
  if (!user.value?.created_at) return null
  return new Date(user.value.created_at)
})
const memberSinceLabel = computed(() => memberSince.value?.toLocaleDateString())
const daysAsMember = computed(() => {
  if (!memberSince.value) return 0
  const ms = Date.now() - memberSince.value.getTime()
  return Math.max(1, Math.floor(ms / 86_400_000))
})

const initial = computed(() =>
  (user.value?.name || user.value?.email || 'A').slice(0, 1).toUpperCase(),
)

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(async () => {
  try {
    const [achievementsRes, progressRes] = await Promise.all([
      api.getConversionAchievements(),
      api.getConversionProgress(),
    ])
    if (achievementsRes.data?.achievements) {
      conversionAchievements.value = new Set(
        achievementsRes.data.achievements.map((a) => a.id),
      )
    }
    if (progressRes.data) {
      conversionProgress.value = progressRes.data
    }
  } catch (err) {
    console.warn('Failed to load conversion trainer data:', err)
  }

  await nextTick()

  gsap.set('.account-hero', { opacity: 0, y: 30, scale: 0.97 })
  gsap.set('.account-card', { opacity: 0, y: 28, scale: 0.98 })

  const tl = gsap.timeline({ defaults: { ease: premiumEase } })
  tl.to('.account-hero', { opacity: 1, y: 0, scale: 1, duration: 0.7 }, 0)
  tl.to(
    '.account-card',
    { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.07 },
    0.1,
  )
})

function startEditing(field: 'name' | 'email' | 'password') {
  errorMessage.value = ''
  editingField.value = field
  if (field === 'name') editName.value = user.value?.name || ''
  if (field === 'email') editEmail.value = user.value?.email || ''
  if (field === 'password') {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
}

function cancelEditing() {
  editingField.value = null
  errorMessage.value = ''
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

async function saveName() {
  if (!editName.value || editName.value.length < 1) {
    errorMessage.value = 'Name cannot be empty.'
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await api.updateOwnAccount({ name: editName.value })
    if (res.error) {
      errorMessage.value = res.error
      showError(res.error)
    } else {
      await checkAuth()
      success('Name updated.')
      editingField.value = null
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update name.'
    errorMessage.value = msg
    showError(msg)
  } finally {
    isLoading.value = false
  }
}

async function saveEmail() {
  if (!editEmail.value || !editEmail.value.includes('@')) {
    errorMessage.value = 'Please enter a valid email address.'
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await api.updateOwnAccount({ email: editEmail.value })
    if (res.error) {
      errorMessage.value = res.error
      showError(res.error)
    } else {
      await checkAuth()
      success('Email updated.')
      editingField.value = null
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update email.'
    errorMessage.value = msg
    showError(msg)
  } finally {
    isLoading.value = false
  }
}

async function savePassword() {
  if (!currentPassword.value) {
    errorMessage.value = 'Enter your current password.'
    return
  }
  if (!newPassword.value || newPassword.value.length < 8) {
    errorMessage.value = 'New password must be at least 8 characters.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'New passwords do not match.'
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await api.changePassword(currentPassword.value, newPassword.value)
    if (res.error) {
      errorMessage.value = res.error
      showError(res.error)
    } else {
      success('Password changed.')
      editingField.value = null
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to change password.'
    errorMessage.value = msg
    showError(msg)
  } finally {
    isLoading.value = false
  }
}

const handleLogout = () => {
  logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen pt-32 pb-24 px-4 md:px-8">
    <div class="max-w-6xl mx-auto">
      <!-- Hero header -->
      <header class="account-hero mb-12 md:mb-16">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div class="flex items-center gap-5">
            <div
              class="relative shrink-0 inline-flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-ochre-400 via-ochre-500 to-terracotta-500 text-cream-100 font-display text-4xl md:text-5xl font-semibold shadow-edge-ochre"
            >
              {{ initial }}
              <span
                v-if="isAdmin"
                class="absolute -bottom-1.5 -right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-charcoal-500 text-ochre-300 ring-2 ring-cream"
                :title="'Admin'"
              >
                <ShieldCheckIcon class="w-4 h-4" />
              </span>
            </div>
            <div>
              <p class="font-mono text-xs uppercase tracking-[0.32em] text-ochre-500/90 mb-2">
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-ochre-500 align-middle mr-2" />
                Account
              </p>
              <h1
                class="font-display text-balance text-4xl md:text-6xl tracking-tight leading-[0.95] text-charcoal-500 dark:text-cream-100"
              >
                Hello,
                <span class="italic text-terracotta-500 dark:text-ochre-300">
                  {{ user?.name?.split(' ')[0] || 'there' }}.
                </span>
              </h1>
              <p class="mt-3 text-base text-charcoal-300 dark:text-cream-100/70 max-w-lg">
                Quietly tend to your details. Watch your conversion trainer practice grow.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <router-link
              v-if="isAdmin"
              to="/admin"
              data-cursor="magnetic"
              class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-charcoal-500 dark:text-cream-100 ring-1 ring-charcoal-500/15 dark:ring-cream-100/15 hover:ring-terracotta-500/40 hover:bg-terracotta-500/5 transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
            >
              <ShieldCheckIcon class="w-4 h-4 text-terracotta-500" />
              Admin Dashboard
            </router-link>
            <button
              @click="handleLogout"
              data-cursor="magnetic"
              class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-terracotta-500 ring-1 ring-terracotta-500/30 hover:bg-terracotta-500/10 transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
            >
              <ArrowRightOnRectangleIcon class="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      </header>

      <!-- Quick stats strip -->
      <section
        class="account-card mb-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
      >
        <div class="rounded-2xl glass glass-edge p-4 md:p-5">
          <div class="flex items-center gap-2 text-charcoal-300 dark:text-cream-100/60 text-xs font-mono uppercase tracking-[0.24em] mb-2">
            <CalendarDaysIcon class="w-4 h-4 text-ochre-500" />
            Member
          </div>
          <p class="font-display text-2xl md:text-3xl text-charcoal-500 dark:text-cream-100 leading-tight">
            {{ daysAsMember }} <span class="text-base text-charcoal-300 dark:text-cream-100/60">days</span>
          </p>
          <p class="text-xs text-charcoal-200 dark:text-cream-100/50 mt-1">
            Since {{ memberSinceLabel || '—' }}
          </p>
        </div>
        <div class="rounded-2xl glass glass-edge p-4 md:p-5">
          <div class="flex items-center gap-2 text-charcoal-300 dark:text-cream-100/60 text-xs font-mono uppercase tracking-[0.24em] mb-2">
            <ChartBarIcon class="w-4 h-4 text-ochre-500" />
            Level
          </div>
          <p class="font-display text-2xl md:text-3xl text-charcoal-500 dark:text-cream-100 leading-tight">
            {{ conversionProgress?.level ?? 0 }}
          </p>
          <p class="text-xs text-charcoal-200 dark:text-cream-100/50 mt-1">
            {{ conversionProgress?.totalXp ?? 0 }} XP earned
          </p>
        </div>
        <div class="rounded-2xl glass glass-edge p-4 md:p-5">
          <div class="flex items-center gap-2 text-charcoal-300 dark:text-cream-100/60 text-xs font-mono uppercase tracking-[0.24em] mb-2">
            <BoltIcon class="w-4 h-4 text-terracotta-500" />
            Best streak
          </div>
          <p class="font-display text-2xl md:text-3xl text-charcoal-500 dark:text-cream-100 leading-tight">
            {{ conversionProgress?.bestStreak ?? 0 }}
          </p>
          <p class="text-xs text-charcoal-200 dark:text-cream-100/50 mt-1">
            Daily streak: {{ conversionProgress?.dailyStreak ?? 0 }}
          </p>
        </div>
        <div class="rounded-2xl glass glass-edge p-4 md:p-5">
          <div class="flex items-center gap-2 text-charcoal-300 dark:text-cream-100/60 text-xs font-mono uppercase tracking-[0.24em] mb-2">
            <TrophyIcon class="w-4 h-4 text-ochre-500" />
            Achievements
          </div>
          <p class="font-display text-2xl md:text-3xl text-charcoal-500 dark:text-cream-100 leading-tight">
            {{ conversionAchievements.size }}
            <span class="text-base text-charcoal-300 dark:text-cream-100/60">
              / {{ totalAchievements }}
            </span>
          </p>
          <div class="mt-2 h-1 rounded-full bg-charcoal-500/10 dark:bg-cream-100/10 overflow-hidden">
            <div
              class="h-full rounded-full bg-gradient-to-r from-ochre-500 to-terracotta-500 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
              :style="{ width: achievementPct + '%' }"
            />
          </div>
        </div>
      </section>

      <div class="grid lg:grid-cols-3 gap-6 md:gap-8">
        <!-- Main column: Identity + Security -->
        <div class="lg:col-span-2 space-y-6 md:space-y-8">
          <!-- Identity card -->
          <section class="account-card rounded-3xl glass glass-edge p-6 md:p-8">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="font-display text-2xl md:text-3xl text-charcoal-500 dark:text-cream-100 tracking-tight">
                  Identity
                </h2>
                <p class="text-sm text-charcoal-300 dark:text-cream-100/60 mt-1">
                  How you appear across the toolkit.
                </p>
              </div>
            </div>

            <div
              v-if="errorMessage && (editingField === 'name' || editingField === 'email')"
              class="mb-5 rounded-xl px-4 py-3 bg-terracotta-500/10 ring-1 ring-terracotta-500/30 text-terracotta-500 text-sm flex items-center gap-2"
            >
              <ShieldExclamationIcon class="w-4 h-4 shrink-0" />
              {{ errorMessage }}
            </div>

            <div class="divide-y divide-charcoal-500/8 dark:divide-cream-100/10">
              <!-- Name row -->
              <div class="py-4 first:pt-0 last:pb-0">
                <div class="flex items-start gap-4">
                  <span
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-500/15 text-ochre-500"
                  >
                    <UserIcon class="w-5 h-5" />
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-mono uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50 mb-1">
                      Display name
                    </p>
                    <div v-if="editingField !== 'name'" class="flex items-center gap-3">
                      <p class="font-display text-xl md:text-2xl text-charcoal-500 dark:text-cream-100 truncate">
                        {{ user?.name }}
                      </p>
                      <button
                        @click="startEditing('name')"
                        class="ml-auto inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ring-1 ring-charcoal-500/12 dark:ring-cream-100/12 text-charcoal-400 dark:text-cream-100/80 hover:ring-ochre-500/40 hover:text-ochre-500 transition-all duration-300 hover:scale-[1.04]"
                      >
                        <PencilIcon class="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                    <div v-else class="flex flex-col sm:flex-row gap-2 mt-1">
                      <input
                        v-model="editName"
                        type="text"
                        :disabled="isLoading"
                        class="flex-1 px-4 py-2.5 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 placeholder-charcoal-200 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
                        placeholder="Your name"
                      />
                      <div class="flex gap-2">
                        <button
                          @click="saveName"
                          :disabled="isLoading"
                          class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 hover:shadow-glow hover:scale-[1.04] disabled:opacity-50"
                        >
                          <CheckIcon class="w-4 h-4" />
                          Save
                        </button>
                        <button
                          @click="cancelEditing"
                          :disabled="isLoading"
                          class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-charcoal-400 dark:text-cream-100/80 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 hover:bg-charcoal-500/5 transition-all duration-300"
                        >
                          <XMarkIcon class="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Email row -->
              <div class="py-4">
                <div class="flex items-start gap-4">
                  <span
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-500/15 text-terracotta-500"
                  >
                    <EnvelopeIcon class="w-5 h-5" />
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-mono uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50 mb-1">
                      Email
                    </p>
                    <div v-if="editingField !== 'email'" class="flex items-center gap-3">
                      <p class="font-display text-xl md:text-2xl text-charcoal-500 dark:text-cream-100 truncate">
                        {{ user?.email }}
                      </p>
                      <button
                        @click="startEditing('email')"
                        class="ml-auto inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ring-1 ring-charcoal-500/12 dark:ring-cream-100/12 text-charcoal-400 dark:text-cream-100/80 hover:ring-terracotta-500/40 hover:text-terracotta-500 transition-all duration-300 hover:scale-[1.04]"
                      >
                        <PencilIcon class="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                    <div v-else class="flex flex-col sm:flex-row gap-2 mt-1">
                      <input
                        v-model="editEmail"
                        type="email"
                        :disabled="isLoading"
                        class="flex-1 px-4 py-2.5 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 placeholder-charcoal-200 focus:outline-none focus:ring-2 focus:ring-terracotta-500/60 transition-all"
                        placeholder="you@example.com"
                      />
                      <div class="flex gap-2">
                        <button
                          @click="saveEmail"
                          :disabled="isLoading"
                          class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 hover:shadow-glow hover:scale-[1.04] disabled:opacity-50"
                        >
                          <CheckIcon class="w-4 h-4" />
                          Save
                        </button>
                        <button
                          @click="cancelEditing"
                          :disabled="isLoading"
                          class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-charcoal-400 dark:text-cream-100/80 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 hover:bg-charcoal-500/5 transition-all duration-300"
                        >
                          <XMarkIcon class="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Role row -->
              <div class="py-4">
                <div class="flex items-start gap-4">
                  <span
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-eucalyptus-400/20 text-eucalyptus-500"
                  >
                    <ShieldCheckIcon class="w-5 h-5" />
                  </span>
                  <div class="flex-1">
                    <p class="text-xs font-mono uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50 mb-1">
                      Role
                    </p>
                    <div class="flex items-center gap-2">
                      <p class="font-display text-xl md:text-2xl text-charcoal-500 dark:text-cream-100 capitalize">
                        {{ user?.role }}
                      </p>
                      <span
                        v-if="isAdmin"
                        class="px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded-md bg-terracotta-500/15 text-terracotta-500"
                      >
                        Elevated
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Security card -->
          <section class="account-card rounded-3xl glass glass-edge p-6 md:p-8">
            <div class="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 class="font-display text-2xl md:text-3xl text-charcoal-500 dark:text-cream-100 tracking-tight">
                  Security
                </h2>
                <p class="text-sm text-charcoal-300 dark:text-cream-100/60 mt-1">
                  Rotate your password regularly. Long passphrases beat clever ones.
                </p>
              </div>
              <span
                class="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta-500/15 text-terracotta-500"
              >
                <KeyIcon class="w-5 h-5" />
              </span>
            </div>

            <div
              v-if="errorMessage && editingField === 'password'"
              class="mb-5 rounded-xl px-4 py-3 bg-terracotta-500/10 ring-1 ring-terracotta-500/30 text-terracotta-500 text-sm flex items-center gap-2"
            >
              <ShieldExclamationIcon class="w-4 h-4 shrink-0" />
              {{ errorMessage }}
            </div>

            <div v-if="editingField !== 'password'" class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-charcoal-500/8 dark:bg-cream-100/8 text-charcoal-400 dark:text-cream-100/80">
                  <LockClosedIcon class="w-5 h-5" />
                </span>
                <div>
                  <p class="text-xs font-mono uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50 mb-1">
                    Password
                  </p>
                  <p class="font-display text-xl md:text-2xl text-charcoal-500 dark:text-cream-100">
                    ••••••••••
                  </p>
                </div>
              </div>
              <button
                @click="startEditing('password')"
                class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 hover:shadow-glow hover:scale-[1.04] active:scale-[0.97]"
              >
                Change
                <ArrowRightIcon class="w-4 h-4" />
              </button>
            </div>

            <div v-else class="space-y-4">
              <div class="relative">
                <label class="block text-xs font-mono uppercase tracking-[0.24em] text-charcoal-300 dark:text-cream-100/60 mb-2">
                  Current password
                </label>
                <input
                  v-model="currentPassword"
                  :type="showCurrent ? 'text' : 'password'"
                  :disabled="isLoading"
                  class="w-full px-4 py-3 pr-12 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  @click="showCurrent = !showCurrent"
                  class="absolute right-3 top-[calc(50%+9px)] -translate-y-1/2 text-charcoal-300 hover:text-ochre-500 transition-colors"
                  :aria-label="showCurrent ? 'Hide password' : 'Show password'"
                >
                  <EyeSlashIcon v-if="showCurrent" class="w-4 h-4" />
                  <EyeIcon v-else class="w-4 h-4" />
                </button>
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <div class="relative">
                  <label class="block text-xs font-mono uppercase tracking-[0.24em] text-charcoal-300 dark:text-cream-100/60 mb-2">
                    New password
                  </label>
                  <input
                    v-model="newPassword"
                    :type="showNew ? 'text' : 'password'"
                    :disabled="isLoading"
                    class="w-full px-4 py-3 pr-12 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
                    autocomplete="new-password"
                  />
                  <button
                    type="button"
                    @click="showNew = !showNew"
                    class="absolute right-3 top-[calc(50%+9px)] -translate-y-1/2 text-charcoal-300 hover:text-ochre-500 transition-colors"
                    :aria-label="showNew ? 'Hide password' : 'Show password'"
                  >
                    <EyeSlashIcon v-if="showNew" class="w-4 h-4" />
                    <EyeIcon v-else class="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label class="block text-xs font-mono uppercase tracking-[0.24em] text-charcoal-300 dark:text-cream-100/60 mb-2">
                    Confirm new password
                  </label>
                  <input
                    v-model="confirmPassword"
                    :type="showNew ? 'text' : 'password'"
                    :disabled="isLoading"
                    class="w-full px-4 py-3 rounded-xl bg-cream-100/70 dark:bg-charcoal-500/40 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 text-charcoal-500 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-ochre-500/60 transition-all"
                    autocomplete="new-password"
                  />
                </div>
              </div>

              <p class="text-xs text-charcoal-300 dark:text-cream-100/55">
                Minimum 8 characters. A short sentence works far better than
                <span class="font-mono">P@ssw0rd!</span>.
              </p>

              <div class="flex flex-wrap gap-2 pt-1">
                <button
                  @click="savePassword"
                  :disabled="isLoading"
                  class="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 hover:shadow-glow hover:scale-[1.04] disabled:opacity-50"
                >
                  <CheckIcon class="w-4 h-4" />
                  Update password
                </button>
                <button
                  @click="cancelEditing"
                  :disabled="isLoading"
                  class="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-charcoal-400 dark:text-cream-100/80 ring-1 ring-charcoal-500/15 dark:ring-cream-100/12 hover:bg-charcoal-500/5 transition-all duration-300"
                >
                  <XMarkIcon class="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </section>
        </div>

        <!-- Side column: Conversion Trainer -->
        <aside class="space-y-6 md:space-y-8">
          <section class="account-card rounded-3xl glass glass-edge p-6 md:p-8">
            <div class="flex items-center justify-between mb-5">
              <div>
                <p class="font-mono text-xs uppercase tracking-[0.32em] text-ochre-500/90 mb-1">
                  Practice
                </p>
                <h2 class="font-display text-xl md:text-2xl text-charcoal-500 dark:text-cream-100 tracking-tight">
                  Conversion Trainer
                </h2>
              </div>
              <router-link
                to="/developer-tools/conversion-trainer"
                data-cursor="magnetic"
                class="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-ochre-500 hover:text-terracotta-500 transition-colors"
              >
                Practice
                <ArrowRightIcon class="w-3.5 h-3.5" />
              </router-link>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-6">
              <div class="rounded-xl px-3 py-3 bg-cream-100/40 dark:bg-charcoal-500/30 ring-1 ring-charcoal-500/8 dark:ring-cream-100/8">
                <p class="text-xs font-mono uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50 mb-1">
                  Speed round
                </p>
                <p class="font-display text-xl text-charcoal-500 dark:text-cream-100">
                  {{ conversionProgress?.bestSpeedRound ?? 0 }}
                </p>
              </div>
              <div class="rounded-xl px-3 py-3 bg-cream-100/40 dark:bg-charcoal-500/30 ring-1 ring-charcoal-500/8 dark:ring-cream-100/8">
                <p class="text-xs font-mono uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50 mb-1">
                  Survival
                </p>
                <p class="font-display text-xl text-charcoal-500 dark:text-cream-100">
                  {{ conversionProgress?.bestSurvival ?? 0 }}
                </p>
              </div>
              <div class="rounded-xl px-3 py-3 bg-cream-100/40 dark:bg-charcoal-500/30 ring-1 ring-charcoal-500/8 dark:ring-cream-100/8">
                <p class="text-xs font-mono uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50 mb-1">
                  Nibble sprint
                </p>
                <p class="font-display text-xl text-charcoal-500 dark:text-cream-100">
                  {{ conversionProgress?.bestNibbleSprint ?? 0 }}
                </p>
              </div>
              <div class="rounded-xl px-3 py-3 bg-cream-100/40 dark:bg-charcoal-500/30 ring-1 ring-charcoal-500/8 dark:ring-cream-100/8">
                <p class="text-xs font-mono uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50 mb-1">
                  Octet sprint
                </p>
                <p class="font-display text-xl text-charcoal-500 dark:text-cream-100">
                  {{ conversionProgress?.bestOctetSprint ?? 0 }}
                </p>
              </div>
            </div>

            <div>
              <p class="font-mono text-xs uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50 mb-3">
                Achievements
              </p>
              <div class="grid grid-cols-1 gap-2">
                <div
                  v-for="(ach, id) in CONVERSION_TRAINER_ACHIEVEMENTS"
                  :key="id"
                  :class="
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300',
                      conversionAchievements.has(id)
                        ? 'bg-ochre-500/10 ring-1 ring-ochre-500/30 text-charcoal-500 dark:text-cream-100'
                        : 'bg-charcoal-500/5 dark:bg-cream-100/4 ring-1 ring-charcoal-500/8 dark:ring-cream-100/8 text-charcoal-200 dark:text-cream-100/35',
                    )
                  "
                  :title="ach.description"
                >
                  <component
                    :is="achievementIcons[ach.icon]"
                    class="w-4 h-4 shrink-0"
                    :class="
                      conversionAchievements.has(id)
                        ? 'text-ochre-500'
                        : 'text-charcoal-200/60 dark:text-cream-100/30'
                    "
                  />
                  <span class="font-medium text-sm truncate">{{ ach.name }}</span>
                  <span
                    v-if="conversionAchievements.has(id)"
                    class="ml-auto text-[10px] uppercase tracking-widest font-mono text-ochre-500"
                  >
                    Unlocked
                  </span>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>
