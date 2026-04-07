<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ArcadeShell from '../ArcadeShell.vue'
import { saveArcadeState, flushArcadeSave, loadArcadeSave } from '@/utils/arcadeSaveSync'

const GAME_ID = 'arcade-pong'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const highScore = ref(0)
const isOver = ref(false)
const isPaused = ref(false)

let raf = 0, cw = 0, ch = 0, dpr = 1
let paddleY = 0, aiY = 0
let ballX = 0, ballY = 0, ballDX = 0, ballDY = 0
let ballTrail: { x: number; y: number }[] = []
let isPausedLocal = false
let started = false
let aiLevel = 3.2  // AI speed, increases with score

const PW = 14, PH = 78, BR = 8

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath()
}

function initGame() {
  paddleY = ch / 2 - PH / 2; aiY = ch / 2 - PH / 2
  ballX = cw / 2; ballY = ch / 2; ballDX = 4.2; ballDY = (Math.random() > 0.5 ? 1 : -1) * 3
  score.value = 0; isOver.value = false; isPaused.value = false; isPausedLocal = false
  ballTrail = []; started = false; aiLevel = 3.2
}

function draw() {
  const canvas = canvasRef.value; if (!canvas) return
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, cw, ch)

  // BG
  ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, cw, ch)
  // Court lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch); ctx.stroke()
  ctx.beginPath(); ctx.arc(cw / 2, ch / 2, 50, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, ch); ctx.moveTo(cw, 0); ctx.lineTo(cw, ch); ctx.stroke()

  // Centre dashes
  ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch); ctx.stroke(); ctx.setLineDash([])

  // Ball trail
  for (let i = 0; i < ballTrail.length; i++) {
    const a = (i / ballTrail.length) * 0.4
    ctx.globalAlpha = a; ctx.fillStyle = '#e879f9'
    ctx.beginPath(); ctx.arc(ballTrail[i]!.x, ballTrail[i]!.y, BR * 0.6, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1

  // Ball glow
  ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 18
  const bg = ctx.createRadialGradient(ballX - 2, ballY - 2, 1, ballX, ballY, BR)
  bg.addColorStop(0, '#fdf4ff'); bg.addColorStop(1, '#a855f7')
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(ballX, ballY, BR, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Player paddle (left)
  const pg1 = ctx.createLinearGradient(14, 0, 14 + PW, 0)
  pg1.addColorStop(0, '#6366f1'); pg1.addColorStop(1, '#4f46e5')
  ctx.fillStyle = pg1; rr(ctx, 14, paddleY, PW, PH, 5); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(14 + 3, paddleY + 4, 3, PH - 8)

  // AI paddle (right)
  const pg2 = ctx.createLinearGradient(cw - 14 - PW, 0, cw - 14, 0)
  pg2.addColorStop(0, '#f43f5e'); pg2.addColorStop(1, '#e11d48')
  ctx.fillStyle = pg2; rr(ctx, cw - 14 - PW, aiY, PW, PH, 5); ctx.fill()

  // Score
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = 'bold 36px Inter,sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText(String(score.value), cw / 2 - 44, 14)

  if (!started) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, ch / 2 - 22, cw, 44)
    ctx.fillStyle = '#fff'; ctx.font = '13px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Move mouse/touch to start · ↑↓ keys also work', cw / 2, ch / 2)
  }

  if (isPausedLocal) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, cw, ch)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('PAUSED', cw / 2, ch / 2)
    ctx.font = '13px Inter,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('Esc to resume', cw / 2, ch / 2 + 36)
  }
}

function loop() {
  if (!isPausedLocal && !isOver.value && started) {
    ballTrail.push({ x: ballX, y: ballY })
    if (ballTrail.length > 8) ballTrail.shift()

    ballX += ballDX; ballY += ballDY

    if (ballY - BR < 0) { ballY = BR; ballDY = Math.abs(ballDY) }
    if (ballY + BR > ch) { ballY = ch - BR; ballDY = -Math.abs(ballDY) }

    // Player paddle
    if (ballX - BR < 14 + PW && ballX - BR > 14 && ballY > paddleY - 4 && ballY < paddleY + PH + 4) {
      ballDX = Math.abs(ballDX) + 0.15
      if (ballDX > 10) ballDX = 10
      const off = (ballY - (paddleY + PH / 2)) / (PH / 2)
      ballDY = off * 6; ballX = 14 + PW + BR
      score.value++; if (score.value > highScore.value) highScore.value = score.value
      aiLevel = Math.min(7, 3.2 + score.value * 0.12)
    }

    // AI paddle
    if (ballX + BR > cw - 14 - PW && ballX + BR < cw - 14 && ballY > aiY - 4 && ballY < aiY + PH + 4) {
      ballDX = -(Math.abs(ballDX) + 0.1); ballX = cw - 14 - PW - BR
    }

    // AI movement
    const aiCenter = aiY + PH / 2
    if (aiCenter < ballY - 6) aiY = Math.min(ch - PH, aiY + aiLevel)
    else if (aiCenter > ballY + 6) aiY = Math.max(0, aiY - aiLevel)

    if (ballX - BR < 0) { isOver.value = true; if (score.value > highScore.value) { highScore.value = score.value; saveArcadeState(GAME_ID, { highScore: highScore.value }) } }
    if (ballX + BR > cw) { score.value++; ballX = cw / 2; ballY = ch / 2; ballDX = -Math.abs(ballDX); ballDY = (Math.random() > 0.5 ? 1 : -1) * 3 }
  }
  draw()
  raf = requestAnimationFrame(loop)
}

function togglePause() {
  if (isOver.value) return
  isPausedLocal = !isPausedLocal; isPaused.value = isPausedLocal
}

function reset() { cancelAnimationFrame(raf); initGame(); raf = requestAnimationFrame(loop) }

function movePaddleY(clientY: number) {
  const rect = canvasRef.value!.getBoundingClientRect()
  paddleY = ((clientY - rect.top) / rect.height) * ch - PH / 2
  paddleY = Math.max(0, Math.min(ch - PH, paddleY))
  if (!started) started = true
}

function onMouseMove(e: MouseEvent) { movePaddleY(e.clientY) }
function onTouchMove(e: TouchEvent) { const t = e.touches[0]!; movePaddleY(t.clientY) }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return }
  if (isPausedLocal) return
  if (e.key === 'ArrowUp') { paddleY = Math.max(0, paddleY - 20); started = true }
  if (e.key === 'ArrowDown') { paddleY = Math.min(ch - PH, paddleY + 20); started = true }
}

onMounted(async () => {
  const saved = await loadArcadeSave<{ highScore?: number }>(GAME_ID)
  highScore.value = saved.highScore ?? 0
  await new Promise<void>(r => setTimeout(r, 30))
  const canvas = canvasRef.value!
  dpr = window.devicePixelRatio || 1
  const p = canvas.parentElement!
  cw = p.clientWidth; ch = p.clientHeight
  canvas.width = cw * dpr; canvas.height = ch * dpr
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'
  const ctx2 = canvas.getContext('2d')!; ctx2.scale(dpr, dpr)
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
    game-name="Pong"
    emoji="🏓"
    color="#B5E5E8"
    controls="Mouse / Touch / ↑ ↓ · Esc = pause"
    :score="score"
    :high-score="highScore"
    :is-over="isOver"
    :is-paused="isPaused"
    :can-pause="false"
    @reset="reset"
    @pause="() => {}"
    @resume="() => {}"
  >
    <canvas
      ref="canvasRef"
      class="w-full h-full block"
      @mousemove="onMouseMove"
      @touchmove.prevent="onTouchMove"
    />
  </ArcadeShell>
</template>
