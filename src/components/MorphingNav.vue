<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'
import { HomeIcon, FolderIcon, UserIcon, EnvelopeIcon, CubeIcon } from '@heroicons/vue/24/solid'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'

const route = useRoute()
const router = useRouter()

const isOpen = ref(false)
const navRef = ref<HTMLElement>()
const backdropRef = ref<HTMLElement>()

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

const isActive = (path: string) => route.path === path

// Animate nav items on mount
onMounted(() => {
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
      </div>
    </div>
  </nav>
</template>

<style scoped>
.desktop-nav-item {
  transform-origin: center center;
}
</style>
