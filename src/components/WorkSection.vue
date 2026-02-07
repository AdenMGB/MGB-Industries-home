<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ProjectCard from './ProjectCard.vue'
import { useTheme } from '@/composables/useTheme'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const { themeMode } = useTheme()

const sectionRef = ref<HTMLElement>()

const projects = [
  {
    title: 'Drop-OSS',
    description: 'Desktop companion app for Drop - a download client, game launcher, and distribution endpoint built with Rust.',
    tags: ['Rust', 'Desktop', 'Open Source'],
    href: 'https://github.com/Drop-OSS/drop-app',
    featured: true,
  },
  {
    title: 'DesQTA',
    description: 'Native desktop port of SEQTA website and BetterSEQTA+ interface, bringing web functionality to desktop.',
    tags: ['Svelte', 'Desktop', 'Electron'],
    href: 'https://github.com/BetterSEQTA/DesQTA',
    featured: false,
  },
  {
    title: 'BetterSEQTA+',
    description: 'Enhanced interface and features for SEQTA Learn, improving the student experience.',
    tags: ['Vue', 'Web', 'Education'],
    featured: false,
  },
  {
    title: 'Portfolio Site',
    description: 'This very site - a showcase of modern web technologies and creative development.',
    tags: ['Vue 3', 'Three.js', 'GSAP'],
    featured: false,
  },
]

onMounted(() => {
  if (!sectionRef.value) return

  const cards = sectionRef.value.querySelectorAll('[data-project-card]')
  
  gsap.fromTo(cards, 
    {
      opacity: 0,
      y: 50,
      scale: 0.9,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: sectionRef.value,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
      },
    }
  )
})
</script>

<template>
  <section
    ref="sectionRef"
    id="work"
    class="min-h-screen py-32 px-4 md:px-8"
  >
    <div class="max-w-7xl mx-auto">
      <h2
        :class="[
          'text-5xl md:text-7xl font-bold mb-4 text-white tracking-tighter',
          themeMode === 'hacker' && 'font-mono text-green-400',
        ]"
      >
        Work
      </h2>
      <p
        :class="[
          'text-xl text-white/60 mb-16 max-w-2xl',
          themeMode === 'hacker' && 'text-green-300/80 font-mono',
        ]"
      >
        Selected projects showcasing expertise in modern web technologies, desktop applications, and open-source contributions.
      </p>
      
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr"
      >
        <div
          v-for="(project, index) in projects"
          :key="index"
          data-project-card
        >
          <ProjectCard
            :title="project.title"
            :description="project.description"
            :tags="project.tags"
            :href="project.href"
            :featured="project.featured"
          />
        </div>
      </div>
    </div>
  </section>
</template>
