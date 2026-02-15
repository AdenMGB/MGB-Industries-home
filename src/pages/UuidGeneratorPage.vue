<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, HashtagIcon, ArrowLeftIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const uuids = ref<string[]>([])
const count = ref(1)

const generateUUID = (): string => {
  return crypto.randomUUID()
}

const generateNew = () => {
  const newUuids = Array.from({ length: count.value }, () => generateUUID())
  uuids.value = [...newUuids, ...uuids.value]
}

const copyAll = async () => {
  const text = uuids.value.join('\n')
  try {
    await navigator.clipboard.writeText(text)
    success('Copied all to clipboard')
  } catch {
    success('Copied all to clipboard')
  }
}

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
  uuids.value = [generateUUID()]
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
          UUID Generator
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Generate random UUIDs (v4). Each UUID is 128-bit and cryptographically random.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-2">
            <HashtagIcon class="w-5 h-5 text-warm-pink" />
            <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Generator</h2>
          </div>
          <div class="flex items-center gap-2">
            <select
              v-model.number="count"
              :class="cn(
                'px-3 py-2 rounded-lg text-sm border',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-warm-pink/50',
              )"
            >
              <option :value="1">1</option>
              <option :value="5">5</option>
              <option :value="10">10</option>
            </select>
            <button
              @click="generateNew"
              :class="cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-warm-pink/30 hover:bg-warm-pink/40 text-gray-800 dark:text-white',
                'transition-all duration-200 transform hover:scale-105 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-warm-pink/50',
              )"
            >
              <PlusIcon class="w-4 h-4" />
              Generate
            </button>
            <button
              v-if="uuids.length > 1"
              @click="copyAll"
              :class="cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-gray-200/50 dark:bg-gray-600/50 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
                'text-gray-800 dark:text-gray-200 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-warm-pink/50',
              )"
            >
              Copy all
            </button>
          </div>
        </div>
        <div class="space-y-3">
          <div
            v-for="(uuid, i) in uuids"
            :key="i"
            :class="cn(
              'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
              'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
              'text-gray-800 dark:text-gray-200',
            )"
          >
            <span class="flex-1 break-all">{{ uuid }}</span>
            <button
              @click="copyToClipboard(uuid)"
              :aria-label="'Copy UUID'"
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
</template>

<style scoped>
.tool-card {
  transform-origin: center center;
}
</style>
