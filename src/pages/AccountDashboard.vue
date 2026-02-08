<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import {
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { user, isAdmin, logout } = useAuth()

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
              <p class="text-lg font-medium text-gray-800">{{ user?.name }}</p>
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
              <p class="text-lg font-medium text-gray-800">{{ user?.email }}</p>
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
