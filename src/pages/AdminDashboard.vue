<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { api } from '@/api/client'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  UsersIcon,
  ShieldCheckIcon,
  UserIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  LinkIcon,
  XMarkIcon,
  CheckIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  TrophyIcon,
} from '@heroicons/vue/24/outline'
import type { UserWithoutPassword } from '../../server/types/index.js'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const router = useRouter()
const { user: currentUser, isAdmin, checkAuth } = useAuth()
const users = ref<UserWithoutPassword[]>([])
const isLoading = ref(true)
const error = ref('')

type ContactMessage = { id: number; name: string; email: string; message: string; created_at: string }
const contactMessages = ref<ContactMessage[]>([])
const contactLoading = ref(true)
const contactError = ref('')

// Modal states
const isEditModalOpen = ref(false)
const isResetPasswordModalOpen = ref(false)
const isResetLinkModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedUser = ref<UserWithoutPassword | null>(null)

// Edit form
const editForm = ref({
  email: '',
  name: '',
  role: 'user' as 'user' | 'admin',
})

// Action results
const actionResult = ref<{
  type: 'success' | 'error'
  message: string
  data?: any
} | null>(null)

// Conversion Trainer scores (admin)
type ConversionScore = {
  id: number
  userId: string
  userName: string
  userEmail: string
  mode: string
  conv: string
  score: number
  metadata: Record<string, unknown> | null
  createdAt: string
}
const conversionScores = ref<ConversionScore[]>([])
const conversionScoresLoading = ref(false)
const conversionScoresError = ref('')
const conversionScoresFilter = ref({ mode: '', conv: '' })
const isEditScoreModalOpen = ref(false)
const isDeleteScoreModalOpen = ref(false)
const selectedScore = ref<ConversionScore | null>(null)
const editScoreForm = ref({ score: 0 })

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const userStats = computed(() => {
  const total = users.value.length
  const admins = users.value.filter((u) => u.role === 'admin').length
  const regularUsers = total - admins
  return { total, admins, regularUsers }
})

async function loadConversionScores() {
  conversionScoresLoading.value = true
  conversionScoresError.value = ''
  try {
    const res = await api.getAdminConversionScores({
      mode: conversionScoresFilter.value.mode || undefined,
      conv: conversionScoresFilter.value.conv || undefined,
      limit: 100,
    })
    if (res.data) conversionScores.value = res.data.scores
    else if (res.error) conversionScoresError.value = res.error
  } catch (err) {
    conversionScoresError.value = err instanceof Error ? err.message : 'Failed to load scores'
  } finally {
    conversionScoresLoading.value = false
  }
}

function openEditScoreModal(score: ConversionScore) {
  selectedScore.value = score
  editScoreForm.value = { score: score.score }
  isEditScoreModalOpen.value = true
}

function openDeleteScoreModal(score: ConversionScore) {
  selectedScore.value = score
  isDeleteScoreModalOpen.value = true
}

async function handleUpdateScore() {
  if (!selectedScore.value) return
  try {
    const res = await api.updateAdminConversionScore(selectedScore.value.id, editScoreForm.value.score)
    if (res.error) {
      actionResult.value = { type: 'error', message: res.error }
    } else {
      actionResult.value = { type: 'success', message: 'Score updated' }
      selectedScore.value.score = editScoreForm.value.score
      isEditScoreModalOpen.value = false
    }
  } catch (err) {
    actionResult.value = { type: 'error', message: err instanceof Error ? err.message : 'Failed to update' }
  }
}

async function handleDeleteScore() {
  if (!selectedScore.value) return
  try {
    const res = await api.deleteAdminConversionScore(selectedScore.value.id)
    if (res.error) {
      actionResult.value = { type: 'error', message: res.error }
    } else {
      actionResult.value = { type: 'success', message: 'Score deleted' }
      conversionScores.value = conversionScores.value.filter((s) => s.id !== selectedScore.value!.id)
      isDeleteScoreModalOpen.value = false
      selectedScore.value = null
    }
  } catch (err) {
    actionResult.value = { type: 'error', message: err instanceof Error ? err.message : 'Failed to delete' }
  }
}

onMounted(async () => {
  // Start loading users, contact messages, conversion scores (non-blocking)
  loadUsers()
  loadContactMessages()
  loadConversionScores()

  // Check auth in parallel
  await checkAuth()
  
  // Redirect if not admin (after auth check completes)
  if (!isAdmin.value) {
    router.push('/account')
    return
  }
  
  await nextTick()
  
  gsap.set('.page-header', { opacity: 0, y: 30, scale: 0.96 })
  gsap.set('.stat-card', { opacity: 0, y: 20, scale: 0.98 })
  gsap.set('[data-user-card]', { opacity: 0, y: 20, scale: 0.98 })
  
  const tl = gsap.timeline({ defaults: { ease: premiumEase } })
  
  tl.to('.page-header', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.6,
  }, 0)
  
  tl.to('.stat-card', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.5,
    stagger: 0.1,
    delay: 0.1,
  }, 0)

  await nextTick()
  ScrollTrigger.refresh()
  
  gsap.to('[data-user-card]', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.5,
    stagger: 0.05,
    ease: premiumEase,
    scrollTrigger: {
      trigger: '.users-grid',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  })
})

async function loadUsers() {
  isLoading.value = true
  error.value = ''

  try {
    const response = await api.getUsers()
    if (response.error) {
      error.value = response.error
    } else if (response.data) {
      users.value = response.data.users
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load users'
  } finally {
    isLoading.value = false
  }
}

async function loadContactMessages() {
  contactLoading.value = true
  contactError.value = ''
  try {
    const response = await api.getContactMessages()
    if (response.error) {
      contactError.value = response.error
    } else if (response.data) {
      contactMessages.value = response.data.messages
      await nextTick()
      if (contactMessages.value.length > 0 && typeof window !== 'undefined') {
        gsap.fromTo(
          '[data-contact-card]',
          { opacity: 0, y: 20, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.05,
            ease: premiumEase,
            scrollTrigger: {
              trigger: '.contact-messages-list',
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          },
        )
        ScrollTrigger.refresh()
      }
    }
  } catch (err) {
    contactError.value = err instanceof Error ? err.message : 'Failed to load contact messages'
  } finally {
    contactLoading.value = false
  }
}

function copyContactEmail(email: string) {
  navigator.clipboard.writeText(email)
  actionResult.value = { type: 'success', message: 'Email copied to clipboard!' }
}

function openEditModal(user: UserWithoutPassword) {
  selectedUser.value = user
  editForm.value = {
    email: user.email,
    name: user.name,
    role: user.role,
  }
  isEditModalOpen.value = true
  actionResult.value = null
}

function openResetPasswordModal(user: UserWithoutPassword) {
  selectedUser.value = user
  isResetPasswordModalOpen.value = true
  actionResult.value = null
}

function openResetLinkModal(user: UserWithoutPassword) {
  selectedUser.value = user
  isResetLinkModalOpen.value = true
  actionResult.value = null
}

function openDeleteModal(user: UserWithoutPassword) {
  selectedUser.value = user
  isDeleteModalOpen.value = true
  actionResult.value = null
}

function closeModals() {
  isEditModalOpen.value = false
  isResetPasswordModalOpen.value = false
  isResetLinkModalOpen.value = false
  isDeleteModalOpen.value = false
  isEditScoreModalOpen.value = false
  isDeleteScoreModalOpen.value = false
  selectedUser.value = null
  selectedScore.value = null
  actionResult.value = null
}

async function handleUpdateUser() {
  if (!selectedUser.value) return

  try {
    const response = await api.updateUser(selectedUser.value.id, editForm.value)
    if (response.error) {
      actionResult.value = { type: 'error', message: response.error }
    } else {
      actionResult.value = { type: 'success', message: 'User updated successfully' }
      await loadUsers()
      setTimeout(() => {
        closeModals()
      }, 1500)
    }
  } catch (err) {
    actionResult.value = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to update user',
    }
  }
}

async function handleResetPassword() {
  if (!selectedUser.value) return

  try {
    const response = await api.resetUserPassword(selectedUser.value.id)
    if (response.error) {
      actionResult.value = { type: 'error', message: response.error }
    } else {
      actionResult.value = {
        type: 'success',
        message: 'Password reset successfully',
        data: response.data,
      }
    }
  } catch (err) {
    actionResult.value = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to reset password',
    }
  }
}

async function handleGenerateResetLink() {
  if (!selectedUser.value) return

  try {
    const response = await api.generateResetLink(selectedUser.value.id)
    if (response.error) {
      actionResult.value = { type: 'error', message: response.error }
    } else {
      actionResult.value = {
        type: 'success',
        message: 'Reset link generated successfully',
        data: response.data,
      }
    }
  } catch (err) {
    actionResult.value = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to generate reset link',
    }
  }
}

async function handleDeleteUser() {
  if (!selectedUser.value) return

  try {
    const response = await api.deleteUser(selectedUser.value.id)
    if (response.error) {
      actionResult.value = { type: 'error', message: response.error }
    } else {
      actionResult.value = { type: 'success', message: 'User deleted successfully' }
      await loadUsers()
      setTimeout(() => {
        closeModals()
      }, 1500)
    }
  } catch (err) {
    actionResult.value = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to delete user',
    }
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  actionResult.value = {
    type: 'success',
    message: 'Copied to clipboard!',
  }
}
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Admin Dashboard
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Manage users and system settings
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div
          class="stat-card p-6 rounded-xl bg-white/40 dark:bg-peach/10 backdrop-blur-md border border-gray-200/50 dark:border-peach/20"
        >
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-peach/20 dark:bg-peach/30',
              )"
            >
              <UsersIcon class="w-8 h-8 text-gray-700 dark:text-peach" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <p class="text-3xl font-semibold text-gray-800 dark:text-white">
                {{ userStats.total }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="stat-card p-6 rounded-xl bg-white/40 dark:bg-lavender/10 backdrop-blur-md border border-gray-200/50 dark:border-lavender/20"
        >
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-lavender/20 dark:bg-lavender/30',
              )"
            >
              <ShieldCheckIcon class="w-8 h-8 text-gray-700 dark:text-lavender" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Admins</p>
              <p class="text-3xl font-semibold text-gray-800 dark:text-white">
                {{ userStats.admins }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="stat-card p-6 rounded-xl bg-white/40 dark:bg-mint/10 backdrop-blur-md border border-gray-200/50 dark:border-mint/20"
        >
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-mint/20 dark:bg-mint/30',
              )"
            >
              <UserIcon class="w-8 h-8 text-gray-700 dark:text-mint" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Regular Users</p>
              <p class="text-3xl font-semibold text-gray-800 dark:text-white">
                {{ userStats.regularUsers }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Messages -->
      <div class="card p-6 md:p-8 rounded-xl bg-white/40 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 mb-8">
        <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">Contact Messages</h2>

        <div
          v-if="contactError"
          :class="cn(
            'p-4 rounded-lg mb-6',
            'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50',
            'text-red-700 dark:text-red-400 text-sm',
          )"
        >
          {{ contactError }}
        </div>

        <div v-if="contactLoading" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">Loading contact messages...</p>
        </div>

        <div
          v-else
          class="contact-messages-list space-y-4"
        >
          <div
            v-for="msg in contactMessages"
            :key="msg.id"
            data-contact-card
            :class="cn(
              'p-4 rounded-lg',
              'bg-white/60 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50',
              'hover:bg-white/80 dark:hover:bg-gray-700/70 transition-all duration-200',
            )"
          >
            <div class="flex items-start gap-3">
              <div class="p-2 rounded-lg bg-lavender/20 dark:bg-lavender/30">
                <ChatBubbleLeftRightIcon class="w-5 h-5 text-gray-700 dark:text-lavender" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <p class="font-medium text-gray-800 dark:text-white">{{ msg.name }}</p>
                  <button
                    @click="copyContactEmail(msg.email)"
                    :class="cn(
                      'p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-600/50',
                      'transition-all duration-200 transform-gpu hover:scale-105 active:scale-95',
                    )"
                    title="Copy email"
                  >
                    <ClipboardDocumentIcon class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <a
                  :href="`mailto:${msg.email}`"
                  class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-lavender dark:hover:text-lavender transition-colors duration-200"
                >
                  <EnvelopeIcon class="w-4 h-4 shrink-0" />
                  <span class="truncate">{{ msg.email }}</span>
                </a>
                <p class="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">{{ msg.message }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {{ new Date(msg.created_at).toLocaleString() }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="!contactLoading && contactMessages.length === 0"
          class="text-center py-12"
        >
          <p class="text-gray-600 dark:text-gray-400">No contact messages yet</p>
        </div>
      </div>

      <!-- Conversion Trainer Scores -->
      <div class="card p-6 md:p-8 rounded-xl bg-white/40 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 mb-8">
        <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
          <TrophyIcon class="w-6 h-6 text-amber-500" />
          Conversion Trainer Scores
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Edit or remove leaderboard scores. Scores are tied to sessions to prevent tampering.
        </p>
        <div class="flex flex-wrap gap-2 mb-4">
          <select
            v-model="conversionScoresFilter.mode"
            @change="loadConversionScores"
            class="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
          >
            <option value="">All modes</option>
            <option value="speed-round">Speed Round</option>
            <option value="survival">Survival</option>
            <option value="streak-challenge">Streak Challenge</option>
            <option value="nibble-sprint">Nibble Sprint</option>
          </select>
          <select
            v-model="conversionScoresFilter.conv"
            @change="loadConversionScores"
            class="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
          >
            <option value="">All types</option>
            <option value="binary-standalone">Binary</option>
            <option value="hex-standalone">Hex</option>
            <option value="ipv4-full">IPv4</option>
            <option value="ipv6-hextet">IPv6</option>
          </select>
          <button
            @click="loadConversionScores"
            class="px-3 py-2 rounded-lg bg-mint/30 hover:bg-mint/50 text-emerald-800 dark:text-emerald-200 text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
        <div v-if="conversionScoresError" class="p-4 rounded-lg mb-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
          {{ conversionScoresError }}
        </div>
        <div v-if="conversionScoresLoading" class="text-center py-12 text-gray-600 dark:text-gray-400">
          Loading scores...
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-600">
                <th class="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">ID</th>
                <th class="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">User</th>
                <th class="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Mode</th>
                <th class="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Type</th>
                <th class="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Score</th>
                <th class="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th class="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in conversionScores"
                :key="s.id"
                class="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
              >
                <td class="py-3 px-2 font-mono text-gray-600 dark:text-gray-400">{{ s.id }}</td>
                <td class="py-3 px-2">
                  <span class="font-medium text-gray-800 dark:text-white">{{ s.userName }}</span>
                  <span class="block text-xs text-gray-500">{{ s.userEmail }}</span>
                </td>
                <td class="py-3 px-2 text-gray-700 dark:text-gray-300">{{ s.mode }}</td>
                <td class="py-3 px-2 text-gray-700 dark:text-gray-300">{{ s.conv }}</td>
                <td class="py-3 px-2 font-semibold text-emerald-600 dark:text-emerald-400">{{ s.score }}</td>
                <td class="py-3 px-2 text-gray-500 dark:text-gray-400">{{ new Date(s.createdAt).toLocaleString() }}</td>
                <td class="py-3 px-2">
                  <div class="flex gap-2">
                    <button
                      @click="openEditScoreModal(s)"
                      class="p-1.5 rounded-lg bg-peach/20 hover:bg-peach/30 text-gray-700 dark:text-gray-200 transition-colors"
                      title="Edit score"
                    >
                      <PencilIcon class="w-4 h-4" />
                    </button>
                    <button
                      @click="openDeleteScoreModal(s)"
                      class="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 transition-colors"
                      title="Delete score"
                    >
                      <TrashIcon class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!conversionScoresLoading && conversionScores.length === 0" class="text-center py-12 text-gray-600 dark:text-gray-400">
          No scores found
        </div>
      </div>

      <!-- Users List -->
      <div class="card p-6 md:p-8 rounded-xl bg-white/40 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">All Users</h2>

        <!-- Error State -->
        <div
          v-if="error"
          :class="cn(
            'p-4 rounded-lg mb-6',
            'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50',
            'text-red-700 dark:text-red-400 text-sm',
          )"
        >
          {{ error }}
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>

        <!-- Users Grid -->
        <div
          v-else
          class="users-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div
            v-for="u in users"
            :key="u.id"
            data-user-card
            :class="cn(
              'p-4 rounded-lg relative group',
              'bg-white/60 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50',
              'hover:bg-white/80 dark:hover:bg-gray-700/70 transition-all duration-300',
              u.id === currentUser?.id && 'ring-2 ring-peach/50',
            )"
          >
            <div class="flex items-start gap-3">
              <div
                :class="cn(
                  'p-2 rounded-lg',
                  u.role === 'admin' ? 'bg-peach/20 dark:bg-peach/30' : 'bg-mint/20 dark:bg-mint/30',
                )"
              >
                <UserIcon class="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <p class="font-medium text-gray-800 dark:text-white truncate">{{ u.name }}</p>
                  <span
                    v-if="u.role === 'admin'"
                    :class="cn(
                      'px-2 py-0.5 text-xs font-medium rounded-md',
                      'bg-peach/30 dark:bg-peach/40 text-gray-800 dark:text-white',
                    )"
                  >
                    Admin
                  </span>
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <EnvelopeIcon class="w-4 h-4" />
                  <span class="truncate">{{ u.email }}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Joined {{ new Date(u.created_at).toLocaleDateString() }}
                </p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-600/50">
              <button
                @click="openEditModal(u)"
                :class="cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
                  'bg-peach/20 hover:bg-peach/30 dark:bg-peach/20 dark:hover:bg-peach/30 text-gray-700 dark:text-gray-200',
                  'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                )"
                title="Edit User"
              >
                <PencilIcon class="w-4 h-4" />
                <span class="hidden sm:inline">Edit</span>
              </button>
              <button
                @click="openResetPasswordModal(u)"
                :class="cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
                  'bg-lavender/20 hover:bg-lavender/30 dark:bg-lavender/20 dark:hover:bg-lavender/30 text-gray-700 dark:text-gray-200',
                  'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                )"
                title="Reset Password"
              >
                <KeyIcon class="w-4 h-4" />
                <span class="hidden sm:inline">Reset</span>
              </button>
              <button
                @click="openResetLinkModal(u)"
                :class="cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
                  'bg-mint/20 hover:bg-mint/30 dark:bg-mint/20 dark:hover:bg-mint/30 text-gray-700 dark:text-gray-200',
                  'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                )"
                title="Generate Reset Link"
              >
                <LinkIcon class="w-4 h-4" />
                <span class="hidden sm:inline">Link</span>
              </button>
              <button
                v-if="u.id !== currentUser?.id"
                @click="openDeleteModal(u)"
                :class="cn(
                  'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
                  'bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400',
                  'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                )"
                title="Delete User"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="!isLoading && users.length === 0"
          class="text-center py-12"
        >
          <p class="text-gray-600 dark:text-gray-400">No users found</p>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeModals"
    >
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        @click="closeModals"
      />
      <div
        class="relative w-full max-w-md rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 shadow-xl p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800 dark:text-white">Edit User</h3>
          <button
            @click="closeModals"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form @submit.prevent="handleUpdateUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
            <input
              v-model="editForm.name"
              type="text"
              required
              class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-peach/50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              v-model="editForm.email"
              type="email"
              required
              class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-peach/50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
            <select
              v-model="editForm.role"
              class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-peach/50"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div
            v-if="actionResult"
            :class="cn(
              'p-3 rounded-lg text-sm',
              actionResult.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
            )"
          >
            {{ actionResult.message }}
          </div>

          <div class="flex items-center gap-3 pt-4">
            <button
              type="submit"
              :class="cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-peach/30 hover:bg-peach/40 dark:bg-peach/30 dark:hover:bg-peach/40 text-gray-800 dark:text-white',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
              )"
            >
              Update User
            </button>
            <button
              type="button"
              @click="closeModals"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div
      v-if="isResetPasswordModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeModals"
    >
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        @click="closeModals"
      />
      <div
        class="relative w-full max-w-md rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 shadow-xl p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800 dark:text-white">Reset Password</h3>
          <button
            @click="closeModals"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Reset password for <strong>{{ selectedUser?.name }}</strong> ({{ selectedUser?.email }})?
            A temporary password will be generated.
          </p>

          <div
            v-if="actionResult?.type === 'success' && actionResult.data?.temporaryPassword"
            class="p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50"
          >
            <p class="text-sm font-medium text-green-800 dark:text-green-400 mb-2">Temporary Password:</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800 text-green-900 dark:text-green-300 font-mono text-sm">
                {{ actionResult.data.temporaryPassword }}
              </code>
              <button
                @click="copyToClipboard(actionResult.data.temporaryPassword)"
                class="px-3 py-2 bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800/50 rounded text-green-800 dark:text-green-400 transition-colors"
              >
                Copy
              </button>
            </div>
            <p class="text-xs text-green-700 dark:text-green-500 mt-2">Share this password with the user securely.</p>
          </div>

          <div
            v-if="actionResult?.type === 'error'"
            class="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm"
          >
            {{ actionResult.message }}
          </div>

          <div class="flex items-center gap-3 pt-4">
            <button
              @click="handleResetPassword"
              :disabled="actionResult?.type === 'success'"
              :class="cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-lavender/30 hover:bg-lavender/40 dark:bg-lavender/30 dark:hover:bg-lavender/40 text-gray-800 dark:text-white',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )"
            >
              Generate Temporary Password
            </button>
            <button
              @click="closeModals"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Generate Reset Link Modal -->
    <div
      v-if="isResetLinkModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeModals"
    >
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        @click="closeModals"
      />
      <div
        class="relative w-full max-w-md rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 shadow-xl p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800 dark:text-white">Generate Reset Link</h3>
          <button
            @click="closeModals"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Generate a password reset link for <strong>{{ selectedUser?.name }}</strong> ({{ selectedUser?.email }})?
            The link will expire in 24 hours.
          </p>

          <div
            v-if="actionResult?.type === 'success' && actionResult.data?.resetLink"
            class="p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50"
          >
            <p class="text-sm font-medium text-green-800 dark:text-green-400 mb-2">Reset Link:</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800 text-green-900 dark:text-green-300 text-xs break-all">
                {{ actionResult.data.resetLink }}
              </code>
              <button
                @click="copyToClipboard(actionResult.data.resetLink)"
                class="px-3 py-2 bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800/50 rounded text-green-800 dark:text-green-400 transition-colors"
              >
                Copy
              </button>
            </div>
            <p class="text-xs text-green-700 dark:text-green-500 mt-2">
              Expires: {{ new Date(actionResult.data.expiresAt).toLocaleString() }}
            </p>
          </div>

          <div
            v-if="actionResult?.type === 'error'"
            class="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm"
          >
            {{ actionResult.message }}
          </div>

          <div class="flex items-center gap-3 pt-4">
            <button
              @click="handleGenerateResetLink"
              :disabled="actionResult?.type === 'success'"
              :class="cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-mint/30 hover:bg-mint/40 dark:bg-mint/30 dark:hover:bg-mint/40 text-gray-800 dark:text-white',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )"
            >
              Generate Reset Link
            </button>
            <button
              @click="closeModals"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete User Modal -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeModals"
    >
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        @click="closeModals"
      />
      <div
        class="relative w-full max-w-md rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 shadow-xl p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800 dark:text-white">Delete User</h3>
          <button
            @click="closeModals"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{{ selectedUser?.name }}</strong> ({{ selectedUser?.email }})?
            This action cannot be undone.
          </p>

          <div
            v-if="actionResult"
            :class="cn(
              'p-3 rounded-lg text-sm',
              actionResult.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
            )"
          >
            {{ actionResult.message }}
          </div>

          <div class="flex items-center gap-3 pt-4">
            <button
              @click="handleDeleteUser"
              :disabled="actionResult?.type === 'success'"
              :class="cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )"
            >
              Delete User
            </button>
            <button
              @click="closeModals"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Score Modal -->
    <div
      v-if="isEditScoreModalOpen && selectedScore"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeModals"
    >
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="closeModals" />
      <div class="relative w-full max-w-md rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 shadow-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800 dark:text-white">Edit Score</h3>
          <button @click="closeModals" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <XMarkIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {{ selectedScore.userName }} · {{ selectedScore.mode }} · {{ selectedScore.conv }}
        </p>
        <form @submit.prevent="handleUpdateScore" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score</label>
            <input
              v-model.number="editScoreForm.score"
              type="number"
              min="0"
              required
              class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-peach/50"
            />
          </div>
          <div v-if="actionResult" :class="cn('p-3 rounded-lg text-sm', actionResult.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400')">
            {{ actionResult.message }}
          </div>
          <div class="flex items-center gap-3 pt-4">
            <button type="submit" class="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-peach/30 hover:bg-peach/40 text-gray-800 dark:text-white transition-all duration-200">
              Update Score
            </button>
            <button type="button" @click="closeModals" class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Score Modal -->
    <div
      v-if="isDeleteScoreModalOpen && selectedScore"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeModals"
    >
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="closeModals" />
      <div class="relative w-full max-w-md rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 shadow-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800 dark:text-white">Delete Score</h3>
          <button @click="closeModals" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <XMarkIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Remove score of <strong>{{ selectedScore.score }}</strong> by {{ selectedScore.userName }} ({{ selectedScore.mode }})?
        </p>
        <div v-if="actionResult" :class="cn('p-3 rounded-lg text-sm mb-4', actionResult.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400')">
          {{ actionResult.message }}
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="handleDeleteScore"
            :disabled="actionResult?.type === 'success'"
            class="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-100 hover:bg-red-200 dark:bg-red-900/40 text-red-700 dark:text-red-400 transition-all duration-200 disabled:opacity-50"
          >
            Delete Score
          </button>
          <button @click="closeModals" class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  transform-origin: center center;
}

[data-user-card] {
  transform-style: preserve-3d;
  perspective: 1000px;
}
</style>
