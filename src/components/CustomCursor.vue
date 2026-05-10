<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { gsap } from 'gsap'

const ringRef = ref<HTMLDivElement | null>(null)
const dotRef = ref<HTMLDivElement | null>(null)
const isMounted = ref(false)
const isHover = ref(false)
const isPressed = ref(false)

let rafId = 0
const target = { x: -100, y: -100 }
const current = { x: -100, y: -100 }

const isInteractive = (el: Element | null): boolean => {
  if (!el) return false
  const node = el as HTMLElement
  if (node.dataset?.cursor === 'magnetic') return true
  if (node.closest?.('a, button, [role="button"], [data-cursor="magnetic"]')) return true
  return false
}

const onPointerMove = (e: PointerEvent) => {
  target.x = e.clientX
  target.y = e.clientY

  const hovered = isInteractive(e.target as Element)
  if (hovered !== isHover.value) {
    isHover.value = hovered
  }
}

const onPointerDown = () => {
  isPressed.value = true
}
const onPointerUp = () => {
  isPressed.value = false
}

const tick = () => {
  current.x += (target.x - current.x) * 0.22
  current.y += (target.y - current.y) * 0.22
  if (ringRef.value) {
    gsap.set(ringRef.value, { x: current.x, y: current.y })
  }
  if (dotRef.value) {
    gsap.set(dotRef.value, { x: target.x, y: target.y })
  }
  rafId = window.requestAnimationFrame(tick)
}

onMounted(() => {
  if (typeof window === 'undefined') return
  const isFinePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
  if (!isFinePointer) return

  document.body.classList.add('has-custom-cursor')
  isMounted.value = true

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })

  rafId = window.requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  document.body.classList.remove('has-custom-cursor')
  window.cancelAnimationFrame(rafId)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <div v-if="isMounted" aria-hidden="true" class="custom-cursor pointer-events-none">
    <div
      ref="ringRef"
      class="ring fixed top-0 left-0 z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,border-color,opacity,box-shadow] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
      :class="{
        'ring-active': isHover,
        'ring-pressed': isPressed,
      }"
    />
    <div
      ref="dotRef"
      class="dot fixed top-0 left-0 z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ochre transition-opacity duration-150"
      :class="{ 'opacity-0': isHover }"
    />
  </div>
</template>

<style scoped>
.ring {
  width: 32px;
  height: 32px;
  border: 1.5px solid rgba(204, 123, 60, 0.65);
  background: rgba(204, 123, 60, 0.04);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.4) inset,
    0 0 18px -2px rgba(204, 123, 60, 0.45);
  mix-blend-mode: normal;
}

:global(.dark) .ring {
  border-color: rgba(229, 168, 103, 0.7);
  background: rgba(229, 168, 103, 0.06);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 0 22px -2px rgba(229, 168, 103, 0.45);
}

.ring-active {
  width: 56px;
  height: 56px;
  border-color: rgba(140, 58, 53, 0.6);
  background: rgba(140, 58, 53, 0.08);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.5) inset,
    0 0 28px -2px rgba(140, 58, 53, 0.45);
}

:global(.dark) .ring-active {
  border-color: rgba(216, 150, 145, 0.55);
  background: rgba(216, 150, 145, 0.08);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 0 32px -2px rgba(216, 150, 145, 0.5);
}

.ring-pressed {
  transform: translate(-50%, -50%) scale(0.85);
}

.dot {
  width: 4px;
  height: 4px;
  background: rgba(140, 58, 53, 0.9);
}

:global(.dark) .dot {
  background: rgba(229, 168, 103, 0.95);
}
</style>
