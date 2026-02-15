<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, SwatchIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const input = ref('#3b82f6')
const error = ref('')

const parseHex = (s: string): { r: number; g: number; b: number } | null => {
  const m = s.trim().replace(/^#/, '').match(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!m || !m[1]) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

const result = computed(() => {
  error.value = ''
  const rgb = parseHex(input.value)
  if (!rgb) {
    error.value = 'Invalid hex (e.g. #3b82f6 or 3b82f6)'
    return null
  }
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return {
    hex: '#' + [rgb.r, rgb.g, rgb.b].map((x) => x.toString(16).padStart(2, '0')).join('').toLowerCase(),
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    rgbObj: rgb,
  }
})

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    success('Copied to clipboard')
  } catch {
    success('Copied to clipboard')
  }
}

const goBack = () => router.push('/developer-tools')

onMounted(() => {
  gsap.fromTo('.page-header', { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: premiumEase })
  gsap.fromTo('.tool-card', { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, delay: 0.1, ease: premiumEase })
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-4xl mx-auto">
      <button
        @click="goBack"
        :class="cn(
          'flex items-center gap-2 mb-8 text-sm text-gray-600 dark:text-gray-400',
          'hover:text-gray-800 dark:hover:text-white transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-coral/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Color Converter
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Convert colors between hex, RGB, and HSL. Enter a hex color to see all formats.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-6">
          <SwatchIcon class="w-5 h-5 text-coral" />
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Converter</h2>
        </div>
        <div class="space-y-4">
          <div>
            <label for="color-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hex color</label>
            <div class="flex gap-2 items-center">
              <input
                id="color-input"
                v-model="input"
                type="text"
                placeholder="#3b82f6"
                :class="cn(
                  'flex-1 px-4 py-3 rounded-lg border font-mono text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-coral/50',
                  'transition-all duration-200',
                )"
              />
              <div
                v-if="result"
                class="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600 shrink-0"
                :style="{ backgroundColor: result.hex }"
              />
            </div>
            <p v-if="error" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
          </div>
          <div v-if="result" class="space-y-3">
            <div
              v-for="(val, key) in { hex: result.hex, rgb: result.rgb, hsl: result.hsl }"
              :key="key"
              :class="cn(
                'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200',
              )"
            >
              <span class="w-12 shrink-0 font-medium text-gray-600 dark:text-gray-400 uppercase">{{ key }}</span>
              <span class="flex-1 break-all">{{ val }}</span>
              <button
                @click="copyToClipboard(val)"
                :aria-label="`Copy ${key}`"
                :class="cn(
                  'p-2 rounded-lg shrink-0 hover:bg-coral/20 transition-all duration-200',
                  'transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-coral/50',
                )"
              >
                <ClipboardDocumentIcon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-card {
  transform-origin: center center;
}
</style>
