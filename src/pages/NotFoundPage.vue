<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { HomeIcon, CommandLineIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const excuses = [
  'Someone probably ate the page. Happens.',
  '404: The page went to get milk. It is not coming back.',
  'This page is on a coffee break. Indefinitely.',
  'The page joined a band and moved to the coast.',
  'This page failed its GPS. It is lost. We are all lost.',
]

const randomExcuse = excuses[Math.floor(Math.random() * excuses.length)]!

onMounted(() => {
  gsap.fromTo(
    '.not-found-content',
    { opacity: 0, y: 40, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: premiumEase },
  )
})
</script>

<template>
  <div class="min-h-screen pt-32 pb-16 px-4 md:px-8 flex items-center justify-center">
    <div class="not-found-content max-w-2xl mx-auto text-center">
      <h1
        class="font-display text-[10rem] md:text-[14rem] leading-none tracking-tighter text-ochre-500/40 dark:text-ochre-300/30 select-none"
      >
        404
      </h1>
      <h2
        class="font-display text-3xl md:text-5xl font-normal mb-4 text-charcoal-500 dark:text-cream-100 tracking-tight"
      >
        Well, this is
        <span class="italic text-terracotta-500 dark:text-ochre-300">awkward.</span>
      </h2>
      <p class="text-base md:text-lg text-charcoal-300 dark:text-cream-100/65 mb-10">
        {{ randomExcuse }}
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          @click="router.push('/')"
          data-cursor="magnetic"
          class="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 hover:shadow-glow hover:scale-[1.04] active:scale-[0.97]"
        >
          <HomeIcon class="w-4 h-4" />
          Go home
        </button>
        <button
          @click="router.push('/developer-tools')"
          data-cursor="magnetic"
          class="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-charcoal-500 dark:text-cream-100 ring-1 ring-charcoal-500/15 dark:ring-cream-100/15 hover:ring-ochre-500/40 hover:bg-ochre-500/5 transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
        >
          <CommandLineIcon class="w-4 h-4" />
          Browse the toolkit
        </button>
      </div>
    </div>
  </div>
</template>
