<script setup lang="ts">
import { onMounted } from 'vue'
import { gsap } from 'gsap'
import { useRouter } from 'vue-router'

const router = useRouter()

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(() => {
  // Advanced multi-property animation for title
  gsap.fromTo(
    '.hero-title',
    {
      opacity: 0,
      y: 40,
      scale: 0.96,
      filter: 'blur(10px)',
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.8,
      ease: premiumEase,
    },
  )

  // Staggered subtitle with rotation
  gsap.fromTo(
    '.hero-subtitle',
    {
      opacity: 0,
      y: 30,
      rotationX: -15,
    },
    {
      opacity: 1,
      y: 0,
      rotationX: 0,
      duration: 0.6,
      delay: 0.15,
      ease: premiumEase,
    },
  )

  // Description with clip-path reveal
  gsap.fromTo(
    '.hero-description',
    {
      opacity: 0,
      clipPath: 'inset(0 100% 0 0)',
    },
    {
      opacity: 1,
      clipPath: 'inset(0 0% 0 0)',
      duration: 0.7,
      delay: 0.3,
      ease: premiumEase,
    },
  )

  // Animate CTA buttons (and anything else we keep with `.cta-button`)
  const allAnimatedElements = document.querySelectorAll('.cta-button')
  gsap.fromTo(
    allAnimatedElements,
    {
      opacity: 0,
      y: 20,
      scale: 0.8,
      rotation: -5,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      rotation: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: premiumEase,
      delay: 0.5,
    },
  )
})
</script>

<template>
  <section
    class="relative min-h-screen flex items-center justify-center px-4 md:px-8 overflow-hidden bg-cream dark:bg-gray-950"
  >
    <!-- Animated gradient background with blur -->
    <div
      class="absolute inset-0 bg-gradient-to-br from-cream via-mint/5 to-lavender/5 dark:from-gray-950 dark:via-gray-900/50 dark:to-gray-900/50 backdrop-blur-2xl transition-all duration-1000"
    />

    <!-- Asymmetric layout container -->
    <div class="relative z-10 max-w-7xl mx-auto w-full">
      <div class="grid md:grid-cols-12 gap-8 items-center">
        <!-- Left side - Title (spans 7 cols) -->
        <div class="md:col-span-7 space-y-6">
          <h1
            class="hero-title text-6xl md:text-8xl lg:text-[10rem] font-light tracking-tight text-gray-800 dark:text-white leading-none"
          >
            AdenMGB
          </h1>
          <h2
            class="hero-subtitle text-2xl md:text-3xl font-light text-gray-600 dark:text-gray-300 transform-gpu"
            style="transform-style: preserve-3d"
          >
            Open Source Developer
          </h2>
        </div>

        <!-- Right side CTA buttons (spans 5 cols) -->
        <div class="md:col-span-5">
          <div class="flex flex-col gap-2 pt-1">
            <button
              @click="router.push('/projects')"
              class="cta-button w-full md:w-auto px-5 py-2.5 rounded-lg font-normal text-white transition-all duration-300 hover:opacity-90 bg-peach shadow-md hover:shadow-lg"
            >
              View My Work
            </button>
            <a
              href="https://github.com/AdenMGB"
              target="_blank"
              rel="noopener noreferrer"
              class="cta-button w-full md:w-auto px-5 py-2.5 rounded-lg font-normal text-white transition-all duration-300 hover:opacity-90 bg-lavender shadow-md hover:shadow-lg text-center"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll indicator with pulse animation -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2">
      <div class="text-gray-400 dark:text-gray-500 text-xs font-light animate-pulse">Scroll</div>
    </div>
  </section>
</template>

<style scoped>
.hero-title {
  transform-origin: left center;
}

.hero-subtitle {
  transform-origin: left center;
  perspective: 1000px;
}

/* Hide elements initially to prevent flash before GSAP animation */
.cta-button {
  opacity: 0;
  transform: translateY(20px) scale(0.8) rotate(-5deg);
}
</style>
