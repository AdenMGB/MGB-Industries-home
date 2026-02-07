<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'

interface Props {
  speed?: number
  runAwayDistance?: number
}

const props = withDefaults(defineProps<Props>(), {
  speed: 1,
  runAwayDistance: 150,
})

const elementRef = ref<HTMLElement>()
const isRunning = ref(false)

const handleMouseMove = (e: MouseEvent) => {
  if (!elementRef.value || isRunning.value) return

  const rect = elementRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const distanceX = e.clientX - centerX
  const distanceY = e.clientY - centerY
  const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

  if (distance < props.runAwayDistance) {
    isRunning.value = true
    
    const angle = Math.atan2(distanceY, distanceX)
    const runX = Math.cos(angle) * props.runAwayDistance * 1.5
    const runY = Math.sin(angle) * props.runAwayDistance * 1.5

    gsap.to(elementRef.value, {
      x: runX,
      y: runY,
      rotation: Math.random() * 360,
      duration: 0.5 * props.speed,
      ease: 'power2.out',
      onComplete: () => {
        // Return to original position after a delay
        setTimeout(() => {
          gsap.to(elementRef.value, {
            x: 0,
            y: 0,
            rotation: 0,
            duration: 0.8,
            ease: 'elastic.out(1, 0.5)',
            onComplete: () => {
              isRunning.value = false
            },
          })
        }, 1000)
      },
    })
  }
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <div
    ref="elementRef"
    :class="cn(
      'inline-block',
      'cursor-pointer',
    )"
  >
    <slot />
  </div>
</template>
