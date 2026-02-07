<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useMouse } from '@/composables/useMouse'
import { Github, Code, Mail, FileText, Terminal } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'
import { cn } from '@/utils/cn'

const { mouseX, mouseY } = useMouse()
const { toggleTheme, themeMode } = useTheme()

interface DockItem {
  icon: any
  label: string
  href?: string
  action?: () => void
}

const dockItems: DockItem[] = [
  { icon: Github, label: 'GitHub', href: 'https://github.com/AdenMGB' },
  { icon: Code, label: 'Projects', href: '#work' },
  { icon: FileText, label: 'About', href: '#about' },
  { icon: Mail, label: 'Contact', href: '#contact' },
  { icon: Terminal, label: 'Hacker Mode', action: toggleTheme },
]

const dockRef = ref<HTMLElement>()
const itemScales = ref<number[]>(dockItems.map(() => 1))

const updateScales = () => {
  if (!dockRef.value) return

  dockItems.forEach((_, index) => {
    const item = dockRef.value?.children[index] as HTMLElement
    if (!item) return

    const rect = item.getBoundingClientRect()
    const itemCenterX = rect.left + rect.width / 2
    const itemCenterY = rect.top + rect.height / 2

    const distance = Math.sqrt(
      Math.pow(mouseX.value - itemCenterX, 2) + Math.pow(mouseY.value - itemCenterY, 2),
    )

    const maxDistance = 150
    const scale = distance < maxDistance
      ? 1 + (1 - distance / maxDistance) * 0.5
      : 1

    itemScales.value[index] = scale
    item.style.transform = `scale(${scale})`
  })
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', updateScales)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', updateScales)
  }
})
</script>

<template>
  <nav
    ref="dockRef"
    :class="cn(
      'fixed bottom-8 left-1/2 -translate-x-1/2 z-50',
      'flex items-center gap-3 px-6 py-4',
      'backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl',
      'shadow-2xl',
      themeMode === 'hacker' && 'bg-black/80 border-green-500/30',
    )"
  >
    <div
      v-for="(item, index) in dockItems"
      :key="index"
      :class="cn(
        'relative group cursor-pointer transition-transform duration-300 ease-out',
        'active:scale-95',
      )"
      :style="{ transform: `scale(${itemScales[index]})` }"
    >
      <a
        v-if="item.href"
        :href="item.href"
        :class="cn(
          'flex items-center justify-center w-12 h-12',
          'rounded-xl backdrop-blur-sm',
          'bg-white/5 border border-white/10',
          'hover:bg-white/10 hover:border-white/20',
          'transition-all duration-200',
          themeMode === 'hacker' && 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
        )"
        @click="item.action?.()"
      >
        <component
          :is="item.icon"
          :class="cn(
            'w-6 h-6 text-white',
            themeMode === 'hacker' && 'text-green-400',
          )"
        />
      </a>
      <button
        v-else
        :class="cn(
          'flex items-center justify-center w-12 h-12',
          'rounded-xl backdrop-blur-sm',
          'bg-white/5 border border-white/10',
          'hover:bg-white/10 hover:border-white/20',
          'transition-all duration-200',
          themeMode === 'hacker' && 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
        )"
        @click="item.action?.()"
      >
        <component
          :is="item.icon"
          :class="cn(
            'w-6 h-6 text-white',
            themeMode === 'hacker' && 'text-green-400',
          )"
        />
      </button>
      <span
        :class="cn(
          'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
          'px-2 py-1 text-xs font-medium text-white',
          'bg-black/80 backdrop-blur-sm rounded',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'pointer-events-none whitespace-nowrap',
          themeMode === 'hacker' && 'bg-green-900/90 text-green-300',
        )"
      >
        {{ item.label }}
      </span>
    </div>
  </nav>
</template>
