<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'
import { cn } from '@/utils/cn'

const GAME_ID = 'arcade-simon'

const PADS = [
  { id: 0, label: 'Red',    off: '#c0392b', on: '#ff6b6b', shadow: '#ff0000' },
  { id: 1, label: 'Blue',   off: '#1a5276', on: '#5dade2', shadow: '#00aaff' },
  { id: 2, label: 'Green',  off: '#1e8449', on: '#58d68d', shadow: '#00ff88' },
  { id: 3, label: 'Yellow', off: '#b7950b', on: '#f9e64f', shadow: '#ffdd00' },
]

const score = ref(0)
const highScore = ref(0)
const isOver = ref(false)
const isPaused = ref(false)
const sequence = ref<number[]>([])
const playerIndex = ref(0)
const litPad = ref<number | null>(null)
const isShowing = ref(false)
const phase = ref<'idle'|'watch'|'play'|'dead'>('idle')

let showTimeout: ReturnType<typeof setTimeout> | null = null

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

async function playSequence() {
  isShowing.value = true; phase.value = 'watch'
  const speed = Math.max(220, 600 - sequence.value.length * 20)
  for (const id of sequence.value) {
    litPad.value = id
    await delay(speed)
    litPad.value = null
    await delay(speed * 0.35)
  }
  isShowing.value = false; phase.value = 'play'; playerIndex.value = 0
}

async function startRound() {
  sequence.value.push(Math.floor(Math.random() * 4))
  await delay(400)
  await playSequence()
}

async function reset() {
  clearTimeout(showTimeout!); sequence.value = []; playerIndex.value = 0; score.value = 0
  isOver.value = false; isPaused.value = false; isShowing.value = false; litPad.value = null; phase.value = 'idle'
  await delay(200); await startRound()
}

async function press(id: number) {
  if (isShowing.value || isOver.value || isPaused.value || phase.value !== 'play') return
  litPad.value = id
  setTimeout(() => { litPad.value = null }, 200)

  if (id === sequence.value[playerIndex.value]) {
    playerIndex.value++
    if (playerIndex.value === sequence.value.length) {
      score.value = sequence.value.length
      if (score.value > highScore.value) { highScore.value = score.value; saveArcadeState(GAME_ID, { highScore: highScore.value }) }
      await delay(600)
      await startRound()
    }
  } else {
    phase.value = 'dead'; isOver.value = true
    if (score.value > highScore.value) { highScore.value = score.value; saveArcadeState(GAME_ID, { highScore: highScore.value }) }
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { if (!isOver.value) isPaused.value = !isPaused.value; return }
  if (isPaused.value) return
  const map: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, 'r': 0, 'b': 1, 'g': 2, 'y': 3 }
  const id = map[e.key]
  if (id !== undefined) press(id)
}

onMounted(async () => {
  const saved = await loadArcadeSave<{ highScore?: number }>(GAME_ID)
  highScore.value = saved.highScore ?? 0
  window.addEventListener('keydown', onKey)
  await reset()
})

onBeforeUnmount(async () => {
  window.removeEventListener('keydown', onKey)
  await flushArcadeSave(GAME_ID, { highScore: highScore.value })
})
</script>

<template>
  <ArcadeShell
    :game-id="GAME_ID"
    game-name="Simon Says"
    emoji="🎨"
    color="#FFB6C1"
    controls="Click pads or 1/2/3/4 keys · Esc = pause"
    :score="score"
    :high-score="highScore"
    :is-over="isOver"
    :is-paused="isPaused"
    @reset="reset"
    @pause="isPaused = true"
    @resume="isPaused = false"
  >
    <div class="w-full h-full flex flex-col items-center justify-center gap-6 p-4"
      style="background: radial-gradient(ellipse at 50% 50%, #1a1a2e 0%, #0d0d1a 100%)">
      <!-- Status -->
      <div class="text-sm font-semibold tracking-wider uppercase"
        :class="isShowing ? 'text-yellow-300 animate-pulse' : 'text-white/60'">
        {{ phase === 'watch' ? `Watch (${sequence.length})…` : phase === 'play' ? 'Your turn!' : phase === 'idle' ? 'Get ready…' : '' }}
      </div>

      <!-- Simon circle -->
      <div class="relative" style="width: 260px; height: 260px">
        <!-- Centre circle -->
        <div class="absolute inset-0 m-auto w-16 h-16 rounded-full z-10 flex items-center justify-center"
          style="background: #1a1a2e; border: 3px solid rgba(255,255,255,0.15); box-shadow: 0 0 20px rgba(0,0,0,0.8)">
          <span class="text-white/50 text-xs font-bold">{{ sequence.length }}</span>
        </div>

        <!-- 4 pads in quadrants -->
        <button
          v-for="(pad, qi) in PADS"
          :key="pad.id"
          @click="press(pad.id)"
          :disabled="isShowing || isOver"
          class="absolute w-[48%] h-[48%] transition-all duration-100 focus:outline-none"
          :style="{
            top: qi < 2 ? '1%' : '51%',
            left: qi % 2 === 0 ? '1%' : '51%',
            borderRadius: qi === 0 ? '100% 4px 4px 4px' : qi === 1 ? '4px 100% 4px 4px' : qi === 2 ? '4px 4px 4px 100%' : '4px 4px 100% 4px',
            backgroundColor: litPad === pad.id ? pad.on : pad.off,
            boxShadow: litPad === pad.id ? `0 0 28px 8px ${pad.shadow}, inset 0 0 20px rgba(255,255,255,0.3)` : 'inset 0 4px 8px rgba(0,0,0,0.5)',
            transform: litPad === pad.id ? 'scale(0.96)' : 'scale(1)',
            cursor: isShowing || isOver ? 'default' : 'pointer',
          }"
        >
          <span class="text-white/40 text-xs font-bold pointer-events-none select-none">{{ pad.label }}</span>
        </button>
      </div>

      <p class="text-white/40 text-xs">Keys: 1 2 3 4</p>
    </div>
  </ArcadeShell>
</template>
