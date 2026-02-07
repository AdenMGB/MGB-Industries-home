<script setup lang="ts">
import { onMounted } from 'vue'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { EnvelopeIcon, HeartIcon } from '@heroicons/vue/24/solid'

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

  // Contact cards with stagger and scale
  gsap.fromTo('.contact-card',
    {
      opacity: 0,
      y: 30,
      scale: 0.95,
      rotationY: -5,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      rotationY: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: premiumEase,
    }
  )
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8 flex items-center">
    <div class="max-w-4xl mx-auto w-full">
      <!-- Asymmetric header -->
      <div class="page-header mb-16 grid md:grid-cols-12 gap-8">
        <div class="md:col-span-7">
          <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800">
            Get in Touch
          </h1>
        </div>
        <div class="md:col-span-5 flex items-end">
          <p class="text-base text-gray-600">
            Have a project in mind? Want to collaborate? Or just want to say hi?
          </p>
        </div>
      </div>

      <!-- Contact Info -->
      <div class="space-y-6">
        <div
          class="contact-card p-8 rounded-xl bg-white/40 backdrop-blur-md border border-gray-200/50"
        >
          <h2 class="text-xl font-light mb-6 text-gray-800">
            Contact
          </h2>
          <div class="space-y-3">
            <a
              href="mailto:aden@adenmgb.com"
              :class="cn(
                'flex items-center gap-3 p-4 rounded-lg',
                'bg-white/40 hover:bg-white/60',
                'transition-all duration-300 hover:scale-105',
                'text-gray-700',
                'border border-gray-200/50',
              )"
            >
              <EnvelopeIcon class="w-5 h-5 text-gray-500" />
              <span>aden@adenmgb.com</span>
            </a>
            <a
              href="https://github.com/AdenMGB"
              target="_blank"
              rel="noopener noreferrer"
              :class="cn(
                'flex items-center gap-3 p-4 rounded-lg',
                'bg-white/40 hover:bg-white/60',
                'transition-all duration-300 hover:scale-105',
                'text-gray-700',
                'border border-gray-200/50',
              )"
            >
              <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
              <span>github.com/AdenMGB</span>
            </a>
          </div>
        </div>

        <div
          class="contact-card p-6 rounded-xl bg-mint/20 backdrop-blur-sm border border-mint/30"
        >
          <h3 class="text-sm font-medium mb-3 text-gray-800 flex items-center gap-2">
            <HeartIcon class="w-4 h-4 text-gray-500" />
            Availability
          </h3>
          <p class="text-sm text-gray-600">
            Currently available for freelance projects and open-source collaborations. 
            Always interested in discussing new opportunities.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-card {
  transform-style: preserve-3d;
  transform-origin: center center;
}
</style>
