<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, ArrowsRightLeftIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'
import { diffWords, diffLines } from 'diff'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const textA = ref('')
const textB = ref('')
const diffMode = ref<'lines' | 'words'>('lines')

const diffResult = computed((): { value: string; added?: boolean; removed?: boolean }[] | null => {
  const a = textA.value
  const b = textB.value
  if (!a && !b) return null
  const fn = diffMode.value === 'lines' ? diffLines : diffWords
  const out = (fn as (a: string, b: string) => { value: string; added?: boolean; removed?: boolean }[])(a, b)
  return out ?? null
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
          'focus:outline-none focus:ring-2 focus:ring-mint/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Diff Checker
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Compare two texts and see the differences line-by-line or word-by-word.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-6">
          <ArrowsRightLeftIcon class="w-5 h-5 text-mint" />
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Diff</h2>
        </div>
        <div class="flex gap-2 mb-4">
          <button
            @click="diffMode = 'lines'"
            :class="cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              diffMode === 'lines' ? 'bg-mint/20 text-mint ring-1 ring-mint/30' : 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400',
            )"
          >
            By lines
          </button>
          <button
            @click="diffMode = 'words'"
            :class="cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              diffMode === 'words' ? 'bg-mint/20 text-mint ring-1 ring-mint/30' : 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400',
            )"
          >
            By words
          </button>
        </div>
        <div class="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label for="diff-a" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Original</label>
            <textarea
              id="diff-a"
              v-model="textA"
              rows="8"
              placeholder="First text..."
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm resize-none',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-mint/50',
                'transition-all duration-200',
              )"
            />
          </div>
          <div>
            <label for="diff-b" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modified</label>
            <textarea
              id="diff-b"
              v-model="textB"
              rows="8"
              placeholder="Second text..."
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm resize-none',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-mint/50',
                'transition-all duration-200',
              )"
            />
          </div>
        </div>
        <div v-if="diffResult && diffResult.length > 0" class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Diff result</label>
          <div
            :class="cn(
              'p-4 rounded-lg font-mono text-sm overflow-x-auto',
              'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
              'text-gray-800 dark:text-gray-200',
            )"
          >
            <div
              v-for="(part, i) in diffResult"
              :key="i"
              :class="cn(
                'inline',
                part.added && 'bg-green-500/30 dark:bg-green-500/20',
                part.removed && 'bg-red-500/30 dark:bg-red-500/20',
              )"
            >
              {{ part.value }}
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
