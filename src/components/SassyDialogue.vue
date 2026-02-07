<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { gsap } from 'gsap'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { SparklesIcon } from '@heroicons/vue/24/solid'
import { cn } from '@/utils/cn'

interface Props {
  message: string
  show?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  position: 'top',
})

const isVisible = ref(props.show)
const dialogueRef = ref<HTMLElement>()

const positionClasses = computed(() => {
  const positions = {
    top: 'bottom-full mb-4 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-4 left-1/2 -translate-x-1/2',
    left: 'right-full mr-4 top-1/2 -translate-y-1/2',
    right: 'left-full ml-4 top-1/2 -translate-y-1/2',
  }
  return positions[props.position]
})

const sassyMessages = [
  "Oh, you found me!",
  "Nice try, but I'm not that easy!",
  "You're persistent, I'll give you that",
  "Okay fine, you win this round",
  "Stop poking me!",
  "I'm not a button, I'm a work of art!",
  "You again? Really?",
  "I see you",
  "Plot twist: I was watching you the whole time",
  "Congratulations! You found the secret dialogue!",
]

const randomMessage = ref(
  sassyMessages[Math.floor(Math.random() * sassyMessages.length)]
)

watch(() => props.show, (newVal) => {
  if (newVal) {
    isVisible.value = true
    if (dialogueRef.value) {
      gsap.fromTo(dialogueRef.value,
        { scale: 0, opacity: 0, y: 10 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }
      )
    }
  } else {
    if (dialogueRef.value) {
      gsap.to(dialogueRef.value, {
        scale: 0,
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          isVisible.value = false
        },
      })
    }
  }
}, { immediate: true })
</script>

<template>
  <Transition>
    <div
      v-if="isVisible"
      ref="dialogueRef"
      :class="cn(
        'absolute z-50 px-4 py-3 rounded-2xl shadow-xl',
        'bg-peach',
        'border-2 border-white/30',
        'backdrop-blur-sm',
        positionClasses,
        'min-w-[200px] max-w-[300px]',
      )"
    >
      <div class="flex items-start gap-2">
        <SparklesIcon class="w-5 h-5 text-white flex-shrink-0 mt-0.5 animate-pulse-slow" />
        <p class="text-white font-medium text-sm leading-relaxed flex-1">
          {{ message || randomMessage }}
        </p>
        <button
          @click="isVisible = false"
          class="flex-shrink-0 text-white/80 hover:text-white transition-colors"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
      <!-- Speech bubble tail -->
      <div
        :class="cn(
          'absolute w-0 h-0',
          props.position === 'top' && 'top-full left-1/2 -translate-x-1/2 border-t-8 border-t-peach border-l-8 border-l-transparent border-r-8 border-r-transparent',
          props.position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 border-b-8 border-b-peach border-l-8 border-l-transparent border-r-8 border-r-transparent',
        )"
      />
    </div>
  </Transition>
</template>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.2s;
}
</style>
