<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  UserPlusIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import { useAuth } from '@/composables/useAuth'
import { loadAndInjectSaveData, setupPostMessageSync } from '@/utils/gameSaveSync'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()

const gameId = computed(() => route.params.id as string)
const gameHref = computed(() => route.query.href as string || `Gams-main/g/${gameId.value}.html`)

const iframeRef = ref<HTMLIFrameElement>()
const isLoading = ref(true)
let cleanupSync: (() => void) | null = null

const goBack = () => {
  router.push('/games')
}

onMounted(async () => {
  gsap.fromTo('.game-container',
    { opacity: 0, scale: 0.95 },
    { opacity: 1, scale: 1, duration: 0.4, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' }
  )

  // Set up save sync if authenticated
  if (isAuthenticated.value && iframeRef.value) {
    // Load and inject save data before game initializes
    iframeRef.value.addEventListener('load', async () => {
      if (iframeRef.value) {
        // Inject save data as soon as iframe loads
        await loadAndInjectSaveData(gameId.value, iframeRef.value)
        
        // Set up sync for future saves
        cleanupSync = setupPostMessageSync(gameId.value, iframeRef.value)
        
        // Hide loading indicator
        isLoading.value = false
      }
    }, { once: true })

    // Also set up sync immediately (in case iframe already loaded)
    if (iframeRef.value.contentDocument?.readyState === 'complete') {
      await loadAndInjectSaveData(gameId.value, iframeRef.value)
      cleanupSync = setupPostMessageSync(gameId.value, iframeRef.value)
      isLoading.value = false
    }
  } else {
    isLoading.value = false
  }
})

onUnmounted(() => {
  // Cleanup sync on unmount
  if (cleanupSync) {
    cleanupSync()
    cleanupSync = null
  }
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header Actions -->
      <div class="mb-6 flex items-center gap-4 flex-wrap">
        <!-- Back button -->
        <button
          @click="goBack"
          :class="cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-normal',
            'bg-white/40 backdrop-blur-md border border-gray-200/50',
            'hover:bg-white/60 transition-all duration-300',
            'hover:scale-105 active:scale-95',
            'text-gray-700 hover:text-gray-800',
          )"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Games
        </button>

        <!-- Save Status Box -->
        <div
          v-if="isAuthenticated"
          :class="cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
            'bg-green-50/80 backdrop-blur-md border border-green-200/50',
            'text-green-700',
          )"
        >
          <CloudArrowUpIcon class="w-4 h-4 animate-pulse" />
          <span class="font-medium">Syncing progress with cloud</span>
        </div>

        <!-- Sign In Prompt -->
        <div
          v-else
          :class="cn(
            'flex items-center gap-3 px-4 py-2 rounded-lg text-sm',
            'bg-peach/20 backdrop-blur-md border border-peach/30',
            'text-gray-700',
          )"
        >
          <UserPlusIcon class="w-4 h-4" />
          <span>Save your progress?</span>
          <router-link
            to="/signup"
            :class="cn(
              'flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium',
              'bg-peach/30 hover:bg-peach/40 text-gray-800',
              'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
            )"
          >
            Sign Up
            <ArrowRightIcon class="w-3 h-3" />
          </router-link>
          <span class="text-gray-500">or</span>
          <router-link
            to="/login"
            :class="cn(
              'px-3 py-1 rounded-md text-xs font-medium',
              'text-gray-700 hover:text-gray-800 underline',
              'transition-colors duration-300',
            )"
          >
            Sign In
          </router-link>
        </div>
      </div>

      <!-- Game iframe -->
      <div class="game-container">
        <div
          :class="cn(
            'w-full rounded-xl overflow-hidden relative',
            'bg-white/40 backdrop-blur-md border border-gray-200/50',
            'shadow-lg',
          )"
          style="height: calc(100vh - 200px); min-height: 600px;"
        >
          <!-- Loading indicator -->
          <div
            v-if="isLoading"
            class="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10"
          >
            <div class="text-center">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mb-2"></div>
              <p class="text-sm text-gray-600">Loading game...</p>
            </div>
          </div>

          <iframe
            ref="iframeRef"
            :src="`/${gameHref}`"
            class="w-full h-full border-0"
            frameborder="0"
            allowfullscreen
            @load="isLoading = false"
          />
        </div>
      </div>

      <!-- Save status indicator -->
      <div
        v-if="isAuthenticated"
        class="mt-4 text-center"
      >
        <p class="text-xs text-gray-500">
          Your game progress is being saved automatically
        </p>
      </div>
    </div>
  </div>
</template>
