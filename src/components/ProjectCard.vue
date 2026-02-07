<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMouse } from '@/composables/useMouse'
import { useTheme } from '@/composables/useTheme'
import { cn } from '@/utils/cn'

interface Props {
  title: string
  description: string
  tags: string[]
  href?: string
  image?: string
  featured?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  featured: false,
})

const { mouseX, mouseY } = useMouse()
const { themeMode } = useTheme()

const cardRef = ref<HTMLElement>()
const spotlightX = ref(50)
const spotlightY = ref(50)
const tiltX = ref(0)
const tiltY = ref(0)

const updateSpotlight = () => {
  if (!cardRef.value) return

  const rect = cardRef.value.getBoundingClientRect()
  const x = ((mouseX.value - rect.left) / rect.width) * 100
  const y = ((mouseY.value - rect.top) / rect.height) * 100

  spotlightX.value = Math.max(0, Math.min(100, x))
  spotlightY.value = Math.max(0, Math.min(100, y))

  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  tiltX.value = ((mouseX.value - centerX) / rect.width) * 10
  tiltY.value = ((mouseY.value - centerY) / rect.height) * 10
}

onMounted(() => {
  window.addEventListener('mousemove', updateSpotlight)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', updateSpotlight)
})

const spotlightStyle = computed(() => ({
  background: `radial-gradient(circle at ${spotlightX.value}% ${spotlightY.value}%, rgba(139, 92, 246, 0.3) 0%, transparent 70%)`,
}))

const tiltStyle = computed(() => ({
  transform: `perspective(1000px) rotateX(${-tiltY.value}deg) rotateY(${tiltX.value}deg) scale3d(1.02, 1.02, 1.02)`,
}))
</script>

<template>
  <a
    v-if="href"
    :href="href"
    ref="cardRef"
    :class="cn(
      'group relative block h-full',
      'backdrop-blur-xl bg-white/5 border border-white/10',
      'rounded-2xl p-6 overflow-hidden',
      'transition-all duration-300',
      'hover:border-white/20 hover:shadow-2xl',
      'transform-gpu',
      themeMode === 'hacker' && 'bg-black/60 border-green-500/20 hover:border-green-500/40',
      featured && 'md:col-span-2 md:row-span-2',
    )"
    :style="tiltStyle"
    target="_blank"
    rel="noopener noreferrer"
  >
    <div
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      :style="spotlightStyle"
    />
    <div class="relative z-10 h-full flex flex-col">
      <h3
        :class="cn(
          'text-2xl font-bold mb-2 text-white',
          themeMode === 'hacker' && 'text-green-400 font-mono',
        )"
      >
        {{ title }}
      </h3>
      <p
        :class="cn(
          'text-white/70 mb-4 flex-1',
          themeMode === 'hacker' && 'text-green-300/80 font-mono text-sm',
        )"
      >
        {{ description }}
      </p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="tag in tags"
          :key="tag"
          :class="cn(
            'px-3 py-1 text-xs font-medium rounded-full',
            'bg-white/10 text-white/80 backdrop-blur-sm',
            themeMode === 'hacker' && 'bg-green-500/20 text-green-300',
          )"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </a>
  <div
    v-else
    ref="cardRef"
    :class="cn(
      'group relative block h-full',
      'backdrop-blur-xl bg-white/5 border border-white/10',
      'rounded-2xl p-6 overflow-hidden',
      'transition-all duration-300',
      'hover:border-white/20 hover:shadow-2xl',
      'transform-gpu',
      themeMode === 'hacker' && 'bg-black/60 border-green-500/20 hover:border-green-500/40',
      featured && 'md:col-span-2 md:row-span-2',
    )"
    :style="tiltStyle"
  >
    <div
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      :style="spotlightStyle"
    />
    <div class="relative z-10 h-full flex flex-col">
      <h3
        :class="cn(
          'text-2xl font-bold mb-2 text-white',
          themeMode === 'hacker' && 'text-green-400 font-mono',
        )"
      >
        {{ title }}
      </h3>
      <p
        :class="cn(
          'text-white/70 mb-4 flex-1',
          themeMode === 'hacker' && 'text-green-300/80 font-mono text-sm',
        )"
      >
        {{ description }}
      </p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="tag in tags"
          :key="tag"
          :class="cn(
            'px-3 py-1 text-xs font-medium rounded-full',
            'bg-white/10 text-white/80 backdrop-blur-sm',
            themeMode === 'hacker' && 'bg-green-500/20 text-green-300',
          )"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>
