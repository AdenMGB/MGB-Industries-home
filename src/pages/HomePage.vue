<script setup lang="ts">
import PlayfulHero from '@/components/PlayfulHero.vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const router = useRouter()
const bioRef = ref<HTMLElement | null>(null)
const ctaRef = ref<HTMLElement | null>(null)

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

// Fonts to cycle through
const fonts = [
  'Inter',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Arial',
  'Helvetica',
  'Trebuchet MS',
  'Comic Sans MS',
  'Impact',
  'Palatino',
  'Garamond',
]

const currentFontIndex = ref(0)

onMounted(async () => {
  await nextTick()

  // Set initial state to prevent layout shifts
  if (bioRef.value) {
    gsap.set(bioRef.value, {
      opacity: 0,
      y: 20,
      force3D: true,
    })
  }

  if (ctaRef.value) {
    gsap.set(ctaRef.value, {
      opacity: 0,
      y: 40,
      scale: 0.96,
      force3D: true,
    })
  }

  // Refresh ScrollTrigger immediately to calculate correct scroll height
  ScrollTrigger.refresh()

  // Bio section fade in
  if (bioRef.value) {
    gsap.to(bioRef.value, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: premiumEase,
      scrollTrigger: {
        trigger: bioRef.value,
        start: 'top 85%',
        invalidateOnRefresh: true,
      },
    })
  }

  // CTA section with fade + scale + translateY
  if (ctaRef.value) {
    gsap.to(ctaRef.value, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.7,
      ease: premiumEase,
      force3D: true,
      scrollTrigger: {
        trigger: ctaRef.value,
        start: 'top 85%',
        invalidateOnRefresh: true,
      },
    })
  }

  // Cycle through fonts
  const cycleFonts = () => {
    currentFontIndex.value = (currentFontIndex.value + 1) % fonts.length
  }

  // Change font every 1.5 seconds
  setInterval(cycleFonts, 100)

  // Final refresh after a short delay to ensure everything is calculated
  requestAnimationFrame(() => {
    ScrollTrigger.refresh()
  })
})
</script>

<template>
  <div class="relative" style="min-height: 100vh">
    <!-- Hero -->
    <PlayfulHero />

    <!-- Bio Section with smooth blurred background transition -->
    <section ref="bioRef" class="relative py-24 px-4 md:px-8 smooth-bg-section-1">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h2 class="text-3xl md:text-5xl font-light text-gray-800 dark:text-white mb-4">About AdenMGB</h2>
          <!-- Cycling font bio -->
          <p
            class="text-lg md:text-xl text-gray-600 dark:text-gray-300 transition-all duration-500"
            :style="{ fontFamily: fonts[currentFontIndex] }"
          >
            gurt
          </p>
        </div>
      </div>
    </section>

    <!-- CTA Section with smooth blurred background transition -->
    <section ref="ctaRef" class="relative py-32 px-4 md:px-8 smooth-bg-section-2">
      <div class="max-w-4xl mx-auto">
        <!-- Split layout -->
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-4xl md:text-6xl font-light mb-6 text-gray-800 dark:text-white">
              Ready to See My Work?
            </h2>
          </div>
          <div class="space-y-4">
            <p class="text-lg text-gray-600 dark:text-gray-300 mb-8">Check out my projects or learn more about me</p>
            <div class="flex flex-col gap-3">
              <button
                @click="router.push('/projects')"
                class="px-6 py-3 rounded-lg font-normal text-white transition-all duration-300 hover:opacity-90 hover:scale-105 bg-peach"
              >
                View Projects
              </button>
              <button
                @click="router.push('/about')"
                class="px-6 py-3 rounded-lg font-normal text-white transition-all duration-300 hover:opacity-90 hover:scale-105 bg-lavender"
              >
                About Me
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.smooth-bg-section-1 {
  background: linear-gradient(
    to bottom,
    rgba(255, 248, 231, 0) 0%,
    rgba(168, 230, 207, 0.08) 30%,
    rgba(200, 168, 233, 0.12) 70%,
    rgba(200, 168, 233, 0.15) 100%
  );
  backdrop-filter: blur(20px);
  transition:
    background 1s cubic-bezier(0.4, 0, 0.2, 1),
    backdrop-filter 1s cubic-bezier(0.4, 0, 0.2, 1);
}

:global(.dark) .smooth-bg-section-1 {
  background: linear-gradient(
    to bottom,
    rgba(10, 10, 15, 0) 0%,
    rgba(31, 41, 55, 0.5) 30%,
    rgba(55, 65, 81, 0.4) 70%,
    rgba(75, 85, 99, 0.3) 100%
  );
}

.smooth-bg-section-2 {
  background: linear-gradient(
    to bottom,
    rgba(200, 168, 233, 0.15) 0%,
    rgba(200, 168, 233, 0.2) 50%,
    rgba(255, 248, 231, 0.3) 100%
  );
  backdrop-filter: blur(20px);
  transition:
    background 1s cubic-bezier(0.4, 0, 0.2, 1),
    backdrop-filter 1s cubic-bezier(0.4, 0, 0.2, 1);
}

:global(.dark) .smooth-bg-section-2 {
  background: linear-gradient(
    to bottom,
    rgba(75, 85, 99, 0.3) 0%,
    rgba(55, 65, 81, 0.5) 50%,
    rgba(31, 41, 55, 0.4) 100%
  );
}
</style>
