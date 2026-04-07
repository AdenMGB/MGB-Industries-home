<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'

const GAME_ID = 'arcade-breakout'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const highScore = ref(0)
const lives = ref(3)
const isOver = ref(false)
const isWon = ref(false)
const isPaused = ref(false)

let raf = 0
let cw = 0, ch = 0
let dpr = 1

const BRICK_ROWS = 6
const BRICK_COLS = 10
const BRICK_COLORS = [
  ['#ef5350','#e53935'], ['#ff7043','#f4511e'], ['#ffca28','#ffb300'],
  ['#66bb6a','#43a047'], ['#42a5f5','#1e88e5'], ['#ab47bc','#8e24aa'],
]

let paddleX = 0, paddleW = 100
let ballX = 0, ballY = 0, ballDX = 0, ballDY = 0
let bricks: { x: number; y: number; w: number; h: number; alive: boolean; top: string; bot: string; hp: number }[] = []
let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = []
let isPausedLocal = false
let started = false

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const ar = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + ar, y); ctx.lineTo(x + w - ar, y); ctx.quadraticCurveTo(x + w, y, x + w, y + ar)
  ctx.lineTo(x + w, y + h - ar); ctx.quadraticCurveTo(x + w, y + h, x + w - ar, y + h)
  ctx.lineTo(x + ar, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - ar)
  ctx.lineTo(x, y + ar); ctx.quadraticCurveTo(x, y, x + ar, y)
  ctx.closePath()
}

function setupBricks() {
  const gap = 5, topOff = 50
  const bw = (cw - gap * (BRICK_COLS + 1)) / BRICK_COLS
  const bh = 18
  bricks = []
  for (let r = 0; r < BRICK_ROWS; r++) {
    const [top, bot] = BRICK_COLORS[r % BRICK_COLORS.length]!
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({ x: gap + c * (bw + gap), y: topOff + r * (bh + gap), w: bw, h: bh, alive: true, top, bot, hp: BRICK_ROWS - r })
    }
  }
}

function initGame() {
  paddleW = Math.min(120, cw * 0.28)
  paddleX = cw / 2 - paddleW / 2
  const speed = 4.5
  ballX = cw / 2; ballY = ch - 80
  ballDX = (Math.random() > 0.5 ? 1 : -1) * speed * 0.8; ballDY = -speed
  score.value = 0; lives.value = 3; isOver.value = false; isWon.value = false; isPaused.value = false
  isPausedLocal = false; started = false; particles = []
  setupBricks()
}

function burst(x: number, y: number, color: string) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 24, color })
  }
}

function draw() {
  const canvas = canvasRef.value; if (!canvas) return
  const ctx = canvas.getContext('2d')!

  // BG gradient
  const bg = ctx.createLinearGradient(0, 0, 0, ch)
  bg.addColorStop(0, '#0d1117'); bg.addColorStop(1, '#161b22')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch)

  // Bricks
  for (const b of bricks) {
    if (!b.alive) continue
    const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h)
    g.addColorStop(0, b.top); g.addColorStop(1, b.bot)
    ctx.fillStyle = g; rr(ctx, b.x, b.y, b.w, b.h, 5); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, b.x + 2, b.y + 2, b.w - 4, 4, 2); ctx.fill()
  }

  // Particles
  for (const p of particles) {
    ctx.globalAlpha = p.life / 24; ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1

  // Paddle
  const pg = ctx.createLinearGradient(paddleX, ch - 22, paddleX, ch - 10)
  pg.addColorStop(0, '#7c3aed'); pg.addColorStop(1, '#4f46e5')
  ctx.fillStyle = pg; rr(ctx, paddleX, ch - 22, paddleW, 12, 6); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(ctx, paddleX + 4, ch - 22, paddleW - 8, 4, 2); ctx.fill()

  // Ball glow
  ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 14
  const ballG = ctx.createRadialGradient(ballX - 2, ballY - 2, 1, ballX, ballY, 9)
  ballG.addColorStop(0, '#fce7f3'); ballG.addColorStop(1, '#ec4899')
  ctx.fillStyle = ballG; ctx.beginPath(); ctx.arc(ballX, ballY, 9, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Idle label
  if (!started) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, ch / 2 - 22, cw, 44)
    ctx.fillStyle = '#fff'; ctx.font = '14px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Move mouse / touch to aim, then click to launch', cw / 2, ch / 2)
  }

  if (isPausedLocal) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, cw, ch)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('PAUSED', cw / 2, ch / 2)
    ctx.font = '13px Inter,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('Press Esc to resume', cw / 2, ch / 2 + 36)
  }
}

function loop() {
  if (!isPausedLocal && !isOver.value) {
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!
      p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life--
      if (p.life <= 0) particles.splice(i, 1)
    }

    if (started) {
      ballX += ballDX; ballY += ballDY
      if (ballX < 9 || ballX > cw - 9) { ballDX *= -1; ballX = ballX < 9 ? 9 : cw - 9 }
      if (ballY < 9) { ballDY = Math.abs(ballDY); ballY = 9 }

      // Paddle
      if (ballY + 9 >= ch - 22 && ballY + 9 <= ch - 10 && ballX > paddleX - 4 && ballX < paddleX + paddleW + 4) {
        ballDY = -Math.abs(ballDY)
        const hit = (ballX - (paddleX + paddleW / 2)) / (paddleW / 2)
        ballDX = hit * 5.5; ballY = ch - 22 - 9
      }

      // Bricks
      let hitAny = false
      for (const b of bricks) {
        if (!b.alive) continue
        const closestX = Math.max(b.x, Math.min(ballX, b.x + b.w))
        const closestY = Math.max(b.y, Math.min(ballY, b.y + b.h))
        const distX = ballX - closestX, distY = ballY - closestY
        if (distX * distX + distY * distY < 81 && !hitAny) {
          hitAny = true
          b.hp--
          if (b.hp <= 0) {
            b.alive = false; score.value += 10
            burst(b.x + b.w / 2, b.y + b.h / 2, b.top)
            if (bricks.every(br => !br.alive)) { isWon.value = true; isOver.value = true; if (score.value > highScore.value) { highScore.value = score.value; saveArcadeState(GAME_ID, { highScore: highScore.value }) } }
          } else {
            score.value += 3
          }
          if (score.value > highScore.value) highScore.value = score.value
          if (Math.abs(distY) > Math.abs(distX)) ballDY *= -1; else ballDX *= -1
        }
      }

      if (ballY > ch + 20) {
        lives.value--
        if (lives.value <= 0) { isOver.value = true; if (score.value > highScore.value) { highScore.value = score.value; saveArcadeState(GAME_ID, { highScore: highScore.value }) } }
        else { ballX = paddleX + paddleW / 2; ballY = ch - 60; ballDX = (Math.random() > 0.5 ? 1 : -1) * 3.5; ballDY = -4.5; started = false }
      }
    } else {
      // Ball follows paddle pre-launch
      ballX = paddleX + paddleW / 2; ballY = ch - 40
    }
  }
  draw()
  raf = requestAnimationFrame(loop)
}

function launch() { if (!started && !isOver.value && !isPausedLocal) { started = true; ballDY = -4.5 } }

function togglePause() {
  if (isOver.value) return
  isPausedLocal = !isPausedLocal; isPaused.value = isPausedLocal
}

function reset() { cancelAnimationFrame(raf); initGame(); raf = requestAnimationFrame(loop) }

function movePaddle(x: number) {
  paddleX = Math.max(0, Math.min(cw - paddleW, x - paddleW / 2))
}

function onMouseMove(e: MouseEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  movePaddle((e.clientX - rect.left) / (rect.width / cw))
}
function onTouchMove(e: TouchEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  const t = e.touches[0]!
  movePaddle((t.clientX - rect.left) / (rect.width / cw))
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return }
  if (isPausedLocal) return
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); launch(); return }
  if (e.key === 'ArrowLeft') movePaddle(paddleX)
  if (e.key === 'ArrowRight') movePaddle(paddleX + paddleW)
}

onMounted(async () => {
  const saved = await loadArcadeSave<{ highScore?: number }>(GAME_ID)
  highScore.value = saved.highScore ?? 0
  await new Promise<void>(r => setTimeout(r, 30))
  const canvas = canvasRef.value!
  dpr = window.devicePixelRatio || 1
  const p = canvas.parentElement!
  canvas.width = p.clientWidth * dpr; canvas.height = p.clientHeight * dpr
  canvas.style.width = p.clientWidth + 'px'; canvas.style.height = p.clientHeight + 'px'
  const ctx2 = canvas.getContext('2d')!; ctx2.scale(dpr, dpr)
  cw = p.clientWidth; ch = p.clientHeight
  initGame(); raf = requestAnimationFrame(loop)
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(async () => {
  cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey)
  await flushArcadeSave(GAME_ID, { highScore: highScore.value })
})
</script>

<template>
  <ArcadeShell
    :game-id="GAME_ID"
    game-name="Breakout"
    emoji="🧱"
    color="#FFB5A7"
    controls="Mouse / Touch · Space = launch · Esc = pause"
    :score="score"
    :high-score="highScore"
    :lives="lives"
    :max-lives="3"
    :is-over="isOver"
    :is-won="isWon"
    :is-paused="isPaused"
    :show-score="true"
    :show-lives="true"
    :show-high-score="true"
    :can-pause="false"
    @reset="reset"
    @pause="() => {}"
    @resume="() => {}"
  >
    <canvas
      ref="canvasRef"
      class="w-full h-full block cursor-none"
      @mousemove="onMouseMove"
      @touchmove.prevent="onTouchMove"
      @click="launch"
    />
  </ArcadeShell>
</template>
