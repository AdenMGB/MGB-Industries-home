<script setup lang="ts">
import { onMounted } from 'vue'
import { gsap } from 'gsap'
import { CodeBracketIcon, RocketLaunchIcon, HeartIcon } from '@heroicons/vue/24/solid'
import { cn } from '@/utils/cn'
import { useRouter } from 'vue-router'

const router = useRouter()

const techIcons = [
  { icon: CodeBracketIcon, label: 'Rust', color: 'bg-orange-300' },
  { icon: CodeBracketIcon, label: 'TypeScript', color: 'bg-blue-300' },
  { icon: RocketLaunchIcon, label: 'Vue.js', color: 'bg-green-300' },
  { icon: HeartIcon, label: 'SvelteKit', color: 'bg-red-300' },
]

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(() => {
  // Advanced multi-property animation for title
  gsap.fromTo('.hero-title',
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
    }
  )

  // Staggered subtitle with rotation
  gsap.fromTo('.hero-subtitle',
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
    }
  )

  // Description with clip-path reveal
  gsap.fromTo('.hero-description',
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
    }
  )

  // Advanced tech icons with scale + rotation + stagger
  // Same animation for CTA buttons
  const allAnimatedElements = document.querySelectorAll('.tech-icon, .cta-button')
  gsap.fromTo(allAnimatedElements,
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
    }
  )

  // Continuous subtle float animation for tech icons
  techIcons.forEach((_, index) => {
    gsap.to(`.tech-icon:nth-child(${index + 1})`, {
      y: -8,
      duration: 2 + index * 0.3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1 + index * 0.2,
    })
  })
})
</script>

<template>
  <section class="relative min-h-screen flex items-center justify-center px-4 md:px-8 overflow-hidden bg-cream">
    <!-- Animated gradient background with blur -->
    <div class="absolute inset-0 bg-gradient-to-br from-cream via-mint/5 to-lavender/5 backdrop-blur-2xl transition-all duration-1000" />

    <!-- Asymmetric layout container -->
    <div class="relative z-10 max-w-7xl mx-auto w-full">
      <div class="grid md:grid-cols-12 gap-8 items-center">
        <!-- Left side - Title (spans 7 cols) -->
        <div class="md:col-span-7 space-y-6">
          <h1 class="hero-title text-6xl md:text-8xl lg:text-[10rem] font-light tracking-tight text-gray-800 leading-none">
            AdenMGB
          </h1>
          <h2 class="hero-subtitle text-2xl md:text-3xl font-light text-gray-600 transform-gpu" style="transform-style: preserve-3d;">
            Open Source Developer
          </h2>
          <p class="hero-description text-lg md:text-xl text-gray-500 max-w-xl">
            Creative Technologist • Building beautiful, performant applications
          </p>
        </div>

        <!-- Right side - Tech stack in unique layout (spans 5 cols) -->
        <div class="md:col-span-5 space-y-4">
          <!-- Equal-sized 2x2 grid for tech icons -->
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="(tech, index) in techIcons"
              :key="index"
              class="tech-icon"
            >
              <div
                :class="cn(
                  'px-5 py-3 rounded-xl',
                  'bg-white/50 backdrop-blur-md',
                  'border border-gray-200/40',
                  'text-gray-700 font-normal text-sm',
                  'flex items-center gap-2',
                  'hover:bg-white/70 transition-all duration-300',
                  'shadow-sm hover:shadow-md',
                )"
              >
                <component :is="tech.icon" class="w-4 h-4" />
                <span>{{ tech.label }}</span>
              </div>
            </div>
          </div>

          <!-- CTA buttons in vertical stack with same animation -->
          <div class="flex flex-col gap-3 pt-4">
            <button 
              @click="router.push('/projects')"
              class="cta-button px-6 py-3 rounded-lg font-normal text-white transition-all duration-300 hover:opacity-90 bg-peach shadow-md hover:shadow-lg"
            >
              View My Work
            </button>
            <a
              href="https://github.com/AdenMGB"
              target="_blank"
              rel="noopener noreferrer"
              class="cta-button px-6 py-3 rounded-lg font-normal text-white transition-all duration-300 hover:opacity-90 bg-lavender shadow-md hover:shadow-lg text-center"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll indicator with pulse animation -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2">
      <div class="text-gray-400 text-xs font-light animate-pulse">Scroll</div>
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
.tech-icon,
.cta-button {
  opacity: 0;
  transform: translateY(20px) scale(0.8) rotate(-5deg);
}
</style>
