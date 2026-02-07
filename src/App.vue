<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import HeroScene from './components/HeroScene.vue'
import MagneticDock from './components/MagneticDock.vue'
import WorkSection from './components/WorkSection.vue'
import ClientOnly from './components/ClientOnly.vue'
import { useTheme } from './composables/useTheme'
import { cn } from './utils/cn'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const { themeMode } = useTheme()

onMounted(() => {
  // Animate hero text
  gsap.fromTo('.hero-title',
    { opacity: 0, y: 50 },
    { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
  )
  
  gsap.fromTo('.hero-subtitle',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1, delay: 0.2, ease: 'power3.out' }
  )

  // Sync scroll with 3D rotation
  ScrollTrigger.create({
    trigger: 'body',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const progress = self.progress
      document.documentElement.style.setProperty('--scroll-progress', progress.toString())
    },
  })
})

watch(() => themeMode.value, (mode) => {
  if (mode === 'hacker') {
    document.body.style.fontFamily = 'JetBrains Mono, monospace'
  } else {
    document.body.style.fontFamily = 'Inter, system-ui, sans-serif'
  }
}, { immediate: true })
</script>

<template>
  <div
    :class="cn(
      'min-h-screen bg-deep-space text-white overflow-x-hidden',
      'relative',
      themeMode === 'hacker' && 'bg-black',
    )"
  >
    <!-- Aurora Background Gradient -->
    <div
      :class="cn(
        'fixed inset-0 -z-10',
        'bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-teal-900/20',
        'animate-aurora',
        themeMode === 'hacker' && 'hidden',
      )"
      style="background-size: 200% 200%;"
    />

    <!-- Noise Texture -->
    <div
      v-if="themeMode !== 'hacker'"
      class="fixed inset-0 -z-10 opacity-[0.03]"
      style="background-image: url('data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E');"
    />

    <!-- Hero Section -->
    <section class="relative min-h-screen flex items-center justify-center px-4 md:px-8">
      <ClientOnly>
        <template #default>
          <HeroScene />
        </template>
      </ClientOnly>
      
      <div class="relative z-10 text-center max-w-4xl mx-auto">
        <h1
          :class="cn(
            'hero-title text-6xl md:text-8xl lg:text-9xl font-bold mb-6',
            'bg-clip-text text-transparent bg-gradient-to-r',
            'from-purple-400 via-teal-400 to-blue-400',
            'tracking-tighter',
            themeMode === 'hacker' && 'font-mono text-green-400 bg-none',
          )"
        >
          AdenMGB
        </h1>
        <p
          :class="cn(
            'hero-subtitle text-xl md:text-2xl text-white/80 mb-8',
            'backdrop-blur-sm bg-white/5 px-6 py-3 rounded-full',
            'inline-block border border-white/10',
            themeMode === 'hacker' && 'font-mono text-green-300 bg-black/60 border-green-500/30',
          )"
        >
          Open Source Developer • Creative Technologist
        </p>
        <div
          :class="cn(
            'flex flex-wrap justify-center gap-4 text-sm text-white/60',
            themeMode === 'hacker' && 'font-mono text-green-400/80',
          )"
        >
          <span>Rust</span>
          <span>•</span>
          <span>TypeScript</span>
          <span>•</span>
          <span>Vue.js</span>
          <span>•</span>
          <span>SvelteKit</span>
          <span>•</span>
          <span>Three.js</span>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div
        :class="cn(
          'absolute bottom-20 left-1/2 -translate-x-1/2',
          'flex flex-col items-center gap-2 animate-float',
        )"
      >
        <span
          :class="cn(
            'text-xs text-white/40 uppercase tracking-wider',
            themeMode === 'hacker' && 'text-green-500/60 font-mono',
          )"
        >
          Scroll
        </span>
        <div
          :class="cn(
            'w-px h-12 bg-gradient-to-b from-white/20 to-transparent',
            themeMode === 'hacker' && 'from-green-500/40',
          )"
        />
      </div>
    </section>

    <!-- Work Section -->
    <WorkSection />

    <!-- About Section -->
    <section
      id="about"
      class="min-h-screen py-32 px-4 md:px-8 flex items-center"
    >
      <div class="max-w-4xl mx-auto">
        <h2
          :class="cn(
            'text-5xl md:text-7xl font-bold mb-8 text-white tracking-tighter',
            themeMode === 'hacker' && 'font-mono text-green-400',
          )"
        >
          About
        </h2>
        <div
          :class="cn(
            'prose prose-invert max-w-none',
            'backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8',
            themeMode === 'hacker' && 'bg-black/60 border-green-500/20 font-mono',
          )"
        >
          <p
            :class="cn(
              'text-lg text-white/80 leading-relaxed mb-4',
              themeMode === 'hacker' && 'text-green-300/90',
            )"
          >
            I'm Aden, a developer passionate about building beautiful, performant applications 
            and contributing to open-source projects. Based in Adelaide, Australia, I work 
            across the full stack with a focus on modern web technologies and desktop applications.
          </p>
          <p
            :class="cn(
              'text-lg text-white/80 leading-relaxed',
              themeMode === 'hacker' && 'text-green-300/90',
            )"
          >
            My work spans from Rust-based desktop applications to Vue.js and SvelteKit web 
            applications, always prioritizing user experience and code quality.
          </p>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section
      id="contact"
      class="min-h-screen py-32 px-4 md:px-8 flex items-center"
    >
      <div class="max-w-4xl mx-auto w-full text-center">
        <h2
          :class="cn(
            'text-5xl md:text-7xl font-bold mb-8 text-white tracking-tighter',
            themeMode === 'hacker' && 'font-mono text-green-400',
          )"
        >
          Get in Touch
        </h2>
        <p
          :class="cn(
            'text-xl text-white/60 mb-12',
            themeMode === 'hacker' && 'text-green-300/80 font-mono',
          )"
        >
          Let's build something amazing together.
        </p>
        <a
          href="https://github.com/AdenMGB"
          target="_blank"
          rel="noopener noreferrer"
          :class="cn(
            'inline-block px-8 py-4 rounded-xl',
            'backdrop-blur-xl bg-white/5 border border-white/10',
            'hover:bg-white/10 hover:border-white/20',
            'transition-all duration-200 transform hover:scale-105',
            'text-white font-medium',
            themeMode === 'hacker' && 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-300 font-mono',
          )"
        >
          View on GitHub
        </a>
      </div>
    </section>

    <!-- Magnetic Dock -->
    <MagneticDock />
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
</style>
