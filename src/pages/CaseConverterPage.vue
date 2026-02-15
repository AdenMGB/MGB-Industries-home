<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, ArrowsRightLeftIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const input = ref('')

const toCamel = (s: string) =>
  s
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toLowerCase())

const toPascal = (s: string) =>
  s
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toUpperCase())

const toSnake = (s: string) =>
  s
    .replace(/([A-Z])/g, '_$1')
    .replace(/[- ]/g, '_')
    .toLowerCase()
    .replace(/^_/, '')

const toKebab = (s: string) =>
  s
    .replace(/([A-Z])/g, '-$1')
    .replace(/[_\s]/g, '-')
    .toLowerCase()
    .replace(/^-/, '')

const toUpperSnake = (s: string) => toSnake(s).toUpperCase()

const toTitle = (s: string) =>
  s
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

const results = computed(() => {
  const text = input.value.trim()
  if (!text) return null
  return {
    camelCase: toCamel(text),
    PascalCase: toPascal(text),
    snake_case: toSnake(text),
    'kebab-case': toKebab(text),
    UPPER_SNAKE: toUpperSnake(text),
    'Title Case': toTitle(text),
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
          'focus:outline-none focus:ring-2 focus:ring-warm-pink/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Case Converter
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Convert text between camelCase, snake_case, kebab-case, and more.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-6">
          <ArrowsRightLeftIcon class="w-5 h-5 text-warm-pink" />
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Converter</h2>
        </div>
        <div class="space-y-4">
          <div>
            <label for="case-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Text</label>
            <textarea
              id="case-input"
              v-model="input"
              rows="3"
              placeholder="hello world or helloWorld or hello_world"
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm resize-none',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-warm-pink/50',
                'transition-all duration-200',
              )"
            />
          </div>
          <div v-if="results" class="space-y-3">
            <div
              v-for="(value, key) in results"
              :key="key"
              :class="cn(
                'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200',
              )"
            >
              <span class="w-28 shrink-0 text-gray-500 dark:text-gray-400 text-xs">{{ key }}</span>
              <span class="flex-1 break-all">{{ value }}</span>
              <button
                @click="copyToClipboard(value)"
                :aria-label="`Copy ${key}`"
                :class="cn(
                  'p-2 rounded-lg shrink-0 hover:bg-warm-pink/20 transition-all duration-200',
                  'transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-warm-pink/50',
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
