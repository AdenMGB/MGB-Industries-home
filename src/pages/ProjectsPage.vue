<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/utils/cn'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const searchQuery = ref('')
const selectedFilter = ref<string | null>(null)

const projects = [
  {
    title: 'Drop-OSS',
    description: 'Desktop companion app for Drop - a download client, game launcher, and distribution endpoint. Built with Rust for performance and reliability.',
    tags: ['Rust', 'Desktop', 'Open Source', 'Tauri'],
    href: 'https://github.com/Drop-OSS/drop-app',
    featured: true,
    year: '2024',
  },
  {
    title: 'DesQTA',
    description: 'Native desktop port of SEQTA website and BetterSEQTA+ interface, bringing web functionality to desktop with enhanced UX.',
    tags: ['Svelte', 'Desktop', 'Electron', 'Education'],
    href: 'https://github.com/BetterSEQTA/DesQTA',
    featured: false,
    year: '2024',
  },
  {
    title: 'BetterSEQTA+',
    description: 'Enhanced interface and features for SEQTA Learn, improving the student experience with modern web technologies.',
    tags: ['Vue', 'Web', 'Education', 'TypeScript'],
    featured: false,
    year: '2023',
  },
  {
    title: 'Portfolio Site',
    description: 'This very site - a showcase of modern web technologies, creative development, and interactive experiences.',
    tags: ['Vue 3', 'Three.js', 'GSAP', 'Tailwind'],
    featured: false,
    year: '2025',
  },
]

// Simplified filter categories
const filterCategories = [
  'Desktop',
  'Web',
  'Open Source',
]

const filteredProjects = computed(() => {
  let filtered = projects

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags.some(t => t.toLowerCase().includes(query))
    )
  }

  if (selectedFilter.value) {
    filtered = filtered.filter(p => p.tags.includes(selectedFilter.value!))
  }

  return filtered
})

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(async () => {
  await nextTick()
  
  // Set initial states to prevent flash
  gsap.set('.page-header', { opacity: 0, y: 30, scale: 0.96 })
  gsap.set('.search-container', { opacity: 0, x: -30, scale: 0.95 })
  gsap.set('.filter-tag', { opacity: 0, scale: 0.8, x: 20 })
  gsap.set('[data-project-card]', { opacity: 0, y: 40, scale: 0.95 })
  
  // Create a timeline - all top elements animate together
  const tl = gsap.timeline({ defaults: { ease: premiumEase } })
  
  // All three animate simultaneously at the same time
  tl.to('.page-header', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.6,
  }, 0)
  
  tl.to('.search-container', {
    opacity: 1,
    x: 0,
    scale: 1,
    duration: 0.5,
  }, 0)
  
  tl.to('.filter-tag', {
    opacity: 1,
    scale: 1,
    x: 0,
    duration: 0.4,
    stagger: 0.04,
  }, 0)
  
  // Simple card animation on scroll
  await nextTick()
  ScrollTrigger.refresh()
  
  gsap.to('[data-project-card]', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.6,
    stagger: 0.1,
    ease: premiumEase,
    scrollTrigger: {
      trigger: '.projects-grid',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  })
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Asymmetric header layout -->
      <div class="page-header mb-20 grid md:grid-cols-12 gap-8 items-end">
        <div class="md:col-span-8">
          <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800">
            Projects
          </h1>
        </div>
        <div class="md:col-span-4">
          <p class="text-base text-gray-600">
            A collection of work spanning desktop applications, web platforms, and open-source contributions.
          </p>
        </div>
      </div>

      <!-- Search and filters side by side -->
      <div class="mb-16 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <!-- Search bar -->
        <div class="search-container md:flex-1 md:min-w-[300px] md:max-w-md">
          <div
            :class="cn(
              'relative w-full',
              'bg-white/40 backdrop-blur-md rounded-xl',
              'border border-gray-200/50',
              'transition-all duration-300 hover:bg-white/50',
            )"
          >
            <MagnifyingGlassIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search projects..."
              :class="cn(
                'w-full pl-12 pr-4 py-3 bg-transparent',
                'text-gray-700 placeholder-gray-400',
                'focus:outline-none rounded-xl',
              )"
            />
          </div>
        </div>

        <!-- Filter Tags next to search -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="selectedFilter = null"
            class="filter-tag"
            :class="cn(
              'px-4 py-1.5 rounded-lg text-sm font-normal transition-all duration-300',
              selectedFilter === null
                ? 'bg-peach/30 text-gray-800 scale-105'
                : 'bg-white/40 text-gray-600 hover:bg-white/60 hover:scale-105',
            )"
          >
            All
          </button>
          <button
            v-for="category in filterCategories"
            :key="category"
            @click="selectedFilter = selectedFilter === category ? null : category"
            class="filter-tag"
            :class="cn(
              'px-4 py-1.5 rounded-lg text-sm font-normal transition-all duration-300',
              selectedFilter === category
                ? 'bg-lavender/30 text-gray-800 scale-105'
                : 'bg-white/40 text-gray-600 hover:bg-white/60 hover:scale-105',
            )"
          >
            {{ category }}
          </button>
        </div>
      </div>

      <!-- Asymmetric masonry-style grid -->
      <div
        v-if="filteredProjects.length > 0"
        class="projects-grid grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-auto"
      >
        <div
          v-for="(project, index) in filteredProjects"
          :key="index"
          data-project-card
          :class="cn(
            'transform-gpu',
            index === 0 ? 'md:col-span-7 md:row-span-2' : 'md:col-span-5',
            index === 2 && 'md:col-span-7',
          )"
        >
          <div
            :class="cn(
              'h-full p-6 md:p-8 rounded-xl',
              'bg-white/40 backdrop-blur-md',
              'border border-gray-200/50',
              'hover:bg-white/60 transition-all duration-300',
              'group cursor-pointer',
            )"
          >
            <div class="flex flex-col h-full">
              <h3 class="text-xl md:text-2xl font-semibold mb-3 text-gray-800 group-hover:text-coral transition-colors duration-300">
                {{ project.title }}
              </h3>
              <p 
                :class="cn(
                  'text-sm md:text-base text-gray-600 mb-4 leading-relaxed flex-1',
                  index === 0 && 'text-base md:text-lg',
                )"
              >
                {{ project.description }}
              </p>
              <div class="flex flex-wrap gap-2 mb-4">
                <span
                  v-for="tag in project.tags"
                  :key="tag"
                  :class="cn(
                    'px-2.5 py-1 text-xs font-normal rounded-md',
                    'bg-mint/20 text-gray-600 border border-mint/30',
                    'transition-all duration-300 group-hover:bg-mint/30',
                  )"
                >
                  {{ tag }}
                </span>
              </div>
              <a
                v-if="project.href"
                :href="project.href"
                target="_blank"
                rel="noopener noreferrer"
                :class="cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-normal',
                  'bg-peach/20 text-gray-700 hover:bg-peach/30',
                  'transition-all duration-300 group-hover:translate-x-1',
                )"
              >
                View Project
                <svg class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else
        :class="cn(
          'text-center py-24 rounded-xl',
          'bg-white/40 backdrop-blur-sm border border-gray-200/50',
        )"
      >
        <p class="text-gray-600">
          No projects found
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-tag {
  transform-origin: center center;
}

[data-project-card] {
  transform-style: preserve-3d;
  perspective: 1000px;
}
</style>
