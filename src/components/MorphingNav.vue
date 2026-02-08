<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
} from '@heroicons/vue/24/outline'
import { HomeIcon, FolderIcon, UserIcon, EnvelopeIcon, CubeIcon } from '@heroicons/vue/24/solid'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { user, isAuthenticated, isAdmin, logout, checkAuth } = useAuth()

const isOpen = ref(false)
const isAccountDropdownOpen = ref(false)
const navRef = ref<HTMLElement>()
const backdropRef = ref<HTMLElement>()
const accountDropdownRef = ref<HTMLElement>()

const navItems = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Projects', path: '/projects', icon: FolderIcon },
  { name: 'Games', path: '/games', icon: CubeIcon },
  { name: 'About', path: '/about', icon: UserIcon },
  { name: 'Contact', path: '/contact', icon: EnvelopeIcon },
]

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const toggleNav = () => {
  isOpen.value = !isOpen.value

  if (isOpen.value) {
    // Backdrop with blur animation
    gsap.fromTo(
      backdropRef.value,
      {
        opacity: 0,
        backdropFilter: 'blur(0px)',
      },
      {
        opacity: 1,
        backdropFilter: 'blur(20px)',
        duration: 0.3,
        ease: premiumEase,
      },
    )

    // Slide menu with scale
    gsap.fromTo(
      navRef.value,
      {
        x: '-100%',
        scale: 0.95,
      },
      {
        x: '0%',
        scale: 1,
        duration: 0.4,
        ease: premiumEase,
      },
    )

    // Stagger nav items
    const items = navRef.value?.querySelectorAll('a')
    if (items) {
      gsap.fromTo(
        items,
        {
          opacity: 0,
          x: -20,
          scale: 0.9,
        },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.3,
          stagger: 0.05,
          delay: 0.1,
          ease: premiumEase,
        },
      )
    }
  } else {
    gsap.to(backdropRef.value, {
      opacity: 0,
      duration: 0.2,
      ease: premiumEase,
    })
    gsap.to(navRef.value, {
      x: '-100%',
      duration: 0.3,
      ease: premiumEase,
    })
  }
}

const navigate = (path: string) => {
  router.push(path)
  setTimeout(() => {
    isOpen.value = false
    gsap.to(backdropRef.value, { opacity: 0, duration: 0.2 })
    gsap.to(navRef.value, { x: '-100%', duration: 0.3 })
  }, 100)
}

const handleLogout = () => {
  logout()
  isAccountDropdownOpen.value = false
  router.push('/')
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (
    accountDropdownRef.value &&
    !accountDropdownRef.value.contains(event.target as Node)
  ) {
    isAccountDropdownOpen.value = false
  }
}

const isActive = (path: string) => route.path === path

// Animate nav items on mount and when auth state changes
const animateNavItems = () => {
  setTimeout(() => {
    const desktopNavItems = document.querySelectorAll('.desktop-nav-item')
    gsap.fromTo(
      desktopNavItems,
      {
        opacity: 0,
        y: -10,
        scale: 0.95,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        stagger: 0.05,
        ease: premiumEase,
      },
    )
  }, 100)
}

watch(
  () => isAuthenticated.value,
  () => {
    animateNavItems()
  },
  { immediate: true },
)

onMounted(() => {
  // Check auth in background (non-blocking)
  checkAuth().catch(() => {
    // Silently handle errors
  })
  document.addEventListener('click', handleClickOutside)
  animateNavItems()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-50 p-6 md:p-8">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <!-- Logo/Brand with animation -->
      <router-link
        to="/"
        class="text-2xl font-light tracking-tight text-gray-800 hover:text-coral transition-all duration-300 transform-gpu hover:scale-105"
      >
        AdenMGB
      </router-link>

      <!-- Desktop Nav -->
      <div class="hidden md:flex items-center gap-2">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="desktop-nav-item"
          :class="
            cn(
              'px-4 py-2 rounded-lg text-sm font-normal',
              'transition-all duration-300 transform-gpu',
              'hover:scale-105 active:scale-95',
              isActive(item.path)
                ? 'bg-peach/20 text-gray-800 scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/40',
            )
          "
        >
          <span class="flex items-center gap-2">
            <component
              :is="item.icon"
              class="w-4 h-4 transition-transform duration-300 group-hover:rotate-12"
            />
            {{ item.name }}
          </span>
        </router-link>

        <!-- Auth Section -->
        <div v-if="!isAuthenticated" class="flex items-center gap-2 ml-2">
          <router-link
            to="/login"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-normal',
              'transition-all duration-300 transform-gpu',
              'hover:scale-105 active:scale-95',
              'text-gray-600 hover:text-gray-800 hover:bg-white/40',
            )"
          >
            Sign In
          </router-link>
          <router-link
            to="/signup"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-normal',
              'bg-peach/30 text-gray-800',
              'hover:bg-peach/40 transition-all duration-300',
              'transform-gpu hover:scale-105 active:scale-95',
            )"
          >
            Sign Up
          </router-link>
        </div>

        <!-- Account Dropdown -->
        <div
          v-else
          ref="accountDropdownRef"
          class="relative ml-2"
        >
          <button
            @click.stop="isAccountDropdownOpen = !isAccountDropdownOpen"
            :class="cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-normal',
              'transition-all duration-300 transform-gpu',
              'hover:scale-105 active:scale-95',
              'text-gray-600 hover:text-gray-800 hover:bg-white/40',
              isAccountDropdownOpen && 'bg-white/40',
            )"
          >
            <UserIcon class="w-4 h-4" />
            <span class="max-w-[100px] truncate">{{ user?.name }}</span>
            <ChevronDownIcon
              class="w-4 h-4 transition-transform duration-300"
              :class="{ 'rotate-180': isAccountDropdownOpen }"
            />
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="isAccountDropdownOpen"
            :class="cn(
              'absolute right-0 mt-2 w-56 rounded-xl',
              'bg-white/95 backdrop-blur-md border border-gray-200/50',
              'shadow-lg overflow-hidden',
            )"
          >
            <div class="p-2 space-y-1">
              <!-- User Info -->
              <div class="px-3 py-2 border-b border-gray-200/50">
                <p class="text-sm font-medium text-gray-800 truncate">{{ user?.name }}</p>
                <p class="text-xs text-gray-500 truncate">{{ user?.email }}</p>
                <span
                  v-if="isAdmin"
                  :class="cn(
                    'inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-md',
                    'bg-peach/30 text-gray-800',
                  )"
                >
                  Admin
                </span>
              </div>

              <!-- Account Link -->
              <router-link
                to="/account"
                @click="isAccountDropdownOpen = false"
                :class="cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                  'text-gray-700 hover:bg-peach/20',
                  'transition-all duration-300',
                  'hover:scale-[1.02]',
                )"
              >
                <UserIcon class="w-4 h-4" />
                <span>Account</span>
              </router-link>

              <!-- Admin Dashboard Link -->
              <router-link
                v-if="isAdmin"
                to="/admin"
                @click="isAccountDropdownOpen = false"
                :class="cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                  'text-gray-700 hover:bg-lavender/20',
                  'transition-all duration-300',
                  'hover:scale-[1.02]',
                )"
              >
                <component :is="ShieldCheckIcon" class="w-4 h-4" />
                <span>Admin Dashboard</span>
              </router-link>

              <!-- Logout -->
              <button
                @click="handleLogout"
                :class="cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                  'text-red-700 hover:bg-red-50',
                  'transition-all duration-300',
                  'hover:scale-[1.02]',
                )"
              >
                <ArrowRightOnRectangleIcon class="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Menu Button -->
      <button
        @click="toggleNav"
        class="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-white/40 transition-all duration-300 transform-gpu hover:scale-110 active:scale-95"
      >
        <Bars3Icon
          v-if="!isOpen"
          class="w-6 h-6 transition-transform duration-300"
          :class="{ 'rotate-90': isOpen }"
        />
        <XMarkIcon v-else class="w-6 h-6 transition-transform duration-300 rotate-90" />
      </button>
    </div>

    <!-- Mobile Nav -->
    <div
      ref="backdropRef"
      v-if="isOpen"
      class="fixed inset-0 bg-white/60 backdrop-blur-xl z-40 md:hidden transition-opacity duration-300"
      @click="toggleNav"
    />
    <div
      ref="navRef"
      class="fixed top-0 left-0 h-full w-72 z-50 bg-cream/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl p-8 md:hidden transform-gpu"
    >
      <div class="flex flex-col gap-2 mt-16">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          @click="navigate(item.path)"
          :class="
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal',
              'transition-all duration-300 transform-gpu',
              'hover:scale-105 active:scale-95',
              isActive(item.path)
                ? 'bg-peach/20 text-gray-800 scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/40',
            )
          "
        >
          <component :is="item.icon" class="w-5 h-5 transition-transform duration-300" />
          <span>{{ item.name }}</span>
        </router-link>

        <!-- Mobile Auth Section -->
        <div v-if="!isAuthenticated" class="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-200/50">
          <router-link
            to="/login"
            @click="navigate('/login')"
            :class="cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal',
              'transition-all duration-300 transform-gpu',
              'hover:scale-105 active:scale-95',
              'text-gray-600 hover:text-gray-800 hover:bg-white/40',
            )"
          >
            <UserIcon class="w-5 h-5" />
            <span>Sign In</span>
          </router-link>
          <router-link
            to="/signup"
            @click="navigate('/signup')"
            :class="cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal',
              'bg-peach/30 text-gray-800',
              'hover:bg-peach/40 transition-all duration-300',
              'transform-gpu hover:scale-105 active:scale-95',
            )"
          >
            <UserIcon class="w-5 h-5" />
            <span>Sign Up</span>
          </router-link>
        </div>

        <!-- Mobile Account Section -->
        <div v-else class="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-200/50">
          <div class="px-4 py-2 mb-2">
            <p class="text-sm font-medium text-gray-800">{{ user?.name }}</p>
            <p class="text-xs text-gray-500">{{ user?.email }}</p>
          </div>
          <router-link
            to="/account"
            @click="navigate('/account')"
            :class="cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal',
              'transition-all duration-300 transform-gpu',
              'hover:scale-105 active:scale-95',
              isActive('/account')
                ? 'bg-peach/20 text-gray-800 scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/40',
            )"
          >
            <UserIcon class="w-5 h-5" />
            <span>Account</span>
          </router-link>
          <router-link
            v-if="isAdmin"
            to="/admin"
            @click="navigate('/admin')"
            :class="cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal',
              'transition-all duration-300 transform-gpu',
              'hover:scale-105 active:scale-95',
              isActive('/admin')
                ? 'bg-lavender/20 text-gray-800 scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/40',
            )"
          >
            <ShieldCheckIcon class="w-5 h-5" />
            <span>Admin Dashboard</span>
          </router-link>
          <button
            @click="handleLogout"
            :class="cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal',
              'text-red-700 hover:bg-red-50',
              'transition-all duration-300 transform-gpu',
              'hover:scale-105 active:scale-95',
            )"
          >
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.desktop-nav-item {
  transform-origin: center center;
}
</style>
