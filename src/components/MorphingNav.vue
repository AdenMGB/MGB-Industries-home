<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/vue/24/outline'
import { HomeIcon, UserIcon, CommandLineIcon } from '@heroicons/vue/24/solid'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const { themeMode, toggleTheme } = useTheme()
const router = useRouter()
const { user, isAuthenticated, isAdmin, logout, checkAuth } = useAuth()

const isOpen = ref(false)
const isAccountDropdownOpen = ref(false)
const navRef = ref<HTMLElement>()
const backdropRef = ref<HTMLElement>()
const accountDropdownRef = ref<HTMLElement>()

const navItems = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Utilities', path: '/developer-tools', icon: CommandLineIcon },
]

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const toggleNav = () => {
  if (isOpen.value) {
    if (backdropRef.value) {
      gsap.to(backdropRef.value, {
        opacity: 0,
        duration: 0.2,
        ease: premiumEase,
        onComplete: () => {
          isOpen.value = false
        },
      })
    } else {
      isOpen.value = false
    }
    if (navRef.value) {
      gsap.to(navRef.value, { x: '-100%', duration: 0.3, ease: premiumEase })
    }
  } else {
    isOpen.value = true
    nextTick(() => {
      if (backdropRef.value && navRef.value) {
        gsap.fromTo(
          backdropRef.value,
          { opacity: 0, backdropFilter: 'blur(0px)' },
          { opacity: 1, backdropFilter: 'blur(20px)', duration: 0.3, ease: premiumEase },
        )
        gsap.fromTo(
          navRef.value,
          { x: '-100%', scale: 0.95 },
          { x: '0%', scale: 1, duration: 0.4, ease: premiumEase },
        )
        const items = navRef.value.querySelectorAll('a')
        if (items) {
          gsap.fromTo(
            items,
            { opacity: 0, x: -20, scale: 0.9 },
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
      }
    })
  }
}

const closeNav = () => {
  if (backdropRef.value) {
    gsap.to(backdropRef.value, {
      opacity: 0,
      duration: 0.2,
      ease: premiumEase,
      onComplete: () => {
        isOpen.value = false
      },
    })
  } else {
    isOpen.value = false
  }
  if (navRef.value) {
    gsap.to(navRef.value, { x: '-100%', duration: 0.3, ease: premiumEase })
  }
}

const navigate = (path: string) => {
  router.push(path)
  setTimeout(closeNav, 100)
}

const handleLogout = () => {
  logout()
  isAccountDropdownOpen.value = false
  router.push('/')
}

const handleClickOutside = (event: MouseEvent) => {
  if (
    accountDropdownRef.value &&
    !accountDropdownRef.value.contains(event.target as Node)
  ) {
    isAccountDropdownOpen.value = false
  }
}

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path + '/')
}

const animateNavItems = () => {
  setTimeout(() => {
    const desktopNavItems = document.querySelectorAll('.desktop-nav-item')
    gsap.fromTo(
      desktopNavItems,
      { opacity: 0, y: -10, scale: 0.95 },
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
  checkAuth().catch(() => {
    /* silently handle errors */
  })
  document.addEventListener('click', handleClickOutside)
  animateNavItems()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <nav
    v-show="!(route.name === 'ConversionTrainer' && route.query.fullscreen === '1')"
    class="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4"
  >
    <div
      :class="cn(
        'flex items-center justify-between max-w-7xl mx-auto',
        'rounded-2xl px-4 md:px-6 py-3',
        'glass glass-edge',
      )"
    >
      <!-- Brand -->
      <router-link
        to="/"
        data-cursor="magnetic"
        class="group flex items-center gap-3"
      >
        <span
          class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-ochre-400 via-ochre-500 to-terracotta-500 text-cream-100 font-display text-base font-semibold shadow-edge-ochre transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105"
        >
          A
        </span>
        <span class="flex flex-col leading-none">
          <span class="font-display text-lg md:text-xl font-medium tracking-tight text-charcoal-500 dark:text-cream-100">
            AdenMGB
          </span>
          <span class="text-[10px] uppercase tracking-widest text-charcoal-200 dark:text-cream-300/70 mt-0.5">
            Carefully Crafted
          </span>
        </span>
      </router-link>

      <!-- Desktop Nav -->
      <div class="hidden md:flex items-center gap-1">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          data-cursor="magnetic"
          class="desktop-nav-item"
          :class="
            cn(
              'relative px-4 py-2 rounded-xl text-sm font-medium',
              'transition-all duration-300 transform-gpu',
              'hover:scale-[1.04] active:scale-[0.97]',
              isActive(item.path)
                ? 'text-charcoal-500 dark:text-cream-100'
                : 'text-charcoal-200 hover:text-charcoal-500 dark:text-cream-100/70 dark:hover:text-cream-100',
            )
          "
        >
          <span
            v-if="isActive(item.path)"
            class="absolute inset-0 -z-10 rounded-xl bg-ochre-500/15 dark:bg-ochre-400/15 ring-1 ring-ochre-500/30"
          />
          <span class="flex items-center gap-2">
            <component :is="item.icon" class="w-4 h-4" />
            {{ item.name }}
          </span>
        </router-link>

        <!-- Theme Toggle -->
        <button
          @click="toggleTheme"
          data-cursor="magnetic"
          :aria-label="themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :class="cn(
            'p-2 rounded-xl text-charcoal-200 dark:text-cream-100/70',
            'hover:text-charcoal-500 dark:hover:text-cream-100',
            'transition-all duration-300 transform-gpu hover:scale-110 active:scale-95',
          )"
        >
          <SunIcon v-if="themeMode === 'dark'" class="w-5 h-5" />
          <MoonIcon v-else class="w-5 h-5" />
        </button>

        <!-- Auth Section -->
        <div v-if="!isAuthenticated" class="flex items-center gap-2 ml-2">
          <router-link
            :to="{ path: '/login', query: { redirect: route.fullPath } }"
            data-cursor="magnetic"
            :class="cn(
              'px-4 py-2 rounded-xl text-sm font-medium',
              'text-charcoal-300 hover:text-charcoal-500 dark:text-cream-100/70 dark:hover:text-cream-100',
              'transition-all duration-300 transform-gpu hover:scale-[1.04] active:scale-[0.97]',
            )"
          >
            Sign In
          </router-link>
          <router-link
            :to="{ path: '/signup', query: { redirect: route.fullPath } }"
            data-cursor="magnetic"
            :class="cn(
              'px-4 py-2 rounded-xl text-sm font-medium text-cream-100',
              'bg-gradient-to-br from-ochre-500 to-terracotta-500',
              'shadow-edge-ochre hover:shadow-glow',
              'transition-all duration-300 transform-gpu hover:scale-[1.04] active:scale-[0.97]',
            )"
          >
            Sign Up
          </router-link>
        </div>

        <!-- Account Dropdown -->
        <div v-else ref="accountDropdownRef" class="relative ml-2">
          <button
            data-cursor="magnetic"
            @click.stop="isAccountDropdownOpen = !isAccountDropdownOpen"
            :class="cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
              'transition-all duration-300 transform-gpu',
              'hover:scale-[1.04] active:scale-[0.97]',
              isAccountDropdownOpen
                ? 'bg-ochre-500/15 ring-1 ring-ochre-500/30 text-charcoal-500 dark:text-cream-100'
                : 'text-charcoal-300 hover:text-charcoal-500 dark:text-cream-100/80 dark:hover:text-cream-100',
            )"
          >
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-ochre-400 to-terracotta-500 text-cream-100 text-xs font-semibold"
            >
              {{ (user?.name || user?.email || 'A').slice(0, 1).toUpperCase() }}
            </span>
            <span class="max-w-[110px] truncate">{{ user?.name }}</span>
            <ChevronDownIcon
              class="w-4 h-4 transition-transform duration-300"
              :class="{ 'rotate-180': isAccountDropdownOpen }"
            />
          </button>

          <Transition
            enter-active-class="transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
            enter-from-class="opacity-0 scale-95 translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95 translate-y-1"
          >
            <div
              v-if="isAccountDropdownOpen"
              :class="cn(
                'absolute right-0 mt-3 w-64 rounded-2xl overflow-hidden',
                'glass glass-edge',
              )"
            >
              <div class="p-2 space-y-1">
                <div class="px-3 py-3 border-b border-charcoal-500/10 dark:border-cream-100/10">
                  <p class="text-sm font-medium text-charcoal-500 dark:text-cream-100 truncate">
                    {{ user?.name }}
                  </p>
                  <p class="text-xs text-charcoal-200 dark:text-cream-300/70 truncate">
                    {{ user?.email }}
                  </p>
                  <span
                    v-if="isAdmin"
                    class="inline-block mt-1.5 px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded-md bg-terracotta-500/15 text-terracotta-500 dark:text-terracotta-200"
                  >
                    Admin
                  </span>
                </div>

                <router-link
                  to="/account"
                  @click="isAccountDropdownOpen = false"
                  :class="cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
                    'text-charcoal-400 dark:text-cream-100/85',
                    'hover:bg-ochre-500/15 hover:text-charcoal-500 dark:hover:text-cream-100',
                    'transition-all duration-200 hover:scale-[1.02]',
                  )"
                >
                  <UserIcon class="w-4 h-4" />
                  <span>Account</span>
                </router-link>

                <router-link
                  v-if="isAdmin"
                  to="/admin"
                  @click="isAccountDropdownOpen = false"
                  :class="cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
                    'text-charcoal-400 dark:text-cream-100/85',
                    'hover:bg-terracotta-500/15 hover:text-charcoal-500 dark:hover:text-cream-100',
                    'transition-all duration-200 hover:scale-[1.02]',
                  )"
                >
                  <ShieldCheckIcon class="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </router-link>

                <button
                  @click="handleLogout"
                  :class="cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
                    'text-terracotta-500 hover:bg-terracotta-500/10',
                    'transition-all duration-200 hover:scale-[1.02]',
                  )"
                >
                  <ArrowRightOnRectangleIcon class="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Mobile Menu Button -->
      <button
        @click="toggleNav"
        class="md:hidden p-2 rounded-xl text-charcoal-300 hover:text-charcoal-500 dark:text-cream-100/80 dark:hover:text-cream-100 hover:bg-ochre-500/10 transition-all duration-300 transform-gpu hover:scale-110 active:scale-95"
        aria-label="Toggle navigation"
      >
        <Bars3Icon v-if="!isOpen" class="w-6 h-6" />
        <XMarkIcon v-else class="w-6 h-6" />
      </button>
    </div>

    <!-- Mobile Nav -->
    <div
      ref="backdropRef"
      v-if="isOpen"
      class="fixed inset-0 bg-cream-100/70 dark:bg-charcoal-600/80 backdrop-blur-xl z-40 md:hidden"
      @click="toggleNav"
    />
    <div
      ref="navRef"
      class="fixed top-0 left-0 h-full w-72 z-50 glass border-r border-charcoal-500/10 dark:border-cream-100/10 p-8 md:hidden transform-gpu"
      :style="!isOpen ? { transform: 'translateX(-100%)' } : undefined"
    >
      <div class="flex flex-col gap-2 mt-16">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          @click="navigate(item.path)"
          :class="
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
              'transition-all duration-300 transform-gpu',
              'hover:scale-[1.03] active:scale-[0.97]',
              isActive(item.path)
                ? 'bg-ochre-500/15 ring-1 ring-ochre-500/30 text-charcoal-500 dark:text-cream-100'
                : 'text-charcoal-300 hover:text-charcoal-500 hover:bg-ochre-500/10 dark:text-cream-100/80 dark:hover:text-cream-100',
            )
          "
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span>{{ item.name }}</span>
        </router-link>

        <button
          @click="toggleTheme()"
          :aria-label="themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :class="cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
            'text-charcoal-300 hover:text-charcoal-500 hover:bg-ochre-500/10',
            'dark:text-cream-100/80 dark:hover:text-cream-100',
            'transition-all duration-300 transform-gpu hover:scale-[1.03] active:scale-[0.97]',
          )"
        >
          <SunIcon v-if="themeMode === 'dark'" class="w-5 h-5" />
          <MoonIcon v-else class="w-5 h-5" />
          <span>{{ themeMode === 'dark' ? 'Light Mode' : 'Dark Mode' }}</span>
        </button>

        <div v-if="!isAuthenticated" class="flex flex-col gap-2 mt-4 pt-4 border-t border-charcoal-500/10 dark:border-cream-100/10">
          <router-link
            :to="{ path: '/login', query: { redirect: route.fullPath } }"
            @click="closeNav"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-charcoal-300 hover:text-charcoal-500 hover:bg-ochre-500/10 dark:text-cream-100/80 dark:hover:text-cream-100 transition-all duration-300 transform-gpu hover:scale-[1.03] active:scale-[0.97]"
          >
            <UserIcon class="w-5 h-5" />
            <span>Sign In</span>
          </router-link>
          <router-link
            :to="{ path: '/signup', query: { redirect: route.fullPath } }"
            @click="closeNav"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 transform-gpu hover:scale-[1.03] active:scale-[0.97]"
          >
            <UserIcon class="w-5 h-5" />
            <span>Sign Up</span>
          </router-link>
        </div>

        <div v-else class="flex flex-col gap-2 mt-4 pt-4 border-t border-charcoal-500/10 dark:border-cream-100/10">
          <div class="px-4 py-2 mb-2">
            <p class="text-sm font-medium text-charcoal-500 dark:text-cream-100">{{ user?.name }}</p>
            <p class="text-xs text-charcoal-200 dark:text-cream-300/70">{{ user?.email }}</p>
          </div>
          <router-link
            to="/account"
            @click="navigate('/account')"
            :class="cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
              'transition-all duration-300 transform-gpu hover:scale-[1.03] active:scale-[0.97]',
              isActive('/account')
                ? 'bg-ochre-500/15 ring-1 ring-ochre-500/30 text-charcoal-500 dark:text-cream-100'
                : 'text-charcoal-300 hover:text-charcoal-500 hover:bg-ochre-500/10 dark:text-cream-100/80 dark:hover:text-cream-100',
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
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
              'transition-all duration-300 transform-gpu hover:scale-[1.03] active:scale-[0.97]',
              isActive('/admin')
                ? 'bg-terracotta-500/15 ring-1 ring-terracotta-500/30 text-charcoal-500 dark:text-cream-100'
                : 'text-charcoal-300 hover:text-charcoal-500 hover:bg-terracotta-500/10 dark:text-cream-100/80 dark:hover:text-cream-100',
            )"
          >
            <ShieldCheckIcon class="w-5 h-5" />
            <span>Admin Dashboard</span>
          </router-link>
          <button
            @click="handleLogout"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-terracotta-500 hover:bg-terracotta-500/10 transition-all duration-300 transform-gpu hover:scale-[1.03] active:scale-[0.97]"
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
