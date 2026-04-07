<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'

const GAME_ID = 'arcade-stacker'
const COLS = 9
const ROWS = 14

const ROW_COLORS = [
  '#f87171','#fb923c','#fbbf24','#a3e635','#34d399',
  '#22d3ee','#60a5fa','#a78bfa','#f472b6','#f87171',
  '#fb923c','#fbbf24','#a3e635','#34d399',
]

const score = ref(0)
const highScore = ref(0)
const isOver = ref(false)
const isWon = ref(false)
const isPaused = ref(false)

// grid[row][col] - row 0 = top, row ROWS-1 = bottom
const grid = ref<boolean[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill(false)))
const blockWidth = ref(4)
const blockX = ref(0)
const blockDir = ref(1)
const currentRow = ref(ROWS - 1)
const perfect = ref(0) // consecutive perfect placements

let tickTimer: ReturnType<typeof setInterval> | null = null
let speed = 380 // ms per step (decreases as you go up)
let isPausedLocal = false

// The placed row widths for tower rendering
const towerBlocks = computed(() => {
  const blocks: { row: number; col: number; color: string }[] = []
  for (let r = 0; r < ROWS; r++) {
    const row = grid.value[r]!
    for (let c = 0; c < COLS; c++) {
      if (row[c]) blocks.push({ row: r, col: c, color: ROW_COLORS[r % ROW_COLORS.length]! })
    }
  }
  return blocks
})

function getSpeed() {
  // Faster as we go higher
  const rowsPlaced = ROWS - 1 - currentRow.value
  return Math.max(70, speed - rowsPlaced * 18)
}

function startRow() {
  blockX.value = 0; blockDir.value = 1
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = setInterval(moveTick, getSpeed())
}

function moveTick() {
  if (isPausedLocal || isOver.value) return
  blockX.value += blockDir.value
  if (blockX.value + blockWidth.value >= COLS) { blockX.value = COLS - blockWidth.value; blockDir.value = -1 }
  else if (blockX.value <= 0) { blockX.value = 0; blockDir.value = 1 }
}

function place() {
  if (isOver.value || isPausedLocal) return
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null }

  const row = currentRow.value

  if (row === ROWS - 1) {
    // First row — just place it
    for (let c = blockX.value; c < blockX.value + blockWidth.value; c++) grid.value[row]![c] = true
    score.value += blockWidth.value * 10
    perfect.value = 0
    currentRow.value--; startRow(); return
  }

  const prev = grid.value[row + 1]!
  const prevLeft = prev.indexOf(true), prevRight = prev.lastIndexOf(true)
  if (prevLeft === -1) { endGame(); return }

  const newLeft = Math.max(blockX.value, prevLeft)
  const newRight = Math.min(blockX.value + blockWidth.value, prevRight + 1)
  if (newLeft >= newRight) { endGame(); return }

  const wasPerfect = newLeft === prevLeft && (newRight - newLeft) === (prevRight - prevLeft + 1)
  if (wasPerfect) {
    perfect.value++
    score.value += blockWidth.value * 10 + perfect.value * 20
  } else {
    perfect.value = 0
    score.value += (newRight - newLeft) * 10
  }
  if (score.value > highScore.value) highScore.value = score.value

  for (let c = newLeft; c < newRight; c++) grid.value[row]![c] = true
  blockWidth.value = newRight - newLeft; blockX.value = newLeft

  if (currentRow.value === 0) {
    isWon.value = true; isOver.value = true
    if (score.value > highScore.value) highScore.value = score.value
    saveArcadeState(GAME_ID, { highScore: highScore.value }); return
  }

  currentRow.value--; startRow()
}

function endGame() {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
  isOver.value = true
  if (score.value > highScore.value) { highScore.value = score.value; saveArcadeState(GAME_ID, { highScore: highScore.value }) }
}

function reset() {
  if (tickTimer) clearInterval(tickTimer)
  grid.value = Array.from({ length: ROWS }, () => Array(COLS).fill(false))
  blockWidth.value = 4; blockX.value = 0; blockDir.value = 1; currentRow.value = ROWS - 1
  score.value = 0; isOver.value = false; isWon.value = false; isPaused.value = false; isPausedLocal = false
  perfect.value = 0; speed = 380; startRow()
}

function togglePause() {
  if (isOver.value) return
  isPausedLocal = !isPausedLocal; isPaused.value = isPausedLocal
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return }
  if (isPausedLocal) return
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); place() }
}

const CELL_SIZE = 28  // px per cell (responsive via transform)
const boardW = computed(() => COLS * CELL_SIZE)
const boardH = computed(() => ROWS * CELL_SIZE)

onMounted(async () => {
  const saved = await loadArcadeSave<{ highScore?: number }>(GAME_ID)
  highScore.value = saved.highScore ?? 0
  reset(); window.addEventListener('keydown', onKey)
})

onBeforeUnmount(async () => {
  if (tickTimer) clearInterval(tickTimer)
  window.removeEventListener('keydown', onKey)
  await flushArcadeSave(GAME_ID, { highScore: highScore.value })
})
</script>

<template>
  <ArcadeShell
    :game-id="GAME_ID"
    game-name="Stack"
    emoji="🏗️"
    color="#FFE4B5"
    controls="Space / Tap / ↓ to place · Esc = pause"
    :score="score"
    :high-score="highScore"
    :is-over="isOver"
    :is-won="isWon"
    :is-paused="isPaused"
    :can-pause="false"
    @reset="reset"
    @pause="() => {}"
    @resume="() => {}"
  >
    <div
      class="w-full h-full flex items-center justify-center overflow-hidden select-none"
      style="background: linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 100%)"
      @click="place"
    >
      <!-- Board -->
      <div class="relative" :style="{ width: boardW + 'px', height: boardH + 'px' }">
        <!-- Background cells - rendered as SVG grid -->
        <svg class="absolute inset-0 pointer-events-none" :width="boardW" :height="boardH">
          <defs>
            <pattern id="cell-grid" :width="CELL_SIZE" :height="CELL_SIZE" patternUnits="userSpaceOnUse">
              <rect :width="CELL_SIZE" :height="CELL_SIZE" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cell-grid)" />
        </svg>

        <!-- Placed blocks -->
        <div
          v-for="b in towerBlocks"
          :key="`b-${b.row}-${b.col}`"
          class="absolute transition-none"
          :style="{
            left: b.col * CELL_SIZE + 'px',
            top: b.row * CELL_SIZE + 'px',
            width: CELL_SIZE - 1 + 'px',
            height: CELL_SIZE - 1 + 'px',
            backgroundColor: b.color,
            borderRadius: '3px',
            boxShadow: `inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.3)`,
          }"
        />

        <!-- Moving block -->
        <template v-if="!isOver">
          <div
            v-for="ci in blockWidth"
            :key="`m-${ci}`"
            class="absolute"
            :style="{
              left: (blockX + ci - 1) * CELL_SIZE + 'px',
              top: currentRow * CELL_SIZE + 'px',
              width: CELL_SIZE - 1 + 'px',
              height: CELL_SIZE - 1 + 'px',
              backgroundColor: ROW_COLORS[currentRow % ROW_COLORS.length],
              borderRadius: '3px',
              boxShadow: `0 0 10px ${ROW_COLORS[currentRow % ROW_COLORS.length]}cc, inset 0 2px 0 rgba(255,255,255,0.4)`,
            }"
          />
        </template>

        <!-- Perfect label -->
        <div
          v-if="perfect > 0"
          class="absolute inset-x-0 top-1 text-center text-xs font-bold text-yellow-300 animate-pulse pointer-events-none"
        >
          ✨ Perfect x{{ perfect }}
        </div>
      </div>
    </div>
  </ArcadeShell>
</template>
