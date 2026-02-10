<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  UserPlusIcon,
  ArrowRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/vue/24/outline'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import { useAuth } from '@/composables/useAuth'
import { loadAndInjectSaveData, setupPostMessageSync, forceSaveGame } from '@/utils/gameSaveSync'
import { api } from '@/api/client'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()

const gameId = computed(() => route.params.id as string)
const gameHref = computed(() => route.query.href as string || `Gams-main/g/${gameId.value}.html`)
const gameName = computed(() => {
  // Extract game name from route params or query
  const nameFromId = gameId.value.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
  return nameFromId
})

const iframeRef = ref<HTMLIFrameElement>()
const gameContainerRef = ref<HTMLElement>()
const isLoading = ref(true)
const isFullscreen = ref(false)
let cleanupSync: (() => void) | null = null

const goBack = async () => {
  // Force save before navigating away
  if (isAuthenticated.value && iframeRef.value) {
    try {
      await forceSaveGame(gameId.value, iframeRef.value)
    } catch (error) {
      console.warn('Failed to save before navigation:', error)
    }
  }
  router.push('/games')
}

const toggleFullscreen = async () => {
  if (!gameContainerRef.value) return

  try {
    if (!isFullscreen.value) {
      // Enter fullscreen
      if (gameContainerRef.value.requestFullscreen) {
        await gameContainerRef.value.requestFullscreen()
      } else if ((gameContainerRef.value as any).webkitRequestFullscreen) {
        // Safari
        await (gameContainerRef.value as any).webkitRequestFullscreen()
      } else if ((gameContainerRef.value as any).msRequestFullscreen) {
        // IE/Edge
        await (gameContainerRef.value as any).msRequestFullscreen()
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
    }
  } catch (error) {
    console.error('Error toggling fullscreen:', error)
  }
}

// Listen for fullscreen changes
const handleFullscreenChange = () => {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).msFullscreenElement
  )
}

onMounted(async () => {
  // Check initial fullscreen state
  handleFullscreenChange()

  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('msfullscreenchange', handleFullscreenChange)

  gsap.fromTo('.game-container',
    { opacity: 0, scale: 0.95 },
    { opacity: 1, scale: 1, duration: 0.4, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' }
  )

  // Record game visit if authenticated
  if (isAuthenticated.value) {
    try {
      await api.recordGameVisit(gameId.value, gameName.value, gameHref.value)
    } catch (error) {
      // Silently fail - don't block game loading
      console.warn('Failed to record game visit:', error)
    }
  }

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
  // Remove fullscreen listeners
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('msfullscreenchange', handleFullscreenChange)

  // Cleanup sync on unmount (this also removes the beforeunload handler)
  if (cleanupSync) {
    cleanupSync()
    cleanupSync = null
  }
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8" :class="{ 'py-0 px-0': isFullscreen }">
    <div class="max-w-7xl mx-auto" :class="{ 'max-w-none mx-0': isFullscreen }">
      <!-- Header Actions -->
      <div v-if="!isFullscreen" class="mb-6 flex items-center gap-4 flex-wrap">
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
      <div class="game-container" :class="{ 'fixed inset-0 z-50': isFullscreen }">
        <div
          ref="gameContainerRef"
          :class="cn(
            'w-full rounded-xl overflow-hidden relative',
            'bg-white/40 backdrop-blur-md border border-gray-200/50',
            'shadow-lg',
            'transition-all duration-300',
            isFullscreen && 'rounded-none border-0 shadow-none',
          )"
          :style="isFullscreen ? 'height: 100vh; width: 100vw;' : 'height: calc(100vh - 200px); min-height: 600px;'"
        >
          <!-- Fullscreen button -->
          <button
            @click="toggleFullscreen"
            :class="cn(
              'absolute top-4 right-4 z-20',
              'flex items-center justify-center w-10 h-10 rounded-lg',
              'bg-white/60 backdrop-blur-md border border-gray-200/50',
              'hover:bg-white/80 transition-all duration-300',
              'hover:scale-105 active:scale-95',
              'text-gray-700 hover:text-gray-800',
              'shadow-md',
            )"
            :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
          >
            <ArrowsPointingInIcon
              v-if="isFullscreen"
              class="w-5 h-5"
            />
            <ArrowsPointingOutIcon
              v-else
              class="w-5 h-5"
            />
          </button>

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
            :src="`/games/${gameHref}`"
            class="w-full h-full border-0"
            frameborder="0"
            allowfullscreen
            @load="isLoading = false"
          />
        </div>
      </div>

      <!-- Save status indicator -->
      <div
        v-if="isAuthenticated && !isFullscreen"
        class="mt-4 text-center"
      >
        <p class="text-xs text-gray-500">
          Your game progress is being saved automatically
        </p>
      </div>
    </div>
  </div>
</template>
