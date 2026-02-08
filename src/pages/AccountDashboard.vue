<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
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
  Cog6ToothIcon,
  PencilIcon,
  LockClosedIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { user, isAdmin, logout, checkAuth } = useAuth()

// Edit states
const isEditingName = ref(false)
const isEditingEmail = ref(false)
const isChangingPassword = ref(false)

// Form values
const editName = ref('')
const editEmail = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// Messages
const successMessage = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(async () => {
  await nextTick()
  
  gsap.set('.page-header', { opacity: 0, y: 30, scale: 0.96 })
  gsap.set('.card', { opacity: 0, y: 20, scale: 0.98 })
  
  const tl = gsap.timeline({ defaults: { ease: premiumEase } })
  
  tl.to('.page-header', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.6,
  }, 0)
  
  tl.to('.card', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.5,
    stagger: 0.1,
    delay: 0.1,
  }, 0)
})

function startEditingName() {
  editName.value = user.value?.name || ''
  isEditingName.value = true
  errorMessage.value = ''
  successMessage.value = ''
}

function cancelEditingName() {
  isEditingName.value = false
  editName.value = ''
}

async function saveName() {
  if (!editName.value || editName.value.length < 1) {
    errorMessage.value = 'Name cannot be empty'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await api.updateOwnAccount({ name: editName.value })
    if (response.error) {
      errorMessage.value = response.error
    } else {
      successMessage.value = 'Name updated successfully'
      await checkAuth() // Refresh user data
      setTimeout(() => {
        isEditingName.value = false
        successMessage.value = ''
      }, 1500)
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to update name'
  } finally {
    isLoading.value = false
  }
}

function startEditingEmail() {
  editEmail.value = user.value?.email || ''
  isEditingEmail.value = true
  errorMessage.value = ''
  successMessage.value = ''
}

function cancelEditingEmail() {
  isEditingEmail.value = false
  editEmail.value = ''
}

async function saveEmail() {
  if (!editEmail.value || !editEmail.value.includes('@')) {
    errorMessage.value = 'Please enter a valid email address'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await api.updateOwnAccount({ email: editEmail.value })
    if (response.error) {
      errorMessage.value = response.error
    } else {
      successMessage.value = 'Email updated successfully'
      await checkAuth() // Refresh user data
      setTimeout(() => {
        isEditingEmail.value = false
        successMessage.value = ''
      }, 1500)
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to update email'
  } finally {
    isLoading.value = false
  }
}

function startChangingPassword() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  isChangingPassword.value = true
  errorMessage.value = ''
  successMessage.value = ''
}

function cancelChangingPassword() {
  isChangingPassword.value = false
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

async function savePassword() {
  if (!currentPassword.value) {
    errorMessage.value = 'Please enter your current password'
    return
  }

  if (!newPassword.value || newPassword.value.length < 8) {
    errorMessage.value = 'New password must be at least 8 characters long'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'New passwords do not match'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await api.changePassword(currentPassword.value, newPassword.value)
    if (response.error) {
      errorMessage.value = response.error
    } else {
      successMessage.value = 'Password changed successfully'
      setTimeout(() => {
        isChangingPassword.value = false
        currentPassword.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
        successMessage.value = ''
      }, 1500)
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to change password'
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
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800">
          Account
        </h1>
        <p class="text-base text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      <!-- Success/Error Messages -->
      <div
        v-if="successMessage"
        :class="cn(
          'mb-6 p-4 rounded-lg flex items-center gap-3',
          'bg-green-50 border border-green-200',
        )"
      >
        <CheckIcon class="w-5 h-5 text-green-700 flex-shrink-0" />
        <p class="text-green-700 text-sm">{{ successMessage }}</p>
      </div>

      <div
        v-if="errorMessage"
        :class="cn(
          'mb-6 p-4 rounded-lg',
          'bg-red-50 border border-red-200',
          'text-red-700 text-sm',
        )"
      >
        {{ errorMessage }}
      </div>

      <!-- Account Info Card -->
      <div
        class="card mb-6 p-6 md:p-8 rounded-xl bg-white/40 backdrop-blur-md border border-gray-200/50"
      >
        <h2 class="text-2xl font-semibold mb-6 text-gray-800">Account Information</h2>
        
        <div class="space-y-4">
          <!-- Name -->
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-peach/20',
              )"
            >
              <UserIcon class="w-6 h-6 text-gray-700" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-500">Name</p>
              <div v-if="!isEditingName" class="flex items-center gap-3">
                <p class="text-lg font-medium text-gray-800">{{ user?.name }}</p>
                <button
                  @click="startEditingName"
                  :class="cn(
                    'p-1.5 rounded-lg hover:bg-peach/20',
                    'transition-all duration-300',
                    'text-gray-600 hover:text-gray-800',
                  )"
                  title="Edit name"
                >
                  <PencilIcon class="w-4 h-4" />
                </button>
              </div>
              <div v-else class="flex items-center gap-2">
                <input
                  v-model="editName"
                  type="text"
                  :disabled="isLoading"
                  :class="cn(
                    'flex-1 px-3 py-2 rounded-lg border border-gray-200',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-peach/50',
                    'disabled:opacity-50',
                  )"
                />
                <button
                  @click="saveName"
                  :disabled="isLoading"
                  :class="cn(
                    'p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700',
                    'transition-all duration-300',
                    'disabled:opacity-50',
                  )"
                  title="Save"
                >
                  <CheckIcon class="w-4 h-4" />
                </button>
                <button
                  @click="cancelEditingName"
                  :disabled="isLoading"
                  :class="cn(
                    'p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700',
                    'transition-all duration-300',
                    'disabled:opacity-50',
                  )"
                  title="Cancel"
                >
                  <XMarkIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Email -->
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-lavender/20',
              )"
            >
              <EnvelopeIcon class="w-6 h-6 text-gray-700" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-500">Email</p>
              <div v-if="!isEditingEmail" class="flex items-center gap-3">
                <p class="text-lg font-medium text-gray-800">{{ user?.email }}</p>
                <button
                  @click="startEditingEmail"
                  :class="cn(
                    'p-1.5 rounded-lg hover:bg-lavender/20',
                    'transition-all duration-300',
                    'text-gray-600 hover:text-gray-800',
                  )"
                  title="Edit email"
                >
                  <PencilIcon class="w-4 h-4" />
                </button>
              </div>
              <div v-else class="flex items-center gap-2">
                <input
                  v-model="editEmail"
                  type="email"
                  :disabled="isLoading"
                  :class="cn(
                    'flex-1 px-3 py-2 rounded-lg border border-gray-200',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-peach/50',
                    'disabled:opacity-50',
                  )"
                />
                <button
                  @click="saveEmail"
                  :disabled="isLoading"
                  :class="cn(
                    'p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700',
                    'transition-all duration-300',
                    'disabled:opacity-50',
                  )"
                  title="Save"
                >
                  <CheckIcon class="w-4 h-4" />
                </button>
                <button
                  @click="cancelEditingEmail"
                  :disabled="isLoading"
                  :class="cn(
                    'p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700',
                    'transition-all duration-300',
                    'disabled:opacity-50',
                  )"
                  title="Cancel"
                >
                  <XMarkIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Password -->
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-mint/20',
              )"
            >
              <LockClosedIcon class="w-6 h-6 text-gray-700" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-500">Password</p>
              <div v-if="!isChangingPassword">
                <p class="text-lg font-medium text-gray-800">••••••••</p>
                <button
                  @click="startChangingPassword"
                  :class="cn(
                    'mt-2 px-3 py-1.5 rounded-lg text-sm',
                    'bg-mint/20 hover:bg-mint/30 text-gray-700',
                    'transition-all duration-300 transform-gpu hover:scale-105',
                  )"
                >
                  Change Password
                </button>
              </div>
              <div v-else class="space-y-3 mt-2">
                <input
                  v-model="currentPassword"
                  type="password"
                  placeholder="Current password"
                  :disabled="isLoading"
                  :class="cn(
                    'w-full px-3 py-2 rounded-lg border border-gray-200',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-peach/50',
                    'disabled:opacity-50',
                  )"
                />
                <input
                  v-model="newPassword"
                  type="password"
                  placeholder="New password (min. 8 characters)"
                  :disabled="isLoading"
                  :class="cn(
                    'w-full px-3 py-2 rounded-lg border border-gray-200',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-peach/50',
                    'disabled:opacity-50',
                  )"
                />
                <input
                  v-model="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  :disabled="isLoading"
                  :class="cn(
                    'w-full px-3 py-2 rounded-lg border border-gray-200',
                    'bg-white focus:outline-none focus:ring-2 focus:ring-peach/50',
                    'disabled:opacity-50',
                  )"
                />
                <div class="flex items-center gap-2">
                  <button
                    @click="savePassword"
                    :disabled="isLoading"
                    :class="cn(
                      'px-4 py-2 rounded-lg text-sm font-medium',
                      'bg-green-100 hover:bg-green-200 text-green-700',
                      'transition-all duration-300',
                      'disabled:opacity-50',
                    )"
                  >
                    Save Password
                  </button>
                  <button
                    @click="cancelChangingPassword"
                    :disabled="isLoading"
                    :class="cn(
                      'px-4 py-2 rounded-lg text-sm font-medium',
                      'bg-gray-100 hover:bg-gray-200 text-gray-700',
                      'transition-all duration-300',
                      'disabled:opacity-50',
                    )"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Role -->
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-mint/20',
              )"
            >
              <ShieldCheckIcon class="w-6 h-6 text-gray-700" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-500">Role</p>
              <div class="flex items-center gap-2">
                <p class="text-lg font-medium text-gray-800 capitalize">
                  {{ user?.role }}
                </p>
                <span
                  v-if="isAdmin"
                  :class="cn(
                    'px-2 py-1 text-xs font-medium rounded-md',
                    'bg-peach/30 text-gray-800',
                  )"
                >
                  Admin
                </span>
              </div>
            </div>
          </div>

          <!-- Created At -->
          <div class="flex items-center gap-4">
            <div
              :class="cn(
                'p-3 rounded-lg',
                'bg-white/40',
              )"
            >
              <Cog6ToothIcon class="w-6 h-6 text-gray-700" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-500">Member since</p>
              <p class="text-lg font-medium text-gray-800">
                {{ user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions Card -->
      <div
        class="card p-6 md:p-8 rounded-xl bg-white/40 backdrop-blur-md border border-gray-200/50"
      >
        <h2 class="text-2xl font-semibold mb-6 text-gray-800">Actions</h2>
        
        <div class="space-y-4">
          <!-- Admin Dashboard Link -->
          <router-link
            v-if="isAdmin"
            to="/admin"
            :class="cn(
              'flex items-center justify-between p-4 rounded-lg',
              'bg-peach/20 hover:bg-peach/30',
              'transition-all duration-300 transform-gpu hover:scale-105',
              'border border-peach/30',
            )"
          >
            <div class="flex items-center gap-3">
              <ShieldCheckIcon class="w-5 h-5 text-gray-700" />
              <span class="font-medium text-gray-800">Admin Dashboard</span>
            </div>
            <ArrowRightOnRectangleIcon class="w-5 h-5 text-gray-600" />
          </router-link>

          <!-- Logout Button -->
          <button
            @click="handleLogout"
            :class="cn(
              'w-full flex items-center justify-between p-4 rounded-lg',
              'bg-red-50 hover:bg-red-100',
              'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
              'border border-red-200',
            )"
          >
            <div class="flex items-center gap-3">
              <ArrowRightOnRectangleIcon class="w-5 h-5 text-red-700" />
              <span class="font-medium text-red-700">Logout</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
