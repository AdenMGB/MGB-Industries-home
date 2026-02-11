<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, ClockIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const mode = ref<'toDate' | 'toTimestamp'>('toDate')
const input = ref('')
const error = ref('')

const result = computed(() => {
  error.value = ''
  const text = input.value.trim()
  if (!text) return null
  try {
    if (mode.value === 'toDate') {
      const ts = text.includes('.') ? parseFloat(text) : parseInt(text, 10)
      if (isNaN(ts)) throw new Error('Invalid number')
      const ms = ts < 1e12 ? ts * 1000 : ts
      const date = new Date(ms)
      if (isNaN(date.getTime())) throw new Error('Invalid timestamp')
      return date.toISOString()
    } else {
      const date = new Date(text)
      if (isNaN(date.getTime())) throw new Error('Invalid date')
      return Math.floor(date.getTime() / 1000).toString()
    }
  } catch (e) {
    error.value = mode.value === 'toDate' ? 'Invalid Unix timestamp' : 'Invalid date string'
    return null
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
  input.value = Math.floor(Date.now() / 1000).toString()
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
          'focus:outline-none focus:ring-2 focus:ring-peach/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Unix Timestamp
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Convert between Unix timestamp (seconds since 1970) and human-readable date.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-6">
          <ClockIcon class="w-5 h-5 text-peach" />
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Converter</h2>
        </div>
        <div class="flex gap-2 mb-4">
          <button
            @click="mode = 'toDate'"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'toDate' ? 'bg-peach/30 text-gray-800 dark:text-white' : 'bg-white/40 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-600/60',
            )"
          >
            Timestamp → Date
          </button>
          <button
            @click="mode = 'toTimestamp'"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'toTimestamp' ? 'bg-peach/30 text-gray-800 dark:text-white' : 'bg-white/40 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-600/60',
            )"
          >
            Date → Timestamp
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label for="ts-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ mode === 'toDate' ? 'Unix timestamp (seconds)' : 'Date string (e.g. ISO 8601)' }}
            </label>
            <input
              id="ts-input"
              v-model="input"
              type="text"
              :placeholder="mode === 'toDate' ? '1699564800' : '2024-11-09T12:00:00.000Z'"
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-peach/50',
                'transition-all duration-200',
              )"
            />
            <p v-if="error" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
          </div>
          <div v-if="result" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Result</label>
            <div
              :class="cn(
                'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200',
              )"
            >
              <span class="flex-1 break-all">{{ result }}</span>
              <button
                @click="copyToClipboard(result)"
                aria-label="Copy to clipboard"
                :class="cn(
                  'p-2 rounded-lg shrink-0 hover:bg-peach/20 transition-all duration-200',
                  'transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-peach/50',
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
