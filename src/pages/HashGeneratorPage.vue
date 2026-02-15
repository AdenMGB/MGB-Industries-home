<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, ArrowPathIcon, ArrowLeftIcon, DocumentArrowUpIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'
import { md5, sha1, sha256, sha384, sha512 } from 'hash-wasm'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const input = ref('')
const inputMode = ref<'text' | 'file'>('text')
const fileName = ref('')
const hashes = ref<Record<string, string>>({})
const loading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const hashAlgos = [
  { key: 'MD5', fn: md5 },
  { key: 'SHA-1', fn: sha1 },
  { key: 'SHA-256', fn: sha256 },
  { key: 'SHA-384', fn: sha384 },
  { key: 'SHA-512', fn: sha512 },
] as const

const computeHashes = async (data: string | ArrayBuffer) => {
  loading.value = true
  const results: Record<string, string> = {}
  try {
    for (const { key, fn } of hashAlgos) {
      results[key] = await fn(data)
    }
    hashes.value = results
  } catch (e) {
    hashes.value = {}
  } finally {
    loading.value = false
  }
}

watch(input, async (val) => {
  if (inputMode.value === 'text' && val.trim()) {
    await computeHashes(val)
  } else if (inputMode.value === 'text' && !val.trim()) {
    hashes.value = {}
  }
})

const onFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  inputMode.value = 'file'
  fileName.value = file.name
  const buf = await file.arrayBuffer()
  await computeHashes(buf)
  target.value = ''
}

const switchToText = () => {
  inputMode.value = 'text'
  fileName.value = ''
  input.value = ''
  hashes.value = {}
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
          Hash Generator
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes from text or files.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-6">
          <ArrowPathIcon class="w-5 h-5 text-coral" />
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Generator</h2>
        </div>
        <div class="space-y-4">
          <div class="flex gap-2">
            <button
              type="button"
              :class="cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                inputMode === 'text' && 'bg-coral/20 text-coral ring-1 ring-coral/30',
                inputMode === 'file' && 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
              )"
              @click="inputMode = 'text'; switchToText()"
            >
              Text
            </button>
            <button
              type="button"
              :class="cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                inputMode === 'file' && 'bg-coral/20 text-coral ring-1 ring-coral/30',
                inputMode === 'text' && 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
              )"
              @click="fileInputRef?.click()"
            >
              File
            </button>
            <input
              ref="fileInputRef"
              type="file"
              class="hidden"
              @change="onFileChange"
            />
          </div>
          <div v-if="inputMode === 'text'">
            <label for="hash-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Text to hash</label>
            <textarea
              id="hash-input"
              v-model="input"
              rows="4"
              placeholder="Enter text..."
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm resize-none',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-coral/50',
                'transition-all duration-200',
              )"
            />
          </div>
          <div v-else-if="fileName" class="flex items-center gap-2 p-4 rounded-lg bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50">
            <DocumentArrowUpIcon class="w-5 h-5 text-coral shrink-0" />
            <span class="text-gray-800 dark:text-gray-200">{{ fileName }}</span>
          </div>
          <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Computing hashes...</div>
          <div v-else-if="Object.keys(hashes).length" class="space-y-3">
            <div
              v-for="(hash, algo) in hashes"
              :key="algo"
              :class="cn(
                'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200',
              )"
            >
              <span class="w-20 shrink-0 font-medium text-gray-600 dark:text-gray-400">{{ algo }}</span>
              <span class="flex-1 break-all">{{ hash }}</span>
              <button
                @click="copyToClipboard(hash)"
                :aria-label="`Copy ${algo}`"
                :class="cn(
                  'p-2 rounded-lg shrink-0',
                  'hover:bg-coral/20 dark:hover:bg-coral/20',
                  'transition-all duration-200 transform hover:scale-105 active:scale-95',
                  'focus:outline-none focus:ring-2 focus:ring-coral/50',
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
