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
const reverseMode = ref(false)

const numberToBinary = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) return null
  const num = parseInt(trimmed, 10)
  if (isNaN(num) || num < 0 || !Number.isInteger(Number(trimmed))) return null
  return num.toString(2)
}

const binaryToNumber = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (!/^[01]+$/.test(trimmed)) return null
  return parseInt(trimmed, 2).toString(10)
}

const binaryResult = computed(() => {
  if (!numberInput.value.trim()) return null
  numberError.value = ''
  if (reverseMode.value) {
    const result = binaryToNumber(numberInput.value)
    if (result === null) {
      numberError.value = 'Invalid binary (enter 0s and 1s only, e.g. 101010)'
      return null
    }
    return { type: 'decimal' as const, value: result }
  } else {
    const result = numberToBinary(numberInput.value)
    if (result === null) {
      numberError.value = 'Invalid number (enter a non-negative integer, e.g. 42)'
      return null
    }
    return { type: 'binary' as const, value: result }
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
          'focus:outline-none focus:ring-2 focus:ring-peach/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <!-- Header -->
      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Number ↔ Binary
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Convert between decimal numbers and binary notation.
        </p>
      </div>

      <!-- Tool -->
      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <ArrowPathIcon class="w-5 h-5 text-peach" />
          Converter
        </h2>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <button
              type="button"
              :class="cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                !reverseMode && 'bg-peach/20 text-peach ring-1 ring-peach/30',
                reverseMode && 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
              )"
              @click="reverseMode = false"
            >
              Decimal → Binary
            </button>
            <button
              type="button"
              :class="cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                reverseMode && 'bg-peach/20 text-peach ring-1 ring-peach/30',
                !reverseMode && 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
              )"
              @click="reverseMode = true"
            >
              Binary → Decimal
            </button>
          </div>
          <div>
            <label :for="reverseMode ? 'binary-input' : 'number-input'" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ reverseMode ? 'Binary (0s and 1s)' : 'Number (decimal)' }}
            </label>
            <input
              :id="reverseMode ? 'binary-input' : 'number-input'"
              v-model="numberInput"
              type="text"
              :placeholder="reverseMode ? '101010' : '42'"
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-peach/50',
                'transition-all duration-200',
              )"
            />
            <p v-if="numberError" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ numberError }}</p>
          </div>
          <div v-if="binaryResult" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ binaryResult.type === 'binary' ? 'Binary Result' : 'Decimal Result' }}
            </label>
            <div
              :class="cn(
                'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200',
              )"
            >
              <span class="flex-1 break-all">{{ binaryResult.value }}</span>
              <button
                @click="copyToClipboard(binaryResult.value)"
                aria-label="Copy to clipboard"
                :class="cn(
                  'p-2 rounded-lg shrink-0',
                  'hover:bg-peach/20 dark:hover:bg-peach/20',
                  'transition-all duration-200 transform hover:scale-105 active:scale-95',
                  'focus:outline-none focus:ring-2 focus:ring-peach/50',
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
