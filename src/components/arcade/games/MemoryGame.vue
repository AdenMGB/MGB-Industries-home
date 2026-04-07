<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'
import { cn } from '@/utils/cn'

const GAME_ID = 'arcade-memory'

// 4×4 grid = 16 cards = 8 pairs
const PAIRS = [
  { emoji: '🦊', color: '#ff9800' }, { emoji: '🐬', color: '#00bcd4' },
  { emoji: '🌺', color: '#e91e63' }, { emoji: '⚡', color: '#ffeb3b' },
  { emoji: '🍀', color: '#4caf50' }, { emoji: '🎸', color: '#9c27b0' },
  { emoji: '🔥', color: '#f44336' }, { emoji: '🌊', color: '#2196f3' },
]

type Card = { id: number; emoji: string; color: string; flipped: boolean; matched: boolean }

const bestTime = ref(0)
const elapsedMs = ref(0)
const isOver = ref(false)
const isPaused = ref(false)
const cards = ref<Card[]>([])
const flipLocked = ref(false)
const flipped = ref<number[]>([])
const moves = ref(0)
let startTs = 0, timerRaf = 0

function makeCards(): Card[] {
  const deck = [...PAIRS, ...PAIRS].map((p, id) => ({ id, ...p, flipped: false, matched: false }))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!]
  }
  return deck
}

function reset() {
  cancelAnimationFrame(timerRaf)
  cards.value = makeCards(); flipped.value = []; elapsedMs.value = 0
  isOver.value = false; isPaused.value = false; flipLocked.value = false
  moves.value = 0; startTs = 0
  timerRaf = requestAnimationFrame(tickTimer)
}

function tickTimer() {
  if (!isPaused.value && !isOver.value && startTs > 0)
    elapsedMs.value = Date.now() - startTs
  timerRaf = requestAnimationFrame(tickTimer)
}

async function flipCard(card: Card) {
  if (isPaused.value || isOver.value || card.flipped || card.matched || flipLocked.value) return
  if (flipped.value.length >= 2) return

  if (startTs === 0) startTs = Date.now()
  card.flipped = true; flipped.value = [...flipped.value, card.id]

  if (flipped.value.length === 2) {
    moves.value++
    flipLocked.value = true
    const [aId, bId] = flipped.value
    const a = cards.value.find(c => c.id === aId)!, b = cards.value.find(c => c.id === bId)!

    if (a.emoji === b.emoji) {
      await new Promise<void>(r => setTimeout(r, 300))
      a.matched = true; b.matched = true; flipped.value = []
      flipLocked.value = false

      if (cards.value.every(c => c.matched)) {
        isOver.value = true
        const ms = Date.now() - startTs
        elapsedMs.value = ms
        if (bestTime.value === 0 || ms < bestTime.value) {
          bestTime.value = ms; saveArcadeState(GAME_ID, { bestTime: bestTime.value })
        }
      }
    } else {
      await new Promise<void>(r => setTimeout(r, 700))
      a.flipped = false; b.flipped = false; flipped.value = []
      flipLocked.value = false
    }
  }
}

const displayTime = computed(() => (elapsedMs.value / 1000).toFixed(1) + 's')
const bestDisplay = computed(() => bestTime.value > 0 ? (bestTime.value / 1000).toFixed(1) + 's' : '—')
const matchedCount = computed(() => cards.value.filter(c => c.matched).length / 2)

onMounted(async () => {
  const saved = await loadArcadeSave<{ bestTime?: number }>(GAME_ID)
  bestTime.value = saved.bestTime ?? 0
  reset()
})

onBeforeUnmount(async () => {
  cancelAnimationFrame(timerRaf)
  await flushArcadeSave(GAME_ID, { bestTime: bestTime.value })
})
</script>

<template>
  <ArcadeShell
    :game-id="GAME_ID"
    game-name="Memory Match"
    emoji="🃏"
    color="#C8A8E9"
    controls="Click cards to flip · Esc = pause"
    :score="0"
    :high-score="0"
    :is-over="isOver"
    :is-won="isOver"
    :is-paused="isPaused"
    :show-score="false"
    :show-high-score="false"
    @reset="reset"
    @pause="isPaused = true"
    @resume="isPaused = false"
  >
    <div class="w-full h-full flex flex-col items-center justify-start gap-3 p-4 overflow-y-auto"
      style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)">

      <!-- Stats row -->
      <div class="flex items-center gap-6 w-full max-w-sm justify-center shrink-0">
        <div class="text-center">
          <p class="text-xl font-bold tabular-nums text-white">{{ displayTime }}</p>
          <p class="text-[10px] text-white/40 uppercase tracking-widest">Time</p>
        </div>
        <div class="text-center">
          <p class="text-xl font-bold text-amber-400 tabular-nums">{{ bestDisplay }}</p>
          <p class="text-[10px] text-white/40 uppercase tracking-widest">Best</p>
        </div>
        <div class="text-center">
          <p class="text-xl font-bold text-white tabular-nums">{{ moves }}</p>
          <p class="text-[10px] text-white/40 uppercase tracking-widest">Moves</p>
        </div>
        <div class="text-center">
          <p class="text-xl font-bold text-green-400 tabular-nums">{{ matchedCount }}/8</p>
          <p class="text-[10px] text-white/40 uppercase tracking-widest">Pairs</p>
        </div>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-4 gap-2 w-full max-w-sm shrink-0">
        <button
          v-for="card in cards"
          :key="card.id"
          @click="flipCard(card)"
          :disabled="card.matched || flipLocked"
          :style="{ perspective: '600px' }"
          class="aspect-square focus:outline-none"
        >
          <!-- Card flip container -->
          <div
            class="relative w-full h-full transition-transform duration-400"
            :style="{
              transformStyle: 'preserve-3d',
              transform: card.flipped || card.matched ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transitionDuration: '0.35s',
            }"
          >
            <!-- Back face -->
            <div
              class="absolute inset-0 rounded-xl flex items-center justify-center"
              style="backface-visibility: hidden;"
              :class="card.matched ? 'opacity-0' : ''"
              :style="{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
              }"
            >
              <span class="text-2xl select-none">✦</span>
            </div>
            <!-- Front face -->
            <div
              class="absolute inset-0 rounded-xl flex items-center justify-center"
              style="backface-visibility: hidden; transform: rotateY(180deg);"
              :style="{
                background: card.matched
                  ? `linear-gradient(135deg, ${card.color}33 0%, ${card.color}66 100%)`
                  : `linear-gradient(135deg, ${card.color}99 0%, ${card.color}dd 100%)`,
                boxShadow: card.matched ? 'none' : `0 4px 16px ${card.color}66`,
                border: card.matched ? `2px solid ${card.color}88` : `2px solid ${card.color}`,
                opacity: card.matched ? 0.5 : 1,
              }"
            >
              <span class="text-3xl select-none" :style="{ filter: card.matched ? 'grayscale(0.5)' : 'none' }">
                {{ card.emoji }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </ArcadeShell>
</template>
