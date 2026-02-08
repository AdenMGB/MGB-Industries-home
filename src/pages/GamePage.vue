<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'

const route = useRoute()
const router = useRouter()

const gameId = computed(() => route.params.id as string)
const gameHref = computed(() => route.query.href as string || `Gams-main/g/${gameId.value}.html`)

const goBack = () => {
  router.push('/games')
}

onMounted(() => {
  gsap.fromTo('.game-container',
    { opacity: 0, scale: 0.95 },
    { opacity: 1, scale: 1, duration: 0.4, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' }
  )
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Back button -->
      <button
        @click="goBack"
        :class="cn(
          'mb-6 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-normal',
          'bg-white/40 backdrop-blur-md border border-gray-200/50',
          'hover:bg-white/60 transition-all duration-300',
          'hover:scale-105 active:scale-95',
          'text-gray-700 hover:text-gray-800',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Games
      </button>

      <!-- Game iframe -->
      <div class="game-container">
        <div
          :class="cn(
            'w-full rounded-xl overflow-hidden',
            'bg-white/40 backdrop-blur-md border border-gray-200/50',
            'shadow-lg',
          )"
          style="height: calc(100vh - 200px); min-height: 600px;"
        >
          <iframe
            :src="`/${gameHref}`"
            class="w-full h-full border-0"
            frameborder="0"
            allowfullscreen
          />
        </div>
      </div>
    </div>
  </div>
</template>
