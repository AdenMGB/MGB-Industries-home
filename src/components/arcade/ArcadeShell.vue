<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { cn } from '@/utils/cn'
import {
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  InformationCircleIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  StarIcon,
} from '@heroicons/vue/24/outline'
import { TrophyIcon, HeartIcon, StarIcon as StarIconSolid } from '@heroicons/vue/24/solid'
import { gsap } from 'gsap'

interface Props {
  gameId: string
  gameName: string
  emoji: string
  color: string
  controls: string
  score?: number
  highScore?: number
  lives?: number | null
  maxLives?: number
  timeLeft?: number | null
  isOver?: boolean
  isWon?: boolean
  isPaused?: boolean
  canPause?: boolean
  showScore?: boolean
  showLives?: boolean
  showTimer?: boolean
  showHighScore?: boolean
  // Fullscreen + favorite (passed in from GamePage)
  isFullscreen?: boolean
  isFavorite?: boolean
  showFavorite?: boolean
  showFullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  score: 0,
  highScore: 0,
  lives: null,
  maxLives: 3,
  timeLeft: null,
  isOver: false,
  isWon: false,
  isPaused: false,
  canPause: true,
  showScore: true,
  showLives: false,
  showTimer: false,
  showHighScore: true,
  isFullscreen: false,
  isFavorite: false,
  showFavorite: false,
  showFullscreen: true,
})

const emit = defineEmits<{
  reset: []
  pause: []
  resume: []
  toggleFavorite: []
  toggleFullscreen: []
}>()

const showInfo = ref(false)
const prevScore = ref(props.score)
const scoreFlash = ref(false)

watch(
  () => props.score,
  (newVal, oldVal) => {
    if (newVal > (oldVal ?? 0)) {
      scoreFlash.value = true
      setTimeout(() => (scoreFlash.value = false), 400)
    }
    prevScore.value = newVal
  },
)

const formattedTime = computed(() => {
  if (props.timeLeft === null) return ''
  const s = Math.max(0, Math.ceil(props.timeLeft))
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m > 0) return `${m}:${String(sec).padStart(2, '0')}`
  return `${sec}s`
})

const timerUrgent = computed(() => props.timeLeft !== null && props.timeLeft <= 10)

const heartFill = (index: number) =>
  props.lives !== null && index < (props.lives as number)

const handleReset = () => emit('reset')
const handlePauseResume = () => {
  if (props.isPaused) emit('resume')
  else emit('pause')
}

function onShellKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.canPause && !props.isOver) {
    e.preventDefault()
    handlePauseResume()
  }
}

onMounted(() => {
  gsap.fromTo(
    '.arcade-shell',
    { opacity: 0, scale: 0.97 },
    { opacity: 1, scale: 1, duration: 0.4, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  )
  window.addEventListener('keydown', onShellKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onShellKey)
})
</script>

<template>
  <div class="arcade-shell flex flex-col h-full min-h-[520px] select-none">
    <!-- HUD bar -->
    <div
      :class="cn(
        'flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-3',
        'bg-white/40 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50',
      )"
    >
      <!-- Left: emoji + name -->
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-2xl" :aria-hidden="true">{{ emoji }}</span>
        <span class="text-sm font-medium text-gray-800 dark:text-white truncate hidden sm:inline">{{ gameName }}</span>
      </div>

      <!-- Centre: score / timer / lives -->
      <div class="flex items-center gap-4">
        <!-- Score -->
        <div v-if="showScore" class="flex flex-col items-center">
          <span
            :class="cn(
              'text-2xl font-semibold tabular-nums transition-all duration-150',
              scoreFlash ? 'text-coral scale-125' : 'text-gray-800 dark:text-white',
            )"
          >
            {{ score.toLocaleString() }}
          </span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Score</span>
        </div>

        <!-- High score -->
        <div v-if="showHighScore && highScore > 0" class="flex flex-col items-center">
          <div class="flex items-center gap-1">
            <TrophyIcon class="w-3.5 h-3.5 text-amber-400" />
            <span class="text-base font-medium tabular-nums text-amber-500">{{ highScore.toLocaleString() }}</span>
          </div>
          <span class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Best</span>
        </div>

        <!-- Timer -->
        <div v-if="showTimer && timeLeft !== null" class="flex flex-col items-center">
          <span
            :class="cn(
              'text-2xl font-semibold tabular-nums transition-colors duration-300',
              timerUrgent ? 'text-coral animate-pulse' : 'text-gray-800 dark:text-white',
            )"
          >
            {{ formattedTime }}
          </span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</span>
        </div>

        <!-- Lives -->
        <div v-if="showLives && lives !== null" class="flex items-center gap-0.5">
          <HeartIcon
            v-for="i in maxLives"
            :key="i"
            :class="cn(
              'w-5 h-5 transition-all duration-200',
              heartFill(i - 1) ? 'text-coral scale-110' : 'text-gray-300 dark:text-gray-600',
            )"
          />
        </div>
      </div>

      <!-- Right: actions -->
      <div class="flex items-center gap-1.5">
        <!-- Pause/resume -->
        <button
          v-if="canPause && !isOver"
          @click="handlePauseResume"
          :class="cn(
            'p-2 rounded-lg transition-all duration-200',
            'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
            'hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-peach/50',
            'text-gray-600 dark:text-gray-300',
          )"
          :title="isPaused ? 'Resume' : 'Pause'"
        >
          <PauseIcon v-if="!isPaused" class="w-4 h-4" />
          <PlayIcon v-else class="w-4 h-4" />
        </button>

        <!-- Reset -->
        <button
          @click="handleReset"
          :class="cn(
            'p-2 rounded-lg transition-all duration-200',
            'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
            'hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-peach/50',
            'text-gray-600 dark:text-gray-300',
          )"
          title="Restart"
        >
          <ArrowPathIcon class="w-4 h-4" />
        </button>

        <!-- Info / controls -->
        <button
          @click="showInfo = !showInfo"
          :class="cn(
            'p-2 rounded-lg transition-all duration-200',
            'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
            'hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-peach/50',
            'text-gray-600 dark:text-gray-300',
          )"
          title="Controls"
        >
          <InformationCircleIcon class="w-4 h-4" />
        </button>

        <!-- Separator -->
        <div v-if="showFavorite || showFullscreen" class="w-px h-5 bg-gray-200/60 dark:bg-gray-600/60 mx-0.5" />

        <!-- Favorite -->
        <button
          v-if="showFavorite"
          @click="emit('toggleFavorite')"
          :class="cn(
            'p-2 rounded-lg transition-all duration-200',
            'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
            'hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-peach/50',
            'text-gray-600 dark:text-gray-300',
          )"
          :title="isFavorite ? 'Remove from favorites' : 'Add to favorites'"
        >
          <StarIconSolid v-if="isFavorite" class="w-4 h-4 text-amber-500" />
          <StarIcon v-else class="w-4 h-4" />
        </button>

        <!-- Fullscreen -->
        <button
          v-if="showFullscreen"
          @click="emit('toggleFullscreen')"
          :class="cn(
            'p-2 rounded-lg transition-all duration-200',
            'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
            'hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-peach/50',
            'text-gray-600 dark:text-gray-300',
          )"
          :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
        >
          <ArrowsPointingInIcon v-if="isFullscreen" class="w-4 h-4" />
          <ArrowsPointingOutIcon v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Controls tooltip -->
    <transition name="fade-down">
      <div
        v-if="showInfo"
        :class="cn(
          'relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl mb-3',
          'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 text-sm',
        )"
      >
        <span class="text-gray-600 dark:text-gray-300">
          <span class="font-medium text-gray-800 dark:text-white">Controls: </span>{{ controls }}
        </span>
        <button @click="showInfo = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </transition>

    <!-- Game canvas area -->
    <div class="flex-1 relative rounded-xl overflow-hidden">
      <!-- Paused overlay -->
      <transition name="fade">
        <div
          v-if="isPaused && !isOver"
          class="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl"
        >
          <div
            :class="cn(
              'text-center p-8 rounded-2xl',
              'bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50',
              'shadow-xl',
            )"
          >
            <p class="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Paused</p>
            <button
              @click="handlePauseResume"
              :class="cn(
                'mt-2 px-6 py-2 rounded-lg text-sm font-medium',
                'bg-peach/30 dark:bg-peach/30 text-gray-800 dark:text-white',
                'hover:bg-peach/50 dark:hover:bg-peach/50 transition-all duration-200',
                'hover:scale-105 active:scale-95',
              )"
            >
              Resume
            </button>
          </div>
        </div>
      </transition>

      <!-- Game over overlay -->
      <transition name="scale-in">
        <div
          v-if="isOver"
          class="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl"
        >
          <div
            :class="cn(
              'text-center p-8 rounded-2xl max-w-xs w-full mx-4',
              'bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50',
              'shadow-xl',
            )"
          >
            <div class="text-5xl mb-3">{{ isWon ? '🎉' : '💀' }}</div>
            <p class="text-2xl font-semibold text-gray-800 dark:text-white mb-1">
              {{ isWon ? 'You Win!' : 'Game Over' }}
            </p>
            <p v-if="showScore" class="text-4xl font-semibold text-coral mb-1 tabular-nums">
              {{ score.toLocaleString() }}
            </p>
            <p v-if="showScore" class="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {{ score >= highScore && highScore > 0 ? '🏆 New high score!' : `Best: ${highScore.toLocaleString()}` }}
            </p>
            <button
              @click="handleReset"
              :class="cn(
                'w-full px-6 py-3 rounded-xl text-sm font-medium',
                'bg-peach/30 dark:bg-peach/30 text-gray-800 dark:text-white',
                'hover:bg-peach/50 dark:hover:bg-peach/50 transition-all duration-200',
                'hover:scale-105 active:scale-95',
              )"
            >
              Play Again
            </button>
          </div>
        </div>
      </transition>

      <!-- Slot for actual game -->
      <slot />
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.scale-in-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.scale-in-enter-from {
  opacity: 0;
  transform: scale(0.85);
}
.scale-in-leave-active {
  transition: all 0.15s ease-in;
}
.scale-in-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
