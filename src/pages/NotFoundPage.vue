<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const excuses = [
  "Someone probably ate the page. Happens.",
  "404: The page went to get milk. It's not coming back.",
  "This page is on a coffee break. Indefinitely.",
  "The page joined a band and moved to the coast.",
  "404: Our hamsters are still powering the servers. One escaped.",
  "This page failed its GPS. It's lost. We're all lost.",
]

const randomExcuse = excuses[Math.floor(Math.random() * excuses.length)]!

onMounted(() => {
  gsap.fromTo('.not-found-content',
    { opacity: 0, y: 40, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: premiumEase }
  )
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8 flex items-center justify-center">
    <div class="not-found-content max-w-2xl mx-auto text-center">
      <h1 class="text-9xl md:text-[12rem] font-light tracking-tighter text-peach/80 dark:text-peach/60 select-none">
        404
      </h1>
      <h2 class="text-2xl md:text-3xl font-light mb-4 text-gray-800 dark:text-gray-200">
        Well, this is awkward.
      </h2>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
        {{ randomExcuse }}
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          @click="router.push('/')"
          :class="cn(
            'flex items-center justify-center gap-2 px-6 py-3 rounded-lg',
            'bg-peach/30 hover:bg-peach/40 dark:bg-peach/20 dark:hover:bg-peach/30',
            'text-gray-800 dark:text-gray-200 font-medium',
            'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-peach/50',
          )"
        >
          <HomeIcon class="w-5 h-5" />
          Go home
        </button>
        <button
          @click="router.push('/games')"
          :class="cn(
            'flex items-center justify-center gap-2 px-6 py-3 rounded-lg',
            'bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-700/60',
            'border border-gray-200/50 dark:border-gray-600/50',
            'text-gray-700 dark:text-gray-300 font-medium',
            'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-lavender/50',
          )"
        >
          <MagnifyingGlassIcon class="w-5 h-5" />
          Play games instead
        </button>
      </div>
    </div>
  </div>
</template>
