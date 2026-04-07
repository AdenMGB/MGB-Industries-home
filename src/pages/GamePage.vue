<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  UserPlusIcon,
  ArrowRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  StarIcon,
} from '@heroicons/vue/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/vue/24/solid'
import { cn } from '@/utils/cn'
import { gsap } from 'gsap'
import { useAuth } from '@/composables/useAuth'
import { fetchSaveData, injectSaveDataIntoIframe, setupPostMessageSync, forceSaveGame } from '@/utils/gameSaveSync'
import { recordArcadeVisit } from '@/utils/arcadeSaveSync'
import { api } from '@/api/client'
import { useToast } from '@/composables/useToast'
import { setMeta } from '@/composables/useMeta'
import { SITE_URL } from '@/config/seo'
import { ARCADE_GAME_IDS, getArcadeGame } from '@/config/arcadeGames'

// Lazy-import map for in-house games
const GAME_COMPONENTS: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'arcade-snake': defineAsyncComponent(() => import('@/components/arcade/games/SnakeGame.vue')),
  'arcade-breakout': defineAsyncComponent(() => import('@/components/arcade/games/BreakoutGame.vue')),
  'arcade-memory': defineAsyncComponent(() => import('@/components/arcade/games/MemoryGame.vue')),
  'arcade-pong': defineAsyncComponent(() => import('@/components/arcade/games/PongGame.vue')),
  'arcade-whack': defineAsyncComponent(() => import('@/components/arcade/games/WhackGame.vue')),
  'arcade-simon': defineAsyncComponent(() => import('@/components/arcade/games/SimonGame.vue')),
  'arcade-stacker': defineAsyncComponent(() => import('@/components/arcade/games/StackerGame.vue')),
  'arcade-flappy': defineAsyncComponent(() => import('@/components/arcade/games/FlappyGame.vue')),
  'arcade-reaction': defineAsyncComponent(() => import('@/components/arcade/games/ReactionGame.vue')),
  'arcade-match3': defineAsyncComponent(() => import('@/components/arcade/games/Match3Game.vue')),
}

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()
const { success, error: showError } = useToast()

const gameId = computed(() => route.params.id as string)
const gameHref = computed(() => route.query.href as string || `Gams-main/g/${gameId.value}.html`)

const isInHouse = computed(() =>
  ARCADE_GAME_IDS.has(gameId.value) || gameHref.value.startsWith('in-house:'),
)

const arcadeMeta = computed(() => getArcadeGame(gameId.value))

const gameName = computed(() => {
  if (arcadeMeta.value) return arcadeMeta.value.name
  return gameId.value
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
})

const inHouseComponent = computed(() =>
  isInHouse.value ? (GAME_COMPONENTS[gameId.value] ?? null) : null,
)

watch(
  () => ({ name: gameName.value, id: gameId.value }),
  ({ name }) => {
    setMeta({
      title: name ? `${name} - Games` : 'Games',
      description: `Play ${name || 'this game'} in your browser.`,
      canonical: `${SITE_URL}/games/${gameId.value}`,
    })
  },
  { immediate: true },
)

const iframeRef = ref<HTMLIFrameElement>()
const gameContainerRef = ref<HTMLElement>()
const isLoading = ref(true)
const isFullscreen = ref(false)
const isFavorite = ref(false)
const isTogglingFavorite = ref(false)
let cleanupSync: (() => void) | null = null

// iframe-specific (legacy external games)
const gameIframeSrc = ref<string | null>(null)
const iframeSrcdoc = ref<string | undefined>(undefined)
const BLANK_SRCDOC = '<html><body></body></html>'

const effectiveGameSrc = computed(() => {
  if (!isAuthenticated.value) return `/games/${gameHref.value}`
  return gameIframeSrc.value ?? ''
})

const toggleFavorite = async () => {
  if (!isAuthenticated.value || isTogglingFavorite.value) return
  isTogglingFavorite.value = true
  try {
    if (isFavorite.value) {
      await api.removeGameFavorite(gameId.value)
      isFavorite.value = false
      success('Removed from favorites')
    } else {
      await api.addGameFavorite(gameId.value, gameName.value, gameHref.value)
      isFavorite.value = true
      success('Added to favorites')
    }
  } catch {
    showError('Failed to update favorites')
  } finally {
    isTogglingFavorite.value = false
  }
}

const goBack = async () => {
  if (!isInHouse.value && isAuthenticated.value && iframeRef.value) {
    try {
      await forceSaveGame(gameId.value, iframeRef.value)
    } catch {
      // silently ignore
    }
  }
  router.push('/games')
}

const toggleFullscreen = async () => {
  if (!gameContainerRef.value) return
  type FullscreenEl = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>
    msRequestFullscreen?: () => Promise<void>
  }
  type FullscreenDoc = Document & {
    webkitExitFullscreen?: () => Promise<void>
    msExitFullscreen?: () => Promise<void>
  }
  try {
    if (!isFullscreen.value) {
      const el = gameContainerRef.value as FullscreenEl
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      else if (el.msRequestFullscreen) await el.msRequestFullscreen()
    } else {
      const doc = document as FullscreenDoc
      if (doc.exitFullscreen) await doc.exitFullscreen()
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
      else if (doc.msExitFullscreen) await doc.msExitFullscreen()
    }
  } catch {
    // ignore
  }
}

watch(isAuthenticated, async (val) => {
  if (val) {
    try {
      const favRes = await api.getGameFavorites()
      const favIds = new Set((favRes.data?.favorites || []).map((f) => f.game_id))
      isFavorite.value = favIds.has(gameId.value)
    } catch {
      // ignore
    }
  }
})

const handleFullscreenChange = () => {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
    (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement
  )
}

onMounted(async () => {
  handleFullscreenChange()
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('msfullscreenchange', handleFullscreenChange)

  gsap.fromTo(
    '.game-container',
    { opacity: 0, scale: 0.95 },
    { opacity: 1, scale: 1, duration: 0.4, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  )

  // Check favorites for any game
  if (isAuthenticated.value) {
    try {
      const favRes = await api.getGameFavorites()
      const favIds = new Set((favRes.data?.favorites || []).map((f) => f.game_id))
      isFavorite.value = favIds.has(gameId.value)
    } catch {
      // ignore
    }
  }

  if (isInHouse.value) {
    // Record visit + mark loading done immediately (no iframe to wait for)
    isLoading.value = false
    if (isAuthenticated.value) {
      await recordArcadeVisit(gameId.value, gameName.value, gameHref.value)
    }
    return
  }

  // Legacy iframe path
  if (isAuthenticated.value) {
    try {
      await api.recordGameVisit(gameId.value, gameName.value, gameHref.value)
    } catch {
      // ignore
    }
  }

  if (isAuthenticated.value && iframeRef.value) {
    let hasInjectedSave = false

    const handleIframeLoad = () => {
      if (!iframeRef.value) return
      if (!hasInjectedSave) {
        injectSaveDataIntoIframe(iframeRef.value, savedData)
        hasInjectedSave = true
        gameIframeSrc.value = `/games/${gameHref.value}`
        iframeSrcdoc.value = undefined
      } else {
        cleanupSync = setupPostMessageSync(gameId.value, iframeRef.value)
        isLoading.value = false
      }
    }

    iframeRef.value.addEventListener('load', handleIframeLoad)
    const savedData = await fetchSaveData(gameId.value)
    iframeSrcdoc.value = BLANK_SRCDOC
  } else {
    iframeRef.value?.addEventListener('load', () => {
      isLoading.value = false
    }, { once: true })
    if (iframeRef.value?.contentDocument?.readyState === 'complete') {
      isLoading.value = false
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('msfullscreenchange', handleFullscreenChange)
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
        <button
          @click="goBack"
          :class="cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-normal',
            'bg-white/40 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50',
            'hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all duration-200',
            'hover:scale-105 active:scale-95',
            'text-gray-700 dark:text-gray-200',
          )"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Games
        </button>

        <!-- Game name badge (in-house only) -->
        <div
          v-if="arcadeMeta"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white/40 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50"
        >
          <span>{{ arcadeMeta.emoji }}</span>
          <span class="font-medium text-gray-800 dark:text-white">{{ arcadeMeta.name }}</span>
          <span
            v-for="tag in arcadeMeta.tags"
            :key="tag"
            class="px-1.5 py-0.5 text-xs rounded-md bg-mint/20 dark:bg-mint/10 text-gray-600 dark:text-gray-400"
          >
            {{ tag }}
          </span>
        </div>

        <!-- Cloud sync banner (legacy iframe) -->
        <div
          v-if="isAuthenticated && !isInHouse"
          :class="cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
            'bg-green-50/80 dark:bg-green-900/30 backdrop-blur-md border border-green-200/50 dark:border-green-700/50',
            'text-green-700 dark:text-green-300',
          )"
        >
          <CloudArrowUpIcon class="w-4 h-4 animate-pulse" />
          <span class="font-medium">Syncing with cloud</span>
        </div>

        <!-- Sign in prompt (legacy iframe, unauthenticated) -->
        <div
          v-else-if="!isAuthenticated && !isInHouse"
          :class="cn(
            'flex items-center gap-3 px-4 py-2 rounded-lg text-sm',
            'bg-peach/20 backdrop-blur-md border border-peach/30',
            'text-gray-700 dark:text-gray-200',
          )"
        >
          <UserPlusIcon class="w-4 h-4" />
          <span>Save your progress?</span>
          <router-link
            to="/signup"
            :class="cn(
              'flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium',
              'bg-peach/30 hover:bg-peach/40 text-gray-800',
              'transition-all duration-200 hover:scale-105 active:scale-95',
            )"
          >
            Sign Up <ArrowRightIcon class="w-3 h-3" />
          </router-link>
          <span class="text-gray-500">or</span>
          <router-link
            :to="{ path: '/login', query: { redirect: route.fullPath } }"
            class="px-3 py-1 rounded-md text-xs font-medium text-gray-700 hover:text-gray-800 underline"
          >
            Sign In
          </router-link>
        </div>
      </div>

      <!-- Game container -->
      <div class="game-container" :class="{ 'fixed inset-0 z-50': isFullscreen }">
        <div
          ref="gameContainerRef"
          :class="cn(
            'w-full rounded-xl overflow-hidden relative',
            'bg-white/40 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50',
            'shadow-lg transition-all duration-300',
            isFullscreen && 'rounded-none border-0 shadow-none',
          )"
          :style="isFullscreen ? 'height: 100vh; width: 100vw;' : 'height: calc(100vh - 200px); min-height: 600px;'"
        >
          <!-- In-house Vue game — ArcadeShell owns the HUD including fullscreen + favorite -->
          <div v-if="isInHouse" class="absolute inset-0 p-3 overflow-auto">
            <component
              :is="inHouseComponent"
              v-if="inHouseComponent"
              class="h-full"
              :is-fullscreen="isFullscreen"
              :is-favorite="isFavorite"
              :show-favorite="isAuthenticated && !isFullscreen"
              :show-fullscreen="true"
              @toggle-favorite="toggleFavorite"
              @toggle-fullscreen="toggleFullscreen"
            />
            <div v-else class="flex items-center justify-center h-full">
              <p class="text-gray-600 dark:text-gray-400">Game not found.</p>
            </div>
          </div>

          <!-- Iframe for legacy external games -->
          <template v-else>
            <!-- Top-right action row: favorite + fullscreen side by side, no overlap -->
            <div class="absolute top-3 right-3 z-20 flex items-center gap-2">
              <button
                v-if="isAuthenticated && !isFullscreen"
                @click="toggleFavorite"
                :disabled="isTogglingFavorite"
                :aria-label="isFavorite ? 'Remove from favorites' : 'Add to favorites'"
                :class="cn(
                  'flex items-center justify-center w-9 h-9 rounded-lg',
                  'bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50',
                  'hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200',
                  'hover:scale-105 active:scale-95 text-gray-700 dark:text-gray-300 shadow-md',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )"
              >
                <StarIconSolid v-if="isFavorite" class="w-4 h-4 text-amber-500" />
                <StarIcon v-else class="w-4 h-4" />
              </button>

              <button
                @click="toggleFullscreen"
                :class="cn(
                  'flex items-center justify-center w-9 h-9 rounded-lg',
                  'bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50',
                  'hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all duration-200',
                  'hover:scale-105 active:scale-95 text-gray-700 dark:text-gray-300 shadow-md',
                )"
                :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
              >
                <ArrowsPointingInIcon v-if="isFullscreen" class="w-4 h-4" />
                <ArrowsPointingOutIcon v-else class="w-4 h-4" />
              </button>
            </div>

            <!-- Loading -->
            <div
              v-if="isLoading"
              class="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm z-10"
            >
              <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 dark:border-gray-200 mb-2" />
                <p class="text-sm text-gray-600 dark:text-gray-400">Loading game…</p>
              </div>
            </div>

            <iframe
              ref="iframeRef"
              :src="effectiveGameSrc"
              :srcdoc="iframeSrcdoc"
              class="w-full h-full border-0"
              frameborder="0"
              allowfullscreen
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
