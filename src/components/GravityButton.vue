<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import SassyDialogue from './SassyDialogue.vue'

interface Props {
  text?: string
  variant?: 'primary' | 'secondary' | 'danger'
}

const props = withDefaults(defineProps<Props>(), {
  text: 'Click Me!',
  variant: 'primary',
})

const buttonRef = ref<HTMLElement>()
const isHovered = ref(false)
const showDialogue = ref(false)
const clickCount = ref(0)

const variantClasses = {
  primary: 'bg-peach',
  secondary: 'bg-lavender',
  danger: 'bg-coral',
}

const handleMouseMove = (e: MouseEvent) => {
  if (!buttonRef.value || !isHovered.value) return

  const rect = buttonRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const distanceX = e.clientX - centerX
  const distanceY = e.clientY - centerY
  const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

  // If mouse is close, move button away
  if (distance < 100) {
    const angle = Math.atan2(distanceY, distanceX)
    const moveDistance = 100 - distance
    const moveX = Math.cos(angle) * moveDistance * 0.5
    const moveY = Math.sin(angle) * moveDistance * 0.5

    gsap.to(buttonRef.value, {
      x: moveX,
      y: moveY,
      duration: 0.3,
      ease: 'power2.out',
    })
  } else {
    // Return to center
    gsap.to(buttonRef.value, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.5)',
    })
  }
}

const handleClick = () => {
  clickCount.value++

  if (buttonRef.value) {
    // Bounce animation
    gsap.to(buttonRef.value, {
      scale: 0.9,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
    })

    // Show sassy dialogue on 3rd click
    if (clickCount.value === 3) {
      showDialogue.value = true
      setTimeout(() => {
        showDialogue.value = false
      }, 3000)
    }

    // Random position jump after 5 clicks
    if (clickCount.value >= 5) {
      const randomX = (Math.random() - 0.5) * 200
      const randomY = (Math.random() - 0.5) * 200

      gsap.to(buttonRef.value, {
        x: randomX,
        y: randomY,
        rotation: Math.random() * 360,
        duration: 0.5,
        ease: 'back.out(1.7)',
      })
    }
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
  <div class="relative inline-block">
    <button
      ref="buttonRef"
      @mouseenter="isHovered = true"
      @mouseleave="
        isHovered = false
        gsap.to(buttonRef, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
      "
      @click="handleClick"
      :class="
        cn(
          'relative px-8 py-4 rounded-2xl font-bold text-white',
          'shadow-lg transform transition-all duration-200',
          'hover:scale-105 active:scale-95',
          'border-2 border-white/30',
          variantClasses[variant],
        )
      "
    >
      <span class="relative z-10">{{ text }}</span>
      <div
        class="absolute inset-0 rounded-2xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-200"
      />
    </button>

    <SassyDialogue
      v-if="showDialogue"
      message="Okay fine, you caught me! But can you catch me 10 times? 😏"
      position="top"
    />
  </div>
</template>
