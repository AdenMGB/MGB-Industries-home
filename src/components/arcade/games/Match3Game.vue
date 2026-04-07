<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'
import { cn } from '@/utils/cn'

const GAME_ID = 'arcade-match3'
const COLS = 7
const ROWS = 7
const GAME_TIME = 90
const GEM_TYPES = 6

// Each gem: type index (0-5)
type Grid = number[][]

const GEM_DEFS = [
  { emoji: '💎', color: '#60a5fa', shadow: '#93c5fd', glow: '#2563eb' },
  { emoji: '❤️', color: '#f87171', shadow: '#fca5a5', glow: '#dc2626' },
  { emoji: '💛', color: '#facc15', shadow: '#fde047', glow: '#ca8a04' },
  { emoji: '💚', color: '#4ade80', shadow: '#86efac', glow: '#16a34a' },
  { emoji: '💜', color: '#c084fc', shadow: '#d8b4fe', glow: '#9333ea' },
  { emoji: '🧡', color: '#fb923c', shadow: '#fdba74', glow: '#ea580c' },
]

const score = ref(0)
const highScore = ref(0)
const timeLeft = ref(GAME_TIME)
const isOver = ref(false)
const isPaused = ref(false)
const grid = ref<Grid>([])
const selected = ref<{ r: number; c: number } | null>(null)
const popping = ref<Set<string>>(new Set())
const swapping = ref<string[]>([])  // keys of gems being swapped
let timerInterval: ReturnType<typeof setInterval> | null = null
let processing = false

function rand() { return Math.floor(Math.random() * GEM_TYPES) }

function makeGrid(): Grid {
  // Generate without starting matches
  const g: Grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => rand()))
  // Clear any existing runs
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      while (
        (c >= 2 && g[r]![c] === g[r]![c - 1] && g[r]![c] === g[r]![c - 2]) ||
        (r >= 2 && g[r]![c] === g[r - 1]![c] && g[r]![c] === g[r - 2]![c])
      ) {
        g[r]![c] = rand()
      }
    }
  }
  return g
}

function findMatches(g: Grid): Set<string> {
  const m = new Set<string>()
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 2; c++) {
      if (g[r]![c] === g[r]![c + 1] && g[r]![c] === g[r]![c + 2]) {
        let len = 3
        while (c + len < COLS && g[r]![c] === g[r]![c + len]) len++
        for (let i = 0; i < len; i++) m.add(`${r},${c + i}`)
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 2; r++) {
      if (g[r]![c] === g[r + 1]![c] && g[r]![c] === g[r + 2]![c]) {
        let len = 3
        while (r + len < ROWS && g[r]![c] === g[r + len]![c]) len++
        for (let i = 0; i < len; i++) m.add(`${r + i},${c}`)
      }
    }
  }
  return m
}

function collapse(g: Grid, matches: Set<string>): Grid {
  const ng = g.map(row => [...row])
  for (const key of matches) {
    const [rs, cs] = key.split(','); ng[Number(rs)]![Number(cs)] = -1
  }
  for (let c = 0; c < COLS; c++) {
    const filled: number[] = []
    for (let r = ROWS - 1; r >= 0; r--) { if (ng[r]![c] !== -1) filled.push(ng[r]![c]!) }
    while (filled.length < ROWS) filled.push(rand())
    for (let r = ROWS - 1; r >= 0; r--) ng[r]![c] = filled[ROWS - 1 - r]!
  }
  return ng
}

async function processMatches() {
  processing = true
  let g = grid.value
  let m = findMatches(g)
  let chain = 0
  while (m.size > 0) {
    popping.value = m
    score.value += m.size * 10 * (chain + 1)
    if (score.value > highScore.value) highScore.value = score.value
    await new Promise<void>(r => setTimeout(r, 380))
    g = collapse(g, m); grid.value = g; popping.value = new Set()
    await new Promise<void>(r => setTimeout(r, 120))
    m = findMatches(g); chain++
  }
  processing = false
}

async function selectCell(r: number, c: number) {
  if (isOver.value || isPaused.value || processing) return
  if (!selected.value) { selected.value = { r, c }; return }
  const { r: sr, c: sc } = selected.value
  if (sr === r && sc === c) { selected.value = null; return }
  const dr = Math.abs(r - sr), dc = Math.abs(c - sc)
  if (dr + dc !== 1) { selected.value = { r, c }; return }

  selected.value = null
  swapping.value = [`${sr},${sc}`, `${r},${c}`]
  await new Promise<void>(res => setTimeout(res, 180))

  const ng = grid.value.map(row => [...row])
  const tmp = ng[r]![c]!; ng[r]![c] = ng[sr]![sc]!; ng[sr]![sc] = tmp
  grid.value = ng; swapping.value = []

  const m = findMatches(ng)
  if (m.size === 0) {
    // Swap back
    await new Promise<void>(res => setTimeout(res, 150))
    const rg = grid.value.map(row => [...row])
    const t2 = rg[r]![c]!; rg[r]![c] = rg[sr]![sc]!; rg[sr]![sc] = t2
    grid.value = rg; return
  }
  await processMatches()
}

function reset() {
  clearInterval(timerInterval!); processing = false
  grid.value = makeGrid(); selected.value = null; popping.value = new Set(); swapping.value = []
  score.value = 0; timeLeft.value = GAME_TIME; isOver.value = false; isPaused.value = false

  timerInterval = setInterval(() => {
    if (isPaused.value) return
    timeLeft.value--
    if (timeLeft.value <= 0) {
      clearInterval(timerInterval!); isOver.value = true
      if (score.value > highScore.value) { highScore.value = score.value; saveArcadeState(GAME_ID, { highScore: highScore.value }) }
    }
  }, 1000)
}

onMounted(async () => {
  const saved = await loadArcadeSave<{ highScore?: number }>(GAME_ID)
  highScore.value = saved.highScore ?? 0
  reset(); await nextTick(); await processMatches()
})

onBeforeUnmount(async () => {
  clearInterval(timerInterval!)
  await flushArcadeSave(GAME_ID, { highScore: highScore.value })
})
</script>

<template>
  <ArcadeShell
    :game-id="GAME_ID"
    game-name="Gem Blast"
    emoji="💎"
    color="#F0E68C"
    controls="Click two adjacent gems · Esc = pause"
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
    <div class="w-full h-full flex items-center justify-center p-3 select-none"
      style="background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)">
      <div
        class="grid gap-1.5"
        :style="{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, width: 'min(340px, 95vw)' }"
      >
        <template v-for="(row, r) in grid" :key="r">
          <button
            v-for="(gem, c) in row"
            :key="`${r}-${c}`"
            @click="selectCell(r, c)"
            :disabled="processing"
            class="aspect-square rounded-xl flex items-center justify-center text-xl relative overflow-hidden transition-all duration-200 focus:outline-none"
            :style="{
              background: popping.has(`${r},${c}`)
                ? `radial-gradient(circle, white 0%, ${GEM_DEFS[gem]?.color ?? '#fff'} 60%)`
                : selected && selected.r === r && selected.c === c
                  ? `radial-gradient(circle, white 0%, ${GEM_DEFS[gem]?.color ?? '#fff'} 40%)`
                  : `linear-gradient(135deg, ${GEM_DEFS[gem]?.shadow ?? '#fff'} 0%, ${GEM_DEFS[gem]?.color ?? '#fff'} 100%)`,
              boxShadow: popping.has(`${r},${c}`)
                ? `0 0 18px 6px ${GEM_DEFS[gem]?.glow ?? '#fff'}`
                : selected && selected.r === r && selected.c === c
                  ? `0 0 12px 3px white, 0 0 20px 4px ${GEM_DEFS[gem]?.glow ?? '#fff'}`
                  : `inset 0 2px 0 rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.4)`,
              transform: popping.has(`${r},${c}`)
                ? 'scale(1.2)'
                : selected && selected.r === r && selected.c === c
                  ? 'scale(1.12)'
                  : swapping.includes(`${r},${c}`)
                    ? 'scale(0.88)'
                    : 'scale(1)',
              opacity: processing && !popping.has(`${r},${c}`) ? 0.85 : 1,
            }"
          >
            <span class="text-2xl pointer-events-none" :style="{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }">
              {{ GEM_DEFS[gem]?.emoji ?? '?' }}
            </span>
          </button>
        </template>
      </div>
    </div>
  </ArcadeShell>
</template>
