<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'
import { cn } from '@/utils/cn'

const GAME_ID = 'arcade-whack'
const HOLES = 9
const GAME_DURATION = 30

const score = ref(0)
const highScore = ref(0)
const timeLeft = ref(GAME_DURATION)
const isOver = ref(false)
const isPaused = ref(false)

// Each mole: 0=hidden, 1=popping, 2=up, 3=whacked
const moles = ref<number[]>(Array(HOLES).fill(0))
const moleProgress = ref<number[]>(Array(HOLES).fill(0)) // 0-1 pop animation
const combo = ref(0)
const comboFlash = ref(false)

let gameTimer: ReturnType<typeof setInterval> | null = null
let moleTimers: ReturnType<typeof setTimeout>[] = []
let animRaf = 0
let spawnSpeed = 800

const MOLE_EMOJIS = ['🐭', '🐹', '🐭', '🦔', '🐭']

function getMoleEmoji(i: number) {
  return MOLE_EMOJIS[i % MOLE_EMOJIS.length]!
}

function tick() {
  for (let i = 0; i < HOLES; i++) {
    if (moles.value[i] === 1) {
      moleProgress.value[i] = Math.min(1, moleProgress.value[i]! + 0.12)
      if (moleProgress.value[i]! >= 1) moles.value[i] = 2
    } else if (moles.value[i] === 3) {
      moleProgress.value[i] = Math.max(0, moleProgress.value[i]! - 0.18)
      if (moleProgress.value[i]! <= 0) moles.value[i] = 0
    }
  }
  animRaf = requestAnimationFrame(tick)
}

function showMole() {
  if (isOver.value || isPaused.value) return
  const hidden = Array.from({ length: HOLES }, (_, i) => i).filter(i => moles.value[i] === 0)
  if (hidden.length === 0) return
  const idx = hidden[Math.floor(Math.random() * hidden.length)]!
  moles.value[idx] = 1
  moleProgress.value[idx] = 0
  const hideDelay = Math.max(400, spawnSpeed * 1.3)
  const t = setTimeout(() => {
    if (moles.value[idx] === 2) {
      moles.value[idx] = 3
    }
  }, hideDelay)
  moleTimers.push(t)
}

function startGame() {
  moles.value = Array(HOLES).fill(0)
  moleProgress.value = Array(HOLES).fill(0)
  score.value = 0; timeLeft.value = GAME_DURATION; isOver.value = false; isPaused.value = false
  combo.value = 0; spawnSpeed = 800
  moleTimers.forEach(clearTimeout); moleTimers = []

  const spawnLoop = () => {
    if (isOver.value || isPaused.value) return
    showMole()
    if (Math.random() > 0.6) setTimeout(showMole, spawnSpeed * 0.4)
    spawnSpeed = Math.max(320, spawnSpeed - 6)
    const t = setTimeout(spawnLoop, spawnSpeed)
    moleTimers.push(t)
  }
  const t = setTimeout(spawnLoop, 600)
  moleTimers.push(t)

  gameTimer = setInterval(() => {
    if (isPaused.value) return
    timeLeft.value--
    if (timeLeft.value <= 0) endGame()
  }, 1000)
}

function endGame() {
  clearInterval(gameTimer!); moleTimers.forEach(clearTimeout); moleTimers = []
  moles.value = Array(HOLES).fill(0)
  isOver.value = true
  if (score.value > highScore.value) { highScore.value = score.value; saveArcadeState(GAME_ID, { highScore: highScore.value }) }
}

function whack(i: number) {
  if (moles.value[i] !== 2 || isOver.value || isPaused.value) return
  moles.value[i] = 3
  combo.value++
  const pts = Math.min(50, 10 + combo.value * 2)
  score.value += pts
  comboFlash.value = true
  setTimeout(() => { comboFlash.value = false }, 300)
}

function reset() {
  clearInterval(gameTimer!); moleTimers.forEach(clearTimeout); moleTimers = []
  startGame()
}

const urgentTime = computed(() => timeLeft.value <= 10)

onMounted(async () => {
  const saved = await loadArcadeSave<{ highScore?: number }>(GAME_ID)
  highScore.value = saved.highScore ?? 0
  startGame()
  animRaf = requestAnimationFrame(tick)
})

onBeforeUnmount(async () => {
  clearInterval(gameTimer!); moleTimers.forEach(clearTimeout)
  cancelAnimationFrame(animRaf)
  await flushArcadeSave(GAME_ID, { highScore: highScore.value })
})
</script>

<template>
  <ArcadeShell
    :game-id="GAME_ID"
    game-name="Whack-a-Mole"
    emoji="🔨"
    color="#FFD3A5"
    controls="Click / Tap the moles · Esc = pause"
    :score="score"
    :high-score="highScore"
    :time-left="timeLeft"
    :is-over="isOver"
    :is-paused="isPaused"
    :show-timer="true"
    @reset="reset"
    @pause="isPaused = true"
    @resume="isPaused = false"
  >
    <div class="w-full h-full flex flex-col items-center justify-center gap-3 p-4"
      style="background: radial-gradient(ellipse at 50% 100%, #7c3c1a 0%, #3d1c08 70%, #1a0a00 100%)">
      <!-- Combo indicator -->
      <div :class="cn('text-sm font-bold transition-all duration-200 h-5', comboFlash ? 'text-yellow-300 scale-125' : 'text-white/50')">
        {{ combo > 1 ? `x${combo} COMBO!` : '' }}
      </div>

      <!-- 3×3 Mole Grid -->
      <div class="grid grid-cols-3 gap-4 w-full max-w-xs">
        <div
          v-for="(state, i) in moles"
          :key="i"
          class="relative"
          style="height: 88px"
        >
          <!-- Hole -->
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full"
            style="background: radial-gradient(ellipse, #1a0a00 60%, #3d1c08 100%); box-shadow: inset 0 4px 8px rgba(0,0,0,0.8)" />

          <!-- Mole -->
          <button
            @click="whack(i)"
            class="absolute left-1/2 -translate-x-1/2 w-14 flex flex-col items-center cursor-pointer"
            :style="{
              bottom: state === 0 ? '0px' : `${moleProgress[i]! * 52}px`,
              transition: 'bottom 0.05s linear',
              filter: state === 3 ? 'brightness(0.5) saturate(0)' : 'none',
            }"
            :disabled="state !== 2"
          >
            <!-- Body -->
            <div
              class="relative w-12 h-14 rounded-t-full flex items-end justify-center overflow-hidden"
              :style="{
                background: state === 3 ? '#555' : 'radial-gradient(ellipse at 30% 30%, #c68642 0%, #8b5e3c 60%, #5c3317 100%)',
                boxShadow: state === 2 ? '0 0 12px rgba(255, 200, 100, 0.6)' : 'none',
              }"
            >
              <!-- Face -->
              <div class="absolute top-2 w-full flex flex-col items-center">
                <div class="flex gap-2 mb-1">
                  <div class="w-2.5 h-2.5 rounded-full bg-gray-900" style="box-shadow: inset 0 0 2px rgba(255,255,255,0.4)" />
                  <div class="w-2.5 h-2.5 rounded-full bg-gray-900" style="box-shadow: inset 0 0 2px rgba(255,255,255,0.4)" />
                </div>
                <div class="text-pink-300 text-xs">{{ state === 3 ? '✕' : '♥' }}</div>
              </div>
            </div>
            <!-- Dirt cover -->
            <div class="w-14 h-3 rounded-full" style="background: linear-gradient(to bottom, #5c3317, #3d1c08)" />
          </button>
        </div>
      </div>
    </div>
  </ArcadeShell>
</template>
