<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'

const GAME_ID = 'arcade-flappy'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const highScore = ref(0)
const isOver = ref(false)
const isPaused = ref(false)

// ── constants ──────────────────────────────────────
const W = 360, H = 520
const GROUND_Y = 440
const GRAVITY = 0.42
const JUMP_VY = -7.2
const MAX_FALL = 9
const PIPE_SPEED = 2.6
const PIPE_W = 54
const PIPE_GAP = 130
const PIPE_EVERY = 1300
const STEP = 1000 / 60

// ── state ──────────────────────────────────────────
let ctx: CanvasRenderingContext2D
let dpr = 1, raf = 0, rafIdle = 0, lastTs = 0
let groundOff = 0, cityOff = 0, cloudOff = 0
let bird = { x: 80, y: GROUND_Y / 2, vy: 0, angle: 0 }
let pipes: { x: number; topH: number; passed: boolean }[] = []
let gameScore = 0, lastPipeTs = -9999, deathTimer = 0, wingFrame = 0
let gamePhase: 'idle' | 'playing' | 'dead' = 'idle'
let isPausedLocal = false, pauseTs = 0

function txt(s: string, x: number, y: number, size: number, fill: string, stroke?: string) {
  ctx.save()
  ctx.font = `900 ${size}px 'Arial Black',Arial,sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = size * 0.2; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y) }
  ctx.fillStyle = fill; ctx.fillText(s, x, y); ctx.restore()
}

function initState() {
  bird = { x: 80, y: GROUND_Y / 2, vy: 0, angle: 0 }
  pipes = []; gameScore = 0; lastPipeTs = -9999; deathTimer = 0
  score.value = 0; isOver.value = false; isPausedLocal = false
  groundOff = 0
}

function addPipe(ts: number) {
  const min = 70, max = GROUND_Y - PIPE_GAP - 70
  pipes.push({ x: W + 10, topH: min + Math.random() * (max - min), passed: false })
  lastPipeTs = ts
}

function hitTest() {
  const { x: bx, y: by } = bird, br = 12
  if (by + br >= GROUND_Y) return true
  for (const p of pipes) {
    const inX = bx + br > p.x && bx - br < p.x + PIPE_W
    if (inX && (by - br < p.topH || by + br > p.topH + PIPE_GAP)) return true
  }
  return false
}

// ── draw helpers ───────────────────────────────────
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
  g.addColorStop(0, '#1a237e'); g.addColorStop(1, '#42a5f5')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND_Y + 2)
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  const clouds = [{ ox: 30, y: 50, w: 90, h: 42 }, { ox: 200, y: 80, w: 70, h: 34 }, { ox: 310, y: 45, w: 80, h: 38 }]
  for (const c of clouds) {
    const wrap = W + c.w + 30
    const x = ((c.ox - cloudOff % wrap + wrap * 2) % wrap) - c.w - 20
    ctx.beginPath(); ctx.ellipse(x + c.w * 0.5, c.y + c.h * 0.6, c.w * 0.5, c.h * 0.4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(x + c.w * 0.3, c.y + c.h * 0.5, c.w * 0.3, c.h * 0.45, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(x + c.w * 0.7, c.y + c.h * 0.5, c.w * 0.28, c.h * 0.4, 0, 0, Math.PI * 2); ctx.fill()
  }
}

function drawCity() {
  const TILE = 720; const off = cityOff % TILE
  const buildings = [
    [0, 40, 100], [42, 28, 70], [72, 50, 140], [124, 34, 80], [160, 56, 120],
    [218, 36, 75], [256, 24, 50], [282, 48, 110], [332, 30, 64], [364, 54, 128],
    [420, 34, 80], [456, 20, 48], [478, 46, 104], [526, 38, 68], [566, 22, 56],
    [590, 52, 118], [644, 32, 74], [678, 20, 46], [700, 48, 94],
  ]
  for (let rep = -1; rep <= 2; rep++) {
    for (const [bx, bw, bh] of buildings) {
      const rx = bx - off + rep * TILE
      if (rx + bw < 0 || rx > W) continue
      const by = GROUND_Y - bh
      ctx.fillStyle = '#283593'; ctx.fillRect(rx, by, bw, bh)
      ctx.fillStyle = '#3949ab'; ctx.fillRect(rx, by, 3, bh)
      ctx.fillStyle = '#1a237e'; ctx.fillRect(rx + bw - 3, by, 3, bh)
      // windows
      for (let wr = 0; wr < Math.floor(bh / 14); wr++) {
        for (let wc = 0; wc < Math.floor(bw / 10); wc++) {
          const lit = (wr * 3 + wc * 7 + bx) % 4 !== 0
          ctx.fillStyle = lit ? 'rgba(255,240,180,0.5)' : 'rgba(0,0,0,0.2)'
          ctx.fillRect(rx + 4 + wc * 10, by + 6 + wr * 14, 5, 6)
        }
      }
    }
  }
}

function drawGround() {
  ctx.fillStyle = '#388e3c'; ctx.fillRect(0, GROUND_Y, W, 20)
  ctx.fillStyle = '#2e7d32'; ctx.fillRect(0, GROUND_Y + 18, W, H - GROUND_Y - 18)
  ctx.save(); ctx.beginPath(); ctx.rect(0, GROUND_Y, W, 20); ctx.clip()
  ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 3
  const so = Math.round(-groundOff % 24)
  for (let x = so - 40; x < W + 40; x += 24) { ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x + 20, GROUND_Y + 20); ctx.stroke() }
  ctx.restore()
  ctx.fillStyle = '#66bb6a'; ctx.fillRect(0, GROUND_Y, W, 2)
}

function drawPipes() {
  for (const p of pipes) {
    const botY = p.topH + PIPE_GAP
    const bodyX = p.x + 4, bodyW = PIPE_W - 8
    const capH = 28

    // top body
    ctx.fillStyle = '#388e3c'; ctx.fillRect(bodyX, 0, bodyW, p.topH - capH)
    ctx.fillStyle = '#4caf50'; ctx.fillRect(bodyX + 5, 0, 8, p.topH - capH)
    ctx.fillStyle = '#2e7d32'; ctx.fillRect(bodyX + bodyW - 8, 0, 8, p.topH - capH)
    // top cap
    ctx.fillStyle = '#43a047'; ctx.fillRect(p.x, p.topH - capH, PIPE_W, capH)
    ctx.fillStyle = '#66bb6a'; ctx.fillRect(p.x + 4, p.topH - capH + 2, 10, capH - 4)
    ctx.fillStyle = '#1b5e20'; ctx.fillRect(p.x, p.topH - 4, PIPE_W, 4)

    // bottom cap
    ctx.fillStyle = '#43a047'; ctx.fillRect(p.x, botY, PIPE_W, capH)
    ctx.fillStyle = '#66bb6a'; ctx.fillRect(p.x + 4, botY + 2, 10, capH - 4)
    ctx.fillStyle = '#1b5e20'; ctx.fillRect(p.x, botY, PIPE_W, 4)
    // bottom body
    ctx.fillStyle = '#388e3c'; ctx.fillRect(bodyX, botY + capH, bodyW, GROUND_Y - botY - capH)
    ctx.fillStyle = '#4caf50'; ctx.fillRect(bodyX + 5, botY + capH, 8, GROUND_Y - botY - capH)
  }
}

function drawBird() {
  ctx.save(); ctx.translate(bird.x, bird.y)
  const tgt = bird.vy < 0 ? Math.max(-0.4, bird.vy * 0.06) : Math.min(1.3, bird.vy * 0.09)
  bird.angle += (tgt - bird.angle) * 0.25
  ctx.rotate(bird.angle)
  const wingY = gamePhase === 'dead' ? 0 : Math.sin(wingFrame * 0.16) * 3.5
  // body
  ctx.fillStyle = '#FFD600'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#F57F17'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke()
  // wing
  ctx.fillStyle = '#FF8F00'; ctx.beginPath(); ctx.ellipse(-2, 2 + wingY, 9, 5, -0.3, 0, Math.PI * 2); ctx.fill()
  // belly
  ctx.fillStyle = '#FFF9C4'; ctx.beginPath(); ctx.ellipse(2, 3, 7, 5, 0, 0, Math.PI * 2); ctx.fill()
  // eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, -4, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(7.5, -3.5, 2.8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8.5, -4.8, 1, 0, Math.PI * 2); ctx.fill()
  // beak
  ctx.fillStyle = '#FF6D00'; ctx.beginPath(); ctx.moveTo(9, -2); ctx.lineTo(19, -0.5); ctx.lineTo(18, 3.5); ctx.lineTo(8, 3.5); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#BF360C'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(9, 0.8); ctx.lineTo(17, 0.8); ctx.stroke()
  ctx.restore()
}

function render(ts: number) {
  ctx.clearRect(0, 0, W, H)
  drawSky(); drawClouds(); drawCity(); drawPipes(); drawGround(); drawBird()

  // score
  txt(String(gameScore), W / 2, 46, 46, '#fff', '#1a237e')

  if (gamePhase === 'idle') {
    const a = 0.8 + Math.sin(wingFrame * 0.05) * 0.2
    ctx.globalAlpha = a
    txt('Tap or press SPACE / W', W / 2, GROUND_Y / 2 + 60, 15, '#fff', '#1a237e')
    ctx.globalAlpha = 1
  }

  if (gamePhase === 'dead') {
    const flash = Math.max(0, 0.55 - deathTimer * 0.028)
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H) }
    if (deathTimer >= 20) {
      txt('GAME OVER', W / 2, GROUND_Y / 2 - 10, 32, '#fff', '#1a237e')
      if (deathTimer > 50) {
        const a = 0.7 + Math.sin(wingFrame * 0.07) * 0.3
        ctx.globalAlpha = a; txt('Tap to retry', W / 2, GROUND_Y / 2 + 36, 16, '#fff', '#1a237e'); ctx.globalAlpha = 1
      }
    }
  }

  if (isPausedLocal) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H)
    txt('PAUSED', W / 2, H / 2, 36, '#fff')
    txt('Press Esc to resume', W / 2, H / 2 + 44, 14, 'rgba(255,255,255,0.7)')
  }
}

// ── loop ───────────────────────────────────────────
function gameLoop(ts: number) {
  if (isPausedLocal) { raf = requestAnimationFrame(gameLoop); return }
  const dt = Math.min(ts - lastTs, 50) / STEP
  lastTs = ts
  wingFrame++

  if (gamePhase === 'playing') {
    groundOff += PIPE_SPEED * 1.1 * dt
    cityOff += PIPE_SPEED * 0.18 * dt
    cloudOff += PIPE_SPEED * 0.04 * dt
    if (ts - lastPipeTs > PIPE_EVERY) addPipe(ts)
    bird.vy = Math.min(bird.vy + GRAVITY * dt, MAX_FALL)
    bird.y += bird.vy * dt
    for (const p of pipes) {
      p.x -= PIPE_SPEED * dt
      if (!p.passed && p.x + PIPE_W < bird.x) {
        p.passed = true; gameScore++; score.value = gameScore
        if (gameScore > highScore.value) { highScore.value = gameScore; saveArcadeState(GAME_ID, { highScore: highScore.value }) }
      }
    }
    pipes = pipes.filter(p => p.x + PIPE_W > -10)
    if (hitTest()) { gamePhase = 'dead'; isOver.value = true }
  }

  if (gamePhase === 'dead') {
    deathTimer++
    bird.vy = Math.min(bird.vy + GRAVITY * 1.6 * dt, MAX_FALL)
    bird.y = Math.min(bird.y + bird.vy * dt, GROUND_Y - 13)
    cloudOff += PIPE_SPEED * 0.04 * dt
  }

  render(ts)
  raf = requestAnimationFrame(gameLoop)
}

function idleLoop(ts: number) {
  bird.y = GROUND_Y / 2 + Math.sin(wingFrame * 0.03) * 9
  bird.angle = 0; cloudOff += 0.15; wingFrame++
  render(ts)
  rafIdle = requestAnimationFrame(idleLoop)
}

function jump() {
  if (isPausedLocal) return
  if (gamePhase === 'idle') {
    cancelAnimationFrame(rafIdle)
    gamePhase = 'playing'; bird.vy = JUMP_VY
    lastPipeTs = performance.now(); lastTs = performance.now(); wingFrame = 0
    raf = requestAnimationFrame(gameLoop)
  } else if (gamePhase === 'playing') {
    bird.vy = JUMP_VY
  } else if (gamePhase === 'dead' && deathTimer > 50) {
    cancelAnimationFrame(raf); initState()
    gamePhase = 'idle'; wingFrame = 0
    rafIdle = requestAnimationFrame(idleLoop)
  }
}

function togglePause() {
  if (gamePhase !== 'playing') return
  isPausedLocal = !isPausedLocal
  isPaused.value = isPausedLocal
  if (isPausedLocal) {
    pauseTs = performance.now()
  } else {
    const delta = performance.now() - pauseTs
    lastTs = performance.now(); lastPipeTs += delta
    raf = requestAnimationFrame(gameLoop)
  }
}

function reset() {
  cancelAnimationFrame(raf); cancelAnimationFrame(rafIdle)
  initState(); gamePhase = 'idle'; wingFrame = 0
  rafIdle = requestAnimationFrame(idleLoop)
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); togglePause(); return }
  if (isPausedLocal) return
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); jump() }
}

const onBlur = () => { if (gamePhase === 'playing' && !isPausedLocal) togglePause() }

onMounted(async () => {
  const saved = await loadArcadeSave<{ highScore?: number }>(GAME_ID)
  highScore.value = saved.highScore ?? 0
  await new Promise<void>(r => setTimeout(r, 30))
  const canvas = canvasRef.value!
  dpr = window.devicePixelRatio || 1
  canvas.width = W * dpr; canvas.height = H * dpr
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr)
  ctx.imageSmoothingEnabled = false
  initState(); gamePhase = 'idle'; wingFrame = 0
  rafIdle = requestAnimationFrame(idleLoop)
  document.addEventListener('keydown', onKey)
  window.addEventListener('blur', onBlur)
})

onBeforeUnmount(async () => {
  cancelAnimationFrame(raf); cancelAnimationFrame(rafIdle)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('blur', onBlur)
  await flushArcadeSave(GAME_ID, { highScore: highScore.value })
})
</script>

<template>
  <ArcadeShell
    :game-id="GAME_ID"
    game-name="Flappy Dot"
    emoji="🐦"
    color="#42a5f5"
    controls="Space / W / Tap · Esc = pause"
    :score="score"
    :high-score="highScore"
    :is-over="isOver"
    :is-paused="isPaused"
    :can-pause="false"
    @reset="reset"
    @pause="() => {}"
    @resume="() => {}"
  >
    <div class="w-full h-full flex items-center justify-center bg-[#1a237e]">
      <canvas
        ref="canvasRef"
        class="cursor-pointer"
        style="image-rendering:pixelated"
        @click="jump"
        @touchstart.prevent="jump"
      />
    </div>
  </ArcadeShell>
</template>
