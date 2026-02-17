<script setup lang="ts">
import { onMounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/utils/cn'
import { MapPinIcon, CodeBracketIcon, RocketLaunchIcon } from '@heroicons/vue/24/solid'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const timeline = [
  {
    year: '2023',
    title: 'Started Basic Development',
    description: 'Started learning how to code in html & css',
  },
  {
    year: '2024',
    title: 'Started Web Development',
    description: 'Started building user facing web applications',
  },
  {
    year: '2025',
    title: 'Started Desktop Development',
    description: 'Started building desktop applications like DesQTA and Drop-Cleint',
  },
  {
    year: '2026',
    title: 'Started to learn Network Engineering',
    description: 'Started learning about network engineering and how to build networks',
  },
]

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(() => {
  // Header with fade + scale + translateY
  gsap.fromTo(
    '.page-header',
    {
      opacity: 0,
      y: 30,
      scale: 0.96,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      ease: premiumEase,
    },
  )

  // Bio section with scale + fade
  gsap.fromTo(
    '.bio-section',
    {
      opacity: 0,
      scale: 0.96,
      y: 30,
    },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.6,
      ease: premiumEase,
      scrollTrigger: {
        trigger: '.bio-section',
        start: 'top 85%',
      },
    },
  )

  // Simplified timeline items with fade + translateY
  gsap.fromTo(
    '.timeline-item',
    {
      opacity: 0,
      y: 30,
      scale: 0.96,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      stagger: 0.1,
      ease: premiumEase,
      scrollTrigger: {
        trigger: '.timeline',
        start: 'top 80%',
      },
    },
  )
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-6xl mx-auto">
      <!-- Header (Admin-style typography) -->
      <div class="page-header mb-12">
        <h1
          class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white"
        >
          About AdenMGB
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Developer passionate about building beautiful, performant applications and contributing to
          open-source.
        </p>
      </div>

      <!-- Bio Section (Admin-style card with pastel accents) -->
      <div
        class="bio-section mb-20 p-8 md:p-12 rounded-2xl bg-white/40 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50"
      >
        <div class="grid md:grid-cols-12 gap-12 items-start">
          <div class="md:col-span-7">
            <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">Hey, I'm Aden</h2>
            <div class="space-y-3 text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                Developer from Adelaide, Australia. Building stuff with Vue, SvelteKit, and Rust.
                Sometimes it works, sometimes it doesn't. That's the fun part.
              </p>
              <p>
                I make desktop apps, contribute to open source, and occasionally remember to commit
                my code. Currently hyperfixated on making things fast and not breaking production.
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 italic">
                Fun fact: I once spent 3 hours debugging only to realize I forgot to save the file.
                We've all been there.
              </p>
            </div>
          </div>
          <div class="md:col-span-5">
            <div
              class="p-8 rounded-2xl bg-peach/5 dark:bg-peach/10 backdrop-blur-md border border-peach/20 dark:border-peach/20 shadow-sm"
            >
              <div class="space-y-6">
                <div class="flex items-start gap-4 group cursor-default">
                  <div
                    class="p-3 rounded-xl bg-peach/10 dark:bg-peach/20 group-hover:bg-peach/20 dark:group-hover:bg-peach/30 transition-all duration-300 group-hover:scale-105"
                  >
                    <MapPinIcon class="w-5 h-5 text-peach" />
                  </div>
                  <div class="flex-1">
                    <div
                      class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5"
                    >
                      Location
                    </div>
                    <div class="text-lg font-semibold text-gray-800 dark:text-white">
                      Adelaide, Australia
                    </div>
                  </div>
                </div>
                <div class="flex items-start gap-4 group cursor-default">
                  <div
                    class="p-3 rounded-xl bg-lavender/10 dark:bg-lavender/20 group-hover:bg-lavender/20 dark:group-hover:bg-lavender/30 transition-all duration-300 group-hover:scale-105"
                  >
                    <CodeBracketIcon class="w-5 h-5 text-lavender" />
                  </div>
                  <div class="flex-1">
                    <div
                      class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5"
                    >
                      Role
                    </div>
                    <div class="text-lg font-semibold text-gray-800 dark:text-white">
                      Full Stack Developer
                    </div>
                  </div>
                </div>
                <div class="flex items-start gap-4 group cursor-default">
                  <div
                    class="p-3 rounded-xl bg-mint/10 dark:bg-mint/20 group-hover:bg-mint/20 dark:group-hover:bg-mint/30 transition-all duration-300 group-hover:scale-105"
                  >
                    <RocketLaunchIcon class="w-5 h-5 text-mint" />
                  </div>
                  <div class="flex-1">
                    <div
                      class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5"
                    >
                      Status
                    </div>
                    <div class="text-lg font-semibold text-gray-800 dark:text-white">
                      Open Source Contributor
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline (Admin-style section header) -->
      <div class="mb-20">
        <h2 class="text-2xl font-semibold mb-8 text-gray-800 dark:text-white">Timeline</h2>
        <div class="timeline relative">
          <div class="space-y-8">
            <div
              v-for="(item, index) in timeline"
              :key="index"
              class="timeline-item relative pl-12"
            >
              <!-- Timeline line -->
              <div
                v-if="index !== timeline.length - 1"
                class="absolute left-5 top-8 bottom-0 w-0.5 bg-peach/20 dark:bg-peach/40"
              />

              <!-- Timeline dot -->
              <div
                class="absolute left-0 top-1 w-3 h-3 rounded-full bg-peach border-2 border-white dark:border-gray-800 shadow-sm"
              />

              <!-- Timeline content -->
              <div
                :class="
                  cn(
                    'p-6 rounded-xl transform-gpu',
                    'bg-white/40 dark:bg-gray-800/80 backdrop-blur-sm',
                    'border border-gray-200/50 dark:border-gray-700/50',
                    'hover:bg-white/60 dark:hover:bg-gray-700/80 transition-all duration-300',
                    'hover:scale-[1.02]',
                  )
                "
              >
                <div class="mb-2">
                  <span class="text-sm font-medium text-peach">
                    {{ item.year }}
                  </span>
                </div>
                <h3 class="text-xl font-semibold mb-2 text-gray-800 dark:text-white">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-item {
  transform-origin: left center;
}
</style>
