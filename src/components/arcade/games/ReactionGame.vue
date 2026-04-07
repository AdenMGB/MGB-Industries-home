<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'

const GAME_ID = 'arcade-reaction'
const ROUNDS = 5

type Phase = 'idle' | 'ready' | 'go' | 'result' | 'toosoon' | 'done'

const bestMs = ref(0)
const phase = ref<Phase>('idle')
const lastMs = ref(0)
const round = ref(0)
const times = ref<number[]>([])
const isPaused = ref(false)
const isOver = ref(false)
let waitTimer: ReturnType<typeof setTimeout> | null = null
let goTs = 0

// Animated circle pulse on 'go'
const ripple = ref(false)

const avgMs = computed(() =>
  times.value.length ? Math.round(times.value.reduce((a, b) => a + b, 0) / times.value.length) : 0,
)

const grade = computed(() => {
  const t = avgMs.value
  if (!t) return ''
  if (t < 180) return { text: '⚡ Superhuman', cls: 'text-yellow-300' }
  if (t < 230) return { text: '🏆 Excellent', cls: 'text-green-400' }
  if (t < 300) return { text: '✅ Great', cls: 'text-emerald-400' }
  if (t < 400) return { text: '😊 Good', cls: 'text-blue-400' }
  if (t < 550) return { text: '🙂 Average', cls: 'text-gray-300' }
  return { text: '😴 Slow', cls: 'text-red-400' }
})

function startWaiting() {
  phase.value = 'ready'
  const delay = 1200 + Math.random() * 3500
  waitTimer = setTimeout(() => {
    goTs = Date.now(); phase.value = 'go'; ripple.value = false
    requestAnimationFrame(() => { ripple.value = true })
  }, delay)
}

function onClick() {
  if (isPaused.value) return
  if (phase.value === 'idle') { startWaiting(); return }
  if (phase.value === 'ready') { clearTimeout(waitTimer!); phase.value = 'toosoon'; return }
  if (phase.value === 'go') {
    const ms = Date.now() - goTs
    lastMs.value = ms; times.value.push(ms); round.value++
    if (bestMs.value === 0 || ms < bestMs.value) { bestMs.value = ms; saveArcadeState(GAME_ID, { bestMs: bestMs.value }) }
    if (round.value >= ROUNDS) { phase.value = 'done'; isOver.value = true }
    else phase.value = 'result'
    return
  }
  if (phase.value === 'result' || phase.value === 'toosoon') startWaiting()
}

function reset() {
  clearTimeout(waitTimer!); phase.value = 'idle'; lastMs.value = 0; round.value = 0
  times.value = []; isOver.value = false; isPaused.value = false; ripple.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { if (!isOver.value) isPaused.value = !isPaused.value; return }
  if (isPaused.value) return
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') { e.preventDefault(); onClick() }
}

// Colours for each phase
const bg = computed(() => {
  if (phase.value === 'go') return 'radial-gradient(circle at 50% 50%, #065f46 0%, #047857 40%, #064e3b 100%)'
  if (phase.value === 'toosoon') return 'radial-gradient(circle at 50% 50%, #7f1d1d 0%, #b91c1c 40%, #450a0a 100%)'
  if (phase.value === 'ready') return 'radial-gradient(circle at 50% 50%, #1e3a5f 0%, #1d4ed8 40%, #0f172a 100%)'
  return 'radial-gradient(circle at 50% 50%, #0f172a 0%, #1e1b4b 100%)'
})

onMounted(async () => {
  const saved = await loadArcadeSave<{ bestMs?: number }>(GAME_ID)
  bestMs.value = saved.bestMs ?? 0
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(async () => {
  clearTimeout(waitTimer!); window.removeEventListener('keydown', onKey)
  await flushArcadeSave(GAME_ID, { bestMs: bestMs.value })
})
</script>

<template>
  <ArcadeShell
    :game-id="GAME_ID"
    game-name="Reaction Time"
    emoji="⚡"
    color="#98D8C8"
    controls="Space / Click / Tap · Esc = pause"
    :score="0"
    :high-score="0"
    :is-over="isOver"
    :is-paused="isPaused"
    :show-score="false"
    :show-high-score="false"
    :can-pause="false"
    @reset="reset"
    @pause="() => {}"
    @resume="() => {}"
  >
    <div
      class="w-full h-full flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-300 select-none rounded-xl relative overflow-hidden"
      :style="{ background: bg }"
      @click="onClick"
      @touchstart.prevent="onClick"
    >
      <!-- Ripple on GO -->
      <div
        v-if="ripple && phase === 'go'"
        class="absolute inset-0 rounded-xl pointer-events-none"
        style="animation: rippleOut 0.5s ease-out forwards"
      />

      <!-- Round pips -->
      <div class="flex gap-2 absolute top-4">
        <div
          v-for="i in ROUNDS"
          :key="i"
          class="w-2.5 h-2.5 rounded-full transition-colors duration-300"
          :style="{ backgroundColor: i <= round ? '#4ade80' : 'rgba(255,255,255,0.2)' }"
        />
      </div>

      <!-- Content -->
      <div class="text-center pointer-events-none px-6">
        <div v-if="phase === 'idle'">
          <div class="text-6xl mb-4 animate-bounce">⚡</div>
          <p class="text-2xl font-bold text-white mb-2">Reaction Time</p>
          <p class="text-white/60 text-sm">Click or tap to start</p>
          <p v-if="bestMs > 0" class="mt-4 text-amber-400 font-semibold">Best: {{ bestMs }}ms</p>
        </div>

        <div v-else-if="phase === 'ready'">
          <div class="text-5xl mb-4 animate-pulse">👁️</div>
          <p class="text-2xl font-bold text-blue-300 mb-1">Get ready…</p>
          <p class="text-white/50 text-sm">Wait for GREEN</p>
        </div>

        <div v-else-if="phase === 'go'">
          <div class="text-7xl mb-2" style="animation: popIn 0.15s ease-out">🟢</div>
          <p class="text-4xl font-black text-green-300 tracking-wider">GO!</p>
          <p class="text-green-400/70 text-sm mt-1">Click NOW!</p>
        </div>

        <div v-else-if="phase === 'toosoon'">
          <div class="text-5xl mb-3">😬</div>
          <p class="text-2xl font-bold text-red-300 mb-1">Too soon!</p>
          <p class="text-red-400/60 text-sm">Click to try again</p>
        </div>

        <div v-else-if="phase === 'result'">
          <p class="text-5xl font-black tabular-nums mb-1"
            :style="{ color: lastMs < 250 ? '#4ade80' : lastMs < 400 ? '#facc15' : '#f87171' }">
            {{ lastMs }}<span class="text-2xl">ms</span>
          </p>
          <p class="text-white/50 text-sm">Round {{ round }}/{{ ROUNDS }} — click for next</p>
        </div>

        <div v-else-if="phase === 'done'">
          <p class="text-3xl font-bold text-white mb-1">Done!</p>
          <p class="text-5xl font-black tabular-nums mb-1"
            :style="{ color: avgMs < 250 ? '#4ade80' : avgMs < 400 ? '#facc15' : '#f87171' }">
            {{ avgMs }}<span class="text-xl">ms avg</span>
          </p>
          <p v-if="grade" :class="['text-lg font-semibold mt-1', grade.cls]">{{ grade.text }}</p>
          <p v-if="bestMs > 0" class="text-sm text-amber-400 mt-3">🏆 Best ever: {{ bestMs }}ms</p>
        </div>
      </div>
    </div>
  </ArcadeShell>
</template>

<style scoped>
@keyframes rippleOut {
  0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5); }
  100% { box-shadow: 0 0 0 60px rgba(74, 222, 128, 0); }
}
@keyframes popIn {
  0% { transform: scale(0.5); }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
</style>
