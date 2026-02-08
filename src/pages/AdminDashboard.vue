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

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const userStats = computed(() => {
  const total = users.value.length
  const admins = users.value.filter((u) => u.role === 'admin').length
  const regularUsers = total - admins
  return { total, admins, regularUsers }
})

onMounted(async () => {
  // Start loading users immediately (non-blocking)
  loadUsers()
  
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
  selectedUser.value = null
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
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800">
          Admin Dashboard
        </h1>
        <p class="text-base text-gray-600">
          Manage users and system settings
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div
          class="stat-card p-6 rounded-xl bg-white/40 backdrop-blur-md border border-gray-200/50"
        >
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-peach/20',
              )"
            >
              <UsersIcon class="w-8 h-8 text-gray-700" />
            </div>
            <div>
              <p class="text-sm text-gray-500">Total Users</p>
              <p class="text-3xl font-semibold text-gray-800">
                {{ userStats.total }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="stat-card p-6 rounded-xl bg-white/40 backdrop-blur-md border border-gray-200/50"
        >
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-lavender/20',
              )"
            >
              <ShieldCheckIcon class="w-8 h-8 text-gray-700" />
            </div>
            <div>
              <p class="text-sm text-gray-500">Admins</p>
              <p class="text-3xl font-semibold text-gray-800">
                {{ userStats.admins }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="stat-card p-6 rounded-xl bg-white/40 backdrop-blur-md border border-gray-200/50"
        >
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-mint/20',
              )"
            >
              <UserIcon class="w-8 h-8 text-gray-700" />
            </div>
            <div>
              <p class="text-sm text-gray-500">Regular Users</p>
              <p class="text-3xl font-semibold text-gray-800">
                {{ userStats.regularUsers }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Users List -->
      <div class="card p-6 md:p-8 rounded-xl bg-white/40 backdrop-blur-md border border-gray-200/50">
        <h2 class="text-2xl font-semibold mb-6 text-gray-800">All Users</h2>

        <!-- Error State -->
        <div
          v-if="error"
          :class="cn(
            'p-4 rounded-lg mb-6',
            'bg-red-50 border border-red-200',
            'text-red-700 text-sm',
          )"
        >
          {{ error }}
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <p class="text-gray-600">Loading users...</p>
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
              'bg-white/60 border border-gray-200/50',
              'hover:bg-white/80 transition-all duration-300',
              u.id === currentUser?.id && 'ring-2 ring-peach/50',
            )"
          >
            <div class="flex items-start gap-3">
              <div
                :class="cn(
                  'p-2 rounded-lg',
                  u.role === 'admin' ? 'bg-peach/20' : 'bg-mint/20',
                )"
              >
                <UserIcon class="w-5 h-5 text-gray-700" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <p class="font-medium text-gray-800 truncate">{{ u.name }}</p>
                  <span
                    v-if="u.role === 'admin'"
                    :class="cn(
                      'px-2 py-0.5 text-xs font-medium rounded-md',
                      'bg-peach/30 text-gray-800',
                    )"
                  >
                    Admin
                  </span>
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <EnvelopeIcon class="w-4 h-4" />
                  <span class="truncate">{{ u.email }}</span>
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  Joined {{ new Date(u.created_at).toLocaleDateString() }}
                </p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200/50">
              <button
                @click="openEditModal(u)"
                :class="cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
                  'bg-peach/20 hover:bg-peach/30 text-gray-700',
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
                  'bg-lavender/20 hover:bg-lavender/30 text-gray-700',
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
                  'bg-mint/20 hover:bg-mint/30 text-gray-700',
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
                  'bg-red-50 hover:bg-red-100 text-red-700',
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
          <p class="text-gray-600">No users found</p>
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
        class="relative w-full max-w-md rounded-xl bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800">Edit User</h3>
          <button
            @click="closeModals"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon class="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form @submit.prevent="handleUpdateUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              v-model="editForm.name"
              type="text"
              required
              class="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-peach/50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              v-model="editForm.email"
              type="email"
              required
              class="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-peach/50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              v-model="editForm.role"
              class="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-peach/50"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div
            v-if="actionResult"
            :class="cn(
              'p-3 rounded-lg text-sm',
              actionResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
            )"
          >
            {{ actionResult.message }}
          </div>

          <div class="flex items-center gap-3 pt-4">
            <button
              type="submit"
              :class="cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-peach/30 hover:bg-peach/40 text-gray-800',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
              )"
            >
              Update User
            </button>
            <button
              type="button"
              @click="closeModals"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
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
        class="relative w-full max-w-md rounded-xl bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800">Reset Password</h3>
          <button
            @click="closeModals"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon class="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-gray-600">
            Reset password for <strong>{{ selectedUser?.name }}</strong> ({{ selectedUser?.email }})?
            A temporary password will be generated.
          </p>

          <div
            v-if="actionResult?.type === 'success' && actionResult.data?.temporaryPassword"
            class="p-4 rounded-lg bg-green-50 border border-green-200"
          >
            <p class="text-sm font-medium text-green-800 mb-2">Temporary Password:</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2 bg-white rounded border border-green-200 text-green-900 font-mono text-sm">
                {{ actionResult.data.temporaryPassword }}
              </code>
              <button
                @click="copyToClipboard(actionResult.data.temporaryPassword)"
                class="px-3 py-2 bg-green-100 hover:bg-green-200 rounded text-green-800 transition-colors"
              >
                Copy
              </button>
            </div>
            <p class="text-xs text-green-700 mt-2">Share this password with the user securely.</p>
          </div>

          <div
            v-if="actionResult?.type === 'error'"
            class="p-3 rounded-lg bg-red-50 text-red-700 text-sm"
          >
            {{ actionResult.message }}
          </div>

          <div class="flex items-center gap-3 pt-4">
            <button
              @click="handleResetPassword"
              :disabled="actionResult?.type === 'success'"
              :class="cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-lavender/30 hover:bg-lavender/40 text-gray-800',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )"
            >
              Generate Temporary Password
            </button>
            <button
              @click="closeModals"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
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
        class="relative w-full max-w-md rounded-xl bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800">Generate Reset Link</h3>
          <button
            @click="closeModals"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon class="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-gray-600">
            Generate a password reset link for <strong>{{ selectedUser?.name }}</strong> ({{ selectedUser?.email }})?
            The link will expire in 24 hours.
          </p>

          <div
            v-if="actionResult?.type === 'success' && actionResult.data?.resetLink"
            class="p-4 rounded-lg bg-green-50 border border-green-200"
          >
            <p class="text-sm font-medium text-green-800 mb-2">Reset Link:</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2 bg-white rounded border border-green-200 text-green-900 text-xs break-all">
                {{ actionResult.data.resetLink }}
              </code>
              <button
                @click="copyToClipboard(actionResult.data.resetLink)"
                class="px-3 py-2 bg-green-100 hover:bg-green-200 rounded text-green-800 transition-colors"
              >
                Copy
              </button>
            </div>
            <p class="text-xs text-green-700 mt-2">
              Expires: {{ new Date(actionResult.data.expiresAt).toLocaleString() }}
            </p>
          </div>

          <div
            v-if="actionResult?.type === 'error'"
            class="p-3 rounded-lg bg-red-50 text-red-700 text-sm"
          >
            {{ actionResult.message }}
          </div>

          <div class="flex items-center gap-3 pt-4">
            <button
              @click="handleGenerateResetLink"
              :disabled="actionResult?.type === 'success'"
              :class="cn(
                'flex-1 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-mint/30 hover:bg-mint/40 text-gray-800',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )"
            >
              Generate Reset Link
            </button>
            <button
              @click="closeModals"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
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
        class="relative w-full max-w-md rounded-xl bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold text-gray-800">Delete User</h3>
          <button
            @click="closeModals"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon class="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-gray-600">
            Are you sure you want to delete <strong>{{ selectedUser?.name }}</strong> ({{ selectedUser?.email }})?
            This action cannot be undone.
          </p>

          <div
            v-if="actionResult"
            :class="cn(
              'p-3 rounded-lg text-sm',
              actionResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
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
                'bg-red-100 hover:bg-red-200 text-red-700',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )"
            >
              Delete User
            </button>
            <button
              @click="closeModals"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
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
