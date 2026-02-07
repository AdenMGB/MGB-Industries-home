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
  { year: '2020', title: 'Started Development', description: 'Began journey in web development' },
  { year: '2021', title: 'First Open Source', description: 'Contributed to open source projects' },
  { year: '2022', title: 'Desktop Apps', description: 'Started building desktop applications' },
  { year: '2023', title: 'BetterSEQTA+', description: 'Led development of BetterSEQTA+' },
  { year: '2024', title: 'Drop-OSS', description: 'Co-founded Drop-OSS project' },
]

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(() => {
  // Header with fade + scale + translateY
  gsap.fromTo('.page-header',
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
    }
  )

  // Bio section with scale + fade
  gsap.fromTo('.bio-section',
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
    }
  )

  // Simplified timeline items with fade + translateY
  gsap.fromTo('.timeline-item',
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
    }
  )
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-6xl mx-auto">
      <!-- Asymmetric header -->
      <div class="page-header mb-20 grid md:grid-cols-12 gap-8">
        <div class="md:col-span-8">
          <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800">
            About AdenMGB
          </h1>
        </div>
        <div class="md:col-span-4 flex items-end">
          <p class="text-base text-gray-600">
            Developer passionate about building beautiful, performant applications and contributing to open-source.
          </p>
        </div>
      </div>

      <!-- Bio Section with unique layout -->
      <div
        class="bio-section mb-20 p-8 md:p-12 rounded-2xl bg-white/40 backdrop-blur-md border border-gray-200/50"
      >
        <div class="grid md:grid-cols-12 gap-12 items-start">
          <div class="md:col-span-7">
            <h2 class="text-2xl font-light mb-6 text-gray-800">
              Hey, I'm Aden
            </h2>
            <div class="space-y-3 text-base text-gray-600 leading-relaxed">
              <p>
                Developer from Adelaide, Australia. Building stuff with Vue, SvelteKit, and Rust. 
                Sometimes it works, sometimes it doesn't. That's the fun part.
              </p>
              <p>
                I make desktop apps, contribute to open source, and occasionally remember to commit my code. 
                Currently hyperfixated on making things fast and not breaking production.
              </p>
              <p class="text-sm text-gray-500 italic">
                Fun fact: I once spent 3 hours debugging only to realize I forgot to save the file. 
                We've all been there.
              </p>
            </div>
          </div>
          <div class="md:col-span-5">
            <div class="p-8 rounded-2xl bg-white/50 backdrop-blur-md border border-gray-200/50 shadow-sm">
              <div class="space-y-6">
                <div class="flex items-start gap-4 group cursor-default">
                  <div class="p-3 rounded-xl bg-peach/10 group-hover:bg-peach/20 transition-all duration-300 group-hover:scale-105">
                    <MapPinIcon class="w-5 h-5 text-peach" />
                  </div>
                  <div class="flex-1">
                    <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Location</div>
                    <div class="text-lg font-semibold text-gray-800">Adelaide, Australia</div>
                  </div>
                </div>
                <div class="flex items-start gap-4 group cursor-default">
                  <div class="p-3 rounded-xl bg-lavender/10 group-hover:bg-lavender/20 transition-all duration-300 group-hover:scale-105">
                    <CodeBracketIcon class="w-5 h-5 text-lavender" />
                  </div>
                  <div class="flex-1">
                    <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Role</div>
                    <div class="text-lg font-semibold text-gray-800">Full Stack Developer</div>
                  </div>
                </div>
                <div class="flex items-start gap-4 group cursor-default">
                  <div class="p-3 rounded-xl bg-mint/10 group-hover:bg-mint/20 transition-all duration-300 group-hover:scale-105">
                    <RocketLaunchIcon class="w-5 h-5 text-mint" />
                  </div>
                  <div class="flex-1">
                    <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Status</div>
                    <div class="text-lg font-semibold text-gray-800">Open Source Contributor</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Simplified Timeline -->
      <div class="mb-20">
        <h2 class="text-3xl font-light mb-12 text-gray-800">
          Timeline
        </h2>
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
                class="absolute left-5 top-8 bottom-0 w-0.5 bg-peach/20"
              />
              
              <!-- Timeline dot -->
              <div
                class="absolute left-0 top-1 w-3 h-3 rounded-full bg-peach border-2 border-white shadow-sm"
              />
              
              <!-- Timeline content -->
              <div
                :class="cn(
                  'p-6 rounded-xl transform-gpu',
                  'bg-white/40 backdrop-blur-sm',
                  'border border-gray-200/50',
                  'hover:bg-white/60 transition-all duration-300',
                  'hover:scale-[1.02]',
                )"
              >
                <div class="mb-2">
                  <span class="text-sm font-medium text-peach">
                    {{ item.year }}
                  </span>
                </div>
                <h3 class="text-xl font-semibold mb-2 text-gray-800">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-gray-600">
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
