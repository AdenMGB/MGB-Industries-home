<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, ArrowPathIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const numberInput = ref('')
const numberError = ref('')

const parseNumber = (input: string): number | null => {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase().startsWith('0x')) {
    const num = parseInt(trimmed, 16)
    if (isNaN(num)) return null
    return num
  }
  if (trimmed.toLowerCase().startsWith('0o')) {
    const num = parseInt(trimmed.slice(2), 8)
    if (isNaN(num)) return null
    return num
  }
  if (trimmed.startsWith('0b')) {
    const num = parseInt(trimmed.slice(2), 2)
    if (isNaN(num)) return null
    return num
  }
  const num = parseInt(trimmed, 10)
  if (isNaN(num) || !Number.isInteger(Number(trimmed))) return null
  return num
}

const numberHexResult = computed(() => {
  if (!numberInput.value.trim()) return null
  numberError.value = ''
  const num = parseNumber(numberInput.value)
  if (num === null) {
    numberError.value = 'Invalid number (decimal, 0xff, 0o377, or 0b11111111)'
    return null
  }
  return {
    decimal: num.toString(10),
    hex: num.toString(16).toLowerCase(),
    hexWithPrefix: '0x' + num.toString(16).toLowerCase(),
    octal: '0o' + num.toString(8),
    binary: num.toString(2),
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
      <!-- Back link -->
      <button
        @click="goBack"
        :class="cn(
          'flex items-center gap-2 mb-8 text-sm text-gray-600 dark:text-gray-400',
          'hover:text-gray-800 dark:hover:text-white transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-lavender/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <!-- Header -->
      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Number to Hex & Decimal
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Convert numbers between decimal, hex, octal, and binary.
        </p>
      </div>

      <!-- Tool -->
      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <ArrowPathIcon class="w-5 h-5 text-lavender" />
          Converter
        </h2>
        <div class="space-y-4">
          <div>
            <label for="number-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number (decimal, 0xff, 0o377, 0b11111111)</label>
            <input
              id="number-input"
              v-model="numberInput"
              type="text"
              placeholder="255 or 0xff or 0o377"
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-lavender/50',
                'transition-all duration-200',
              )"
            />
            <p v-if="numberError" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ numberError }}</p>
          </div>
          <div v-if="numberHexResult" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Decimal</label>
              <div
                :class="cn(
                  'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200',
                )"
              >
                <span class="flex-1 break-all">{{ numberHexResult.decimal }}</span>
                <button
                  @click="copyToClipboard(numberHexResult.decimal)"
                  aria-label="Copy to clipboard"
                  :class="cn(
                    'p-2 rounded-lg shrink-0',
                    'hover:bg-lavender/20 dark:hover:bg-lavender/20',
                    'transition-all duration-200 transform hover:scale-105 active:scale-95',
                    'focus:outline-none focus:ring-2 focus:ring-lavender/50',
                  )"
                >
                  <ClipboardDocumentIcon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hexadecimal</label>
              <div
                :class="cn(
                  'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200',
                )"
              >
                <span class="flex-1 break-all">{{ numberHexResult.hexWithPrefix }}</span>
                <button
                  @click="copyToClipboard(numberHexResult.hexWithPrefix)"
                  aria-label="Copy to clipboard"
                  :class="cn(
                    'p-2 rounded-lg shrink-0',
                    'hover:bg-lavender/20 dark:hover:bg-lavender/20',
                    'transition-all duration-200 transform hover:scale-105 active:scale-95',
                    'focus:outline-none focus:ring-2 focus:ring-lavender/50',
                  )"
                >
                  <ClipboardDocumentIcon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Octal</label>
              <div
                :class="cn(
                  'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200',
                )"
              >
                <span class="flex-1 break-all">{{ numberHexResult.octal }}</span>
                <button
                  @click="copyToClipboard(numberHexResult.octal)"
                  aria-label="Copy octal"
                  :class="cn(
                    'p-2 rounded-lg shrink-0',
                    'hover:bg-lavender/20 dark:hover:bg-lavender/20',
                    'transition-all duration-200 transform hover:scale-105 active:scale-95',
                    'focus:outline-none focus:ring-2 focus:ring-lavender/50',
                  )"
                >
                  <ClipboardDocumentIcon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Binary</label>
              <div
                :class="cn(
                  'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200',
                )"
              >
                <span class="flex-1 break-all">{{ numberHexResult.binary }}</span>
                <button
                  @click="copyToClipboard(numberHexResult.binary)"
                  aria-label="Copy binary"
                  :class="cn(
                    'p-2 rounded-lg shrink-0',
                    'hover:bg-lavender/20 dark:hover:bg-lavender/20',
                    'transition-all duration-200 transform hover:scale-105 active:scale-95',
                    'focus:outline-none focus:ring-2 focus:ring-lavender/50',
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
  </div>
</template>

<style scoped>
.tool-card {
  transform-origin: center center;
}
</style>
