<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'

const GAME_ID = 'arcade-snake'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const highScore = ref(0)
const isOver = ref(false)
const isPaused = ref(false)

// ── constants ──────────────────────────────────────
const COLS = 22
const ROWS = 22
let cw = 0, ch = 0
let cellW = 0, cellH = 0
const TICK = 110 // ms between moves

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Pt = [number, number]

// ── state ──────────────────────────────────────────
let snake: Pt[] = []
let dir: Dir = 'RIGHT'
let nextDir: Dir = 'RIGHT'
let food: Pt = [0, 0]
let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = []
let raf = 0
let lastTick = 0
let deathFlash = 0   // frames remaining of red flash
let started = false  // idle until first input

// ── init ──────────────────────────────────────────
function rand(max: number) { return Math.floor(Math.random() * max) }

function spawnFood(body: Pt[]): Pt {
  const set = new Set(body.map(([x, y]) => `${x},${y}`))
  let p: Pt
  do { p = [rand(COLS), rand(ROWS)] } while (set.has(`${p[0]},${p[1]}`))
  return p
}

function initGame() {
  snake = [[11, 11], [10, 11], [9, 11]]
  dir = 'RIGHT'; nextDir = 'RIGHT'
  food = spawnFood(snake)
  particles = []
  score.value = 0
  isOver.value = false
  isPaused.value = false
  deathFlash = 0
  started = false
  lastTick = 0
}

// ── physics ────────────────────────────────────────
function step(ts: number) {
  if (!started || isPaused.value || isOver.value) return
  if (ts - lastTick < TICK) return
  lastTick = ts

  dir = nextDir
  const head = snake[0]!
  const nx: Pt = [
    (head[0] + (dir === 'RIGHT' ? 1 : dir === 'LEFT' ? -1 : 0) + COLS) % COLS,
    (head[1] + (dir === 'DOWN' ? 1 : dir === 'UP' ? -1 : 0) + ROWS) % ROWS,
  ]

  if (snake.some(([x, y]) => x === nx[0] && y === nx[1])) {
    deathFlash = 20
    isOver.value = true
    if (score.value > highScore.value) {
      highScore.value = score.value
      saveArcadeState(GAME_ID, { highScore: highScore.value })
    }
    return
  }

  const ate = nx[0] === food[0] && nx[1] === food[1]
  snake = ate ? [nx, ...snake] : [nx, ...snake.slice(0, -1)]

  if (ate) {
    score.value += 10
    if (score.value > highScore.value) highScore.value = score.value
    food = spawnFood(snake)
    // spawn burst
    const fx = (food[0] + 0.5) * cellW, fy = (food[1] + 0.5) * cellH
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12
      particles.push({ x: fx, y: fy, vx: Math.cos(angle) * (1 + Math.random() * 2), vy: Math.sin(angle) * (1 + Math.random() * 2), life: 30, color: `hsl(${rand(360)},80%,60%)` })
    }
  }
}

// ── render ─────────────────────────────────────────
function draw(ts: number) {
  const canvas = canvasRef.value; if (!canvas) return
  const ctx = canvas.getContext('2d')!

  cw = canvas.width; ch = canvas.height
  cellW = cw / COLS; cellH = ch / ROWS

  // Background — dark grid
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, cw, ch)

  // Grid lines subtle
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 0.5
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, ch); ctx.stroke() }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(cw, r * cellH); ctx.stroke() }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!
    p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--
    ctx.globalAlpha = p.life / 30
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill()
    if (p.life <= 0) particles.splice(i, 1)
  }
  ctx.globalAlpha = 1

  // Food — pulsing glow
  const glow = 0.6 + 0.4 * Math.sin(ts * 0.004)
  const fx = (food[0] + 0.5) * cellW, fy = (food[1] + 0.5) * cellH
  const r = Math.min(cellW, cellH) * 0.38
  const grad = ctx.createRadialGradient(fx, fy, r * 0.1, fx, fy, r * 1.6)
  grad.addColorStop(0, `rgba(255,80,80,${glow})`)
  grad.addColorStop(1, 'rgba(255,80,80,0)')
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(fx, fy, r * 1.6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#FF5252'; ctx.shadowColor = '#FF5252'; ctx.shadowBlur = 12
  ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Snake
  snake.forEach(([x, y], i) => {
    const t = i / snake.length
    const hue = 140 - t * 30
    const lit = 55 - t * 20
    ctx.fillStyle = i === 0 ? '#4ADE80' : `hsl(${hue},70%,${lit}%)`
    ctx.shadowColor = i === 0 ? '#22c55e' : 'transparent'
    ctx.shadowBlur = i === 0 ? 10 : 0
    const pad = i === 0 ? 1 : 2
    const bx = x * cellW + pad, by = y * cellH + pad
    const bw = cellW - pad * 2, bh = cellH - pad * 2
    const rc = Math.min(bw, bh) * 0.3
    ctx.beginPath()
    ctx.moveTo(bx + rc, by)
    ctx.lineTo(bx + bw - rc, by)
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + rc)
    ctx.lineTo(bx + bw, by + bh - rc)
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - rc, by + bh)
    ctx.lineTo(bx + rc, by + bh)
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - rc)
    ctx.lineTo(bx, by + rc)
    ctx.quadraticCurveTo(bx, by, bx + rc, by)
    ctx.closePath(); ctx.fill()
  })
  ctx.shadowBlur = 0

  // Death flash
  if (deathFlash > 0) {
    ctx.fillStyle = `rgba(255,0,0,${deathFlash / 40})`
    ctx.fillRect(0, 0, cw, ch)
    deathFlash--
  }

  // Idle start message
  if (!started && !isOver.value) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, cw, ch)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Inter,sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Press arrow / WASD to start', cw / 2, ch / 2)
  }
}

function loop(ts: number) {
  step(ts); draw(ts)
  raf = requestAnimationFrame(loop)
}

// ── controls ───────────────────────────────────────
function reset() {
  cancelAnimationFrame(raf)
  initGame()
  raf = requestAnimationFrame(loop)
}

const DIRS: Record<string, Dir> = {
  ArrowUp: 'UP', w: 'UP', W: 'UP',
  ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
  ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
}
const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (!isOver.value) isPaused.value = !isPaused.value
    return
  }
  const d = DIRS[e.key]
  if (!d) return
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
  if (OPPOSITE[d] === dir) return
  nextDir = d
  if (!started) started = true
}

// Swipe
let swipeStart: { x: number; y: number } | null = null
function onTouchStart(e: TouchEvent) { const t = e.touches[0]!; swipeStart = { x: t.clientX, y: t.clientY } }
function onTouchEnd(e: TouchEvent) {
  if (!swipeStart) return
  const t = e.changedTouches[0]!
  const dx = t.clientX - swipeStart.x, dy = t.clientY - swipeStart.y
  let d: Dir | null = null
  if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? 'RIGHT' : 'LEFT'
  else d = dy > 0 ? 'DOWN' : 'UP'
  if (OPPOSITE[d] !== dir) { nextDir = d; started = true }
  swipeStart = null
}

onMounted(async () => {
  const saved = await loadArcadeSave<{ highScore?: number }>(GAME_ID)
  highScore.value = saved.highScore ?? 0
  await new Promise<void>((r) => setTimeout(r, 30))
  const canvas = canvasRef.value
  if (canvas) {
    const dpr = window.devicePixelRatio || 1
    const p = canvas.parentElement!
    canvas.width = p.clientWidth * dpr; canvas.height = p.clientHeight * dpr
    canvas.style.width = p.clientWidth + 'px'; canvas.style.height = p.clientHeight + 'px'
    const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr)
  }
  initGame()
  raf = requestAnimationFrame(loop)
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(async () => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  await flushArcadeSave(GAME_ID, { highScore: highScore.value })
})
</script>

<template>
  <ArcadeShell
    :game-id="GAME_ID"
    game-name="Snake"
    emoji="🐍"
    color="#A8E6CF"
    controls="WASD / ← → ↑ ↓ / Swipe · Esc = pause"
    :score="score"
    :high-score="highScore"
    :is-over="isOver"
    :is-paused="isPaused"
    @reset="reset"
    @pause="isPaused = true"
    @resume="isPaused = false"
  >
    <canvas
      ref="canvasRef"
      class="w-full h-full block"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    />
  </ArcadeShell>
</template>
