<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
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
} from '@heroicons/vue/24/outline'
import type { UserWithoutPassword } from '../../server/types/index.js'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const { user } = useAuth()
const users = ref<UserWithoutPassword[]>([])
const isLoading = ref(true)
const error = ref('')

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const userStats = computed(() => {
  const total = users.value.length
  const admins = users.value.filter((u) => u.role === 'admin').length
  const regularUsers = total - admins
  return { total, admins, regularUsers }
})

onMounted(async () => {
  await loadUsers()
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
              'p-4 rounded-lg',
              'bg-white/60 border border-gray-200/50',
              'hover:bg-white/80 transition-all duration-300',
              u.id === user?.id && 'ring-2 ring-peach/50',
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
