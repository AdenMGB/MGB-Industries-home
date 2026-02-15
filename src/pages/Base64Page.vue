<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, DocumentDuplicateIcon, ArrowLeftIcon, DocumentArrowUpIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const mode = ref<'encode' | 'decode'>('encode')
const input = ref('')
const error = ref('')
const inputSource = ref<'text' | 'file'>('text')
const fileName = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const result = computed(() => {
  error.value = ''
  const text = input.value
  if (!text.trim()) return null
  try {
    if (mode.value === 'encode') {
      if (inputSource.value === 'file') return text
      return btoa(unescape(encodeURIComponent(text)))
    } else {
      return decodeURIComponent(escape(atob(text)))
    }
  } catch (e) {
    error.value = mode.value === 'decode' ? 'Invalid Base64 string' : 'Encoding failed'
    return null
  }
})

const processFile = async (file: File) => {
  inputSource.value = 'file'
  fileName.value = file.name
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0)
  }
  input.value = btoa(binary)
}

const onFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) await processFile(file)
  ;(e.target as HTMLInputElement).value = ''
}

const onDrop = async (e: DragEvent) => {
  const file = e.dataTransfer?.files?.[0]
  if (file) await processFile(file)
}

const switchToText = () => {
  inputSource.value = 'text'
  fileName.value = ''
  input.value = ''
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
          'focus:outline-none focus:ring-2 focus:ring-mint/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Base64 Encode / Decode
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Encode text to Base64 or decode Base64 strings back to text.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-6">
          <DocumentDuplicateIcon class="w-5 h-5 text-mint" />
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Converter</h2>
        </div>
        <div class="flex gap-2 mb-4">
          <button
            @click="mode = 'encode'"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'encode' ? 'bg-mint/30 text-gray-800 dark:text-white' : 'bg-white/40 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-600/60',
            )"
          >
            Encode
          </button>
          <button
            @click="mode = 'decode'"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'decode' ? 'bg-mint/30 text-gray-800 dark:text-white' : 'bg-white/40 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-600/60',
            )"
          >
            Decode
          </button>
        </div>
        <div class="space-y-4">
          <div v-if="mode === 'encode'" class="flex gap-2">
            <button
              type="button"
              :class="cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                inputSource === 'text' && 'bg-mint/20 text-mint ring-1 ring-mint/30',
                inputSource === 'file' && 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
              )"
              @click="inputSource = 'text'; switchToText()"
            >
              Text
            </button>
            <button
              type="button"
              :class="cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                inputSource === 'file' && 'bg-mint/20 text-mint ring-1 ring-mint/30',
                inputSource === 'text' && 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
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
          <div>
            <label for="base64-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ mode === 'encode' ? (inputSource === 'file' ? 'File (drop or click)' : 'Text to encode') : 'Base64 to decode' }}
            </label>
            <div
              v-if="mode === 'encode' && inputSource === 'file'"
              class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-mint/50 transition-colors duration-200"
              @click="fileInputRef?.click()"
              @dragover.prevent
              @drop.prevent="onDrop"
            >
              <DocumentArrowUpIcon class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p class="text-sm text-gray-600 dark:text-gray-400">Drop file here or click to browse</p>
              <p v-if="fileName" class="mt-1 text-mint font-medium">{{ fileName }}</p>
            </div>
            <textarea
              v-else
              id="base64-input"
              v-model="input"
              rows="4"
              placeholder="Enter text..."
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm resize-none',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-mint/50',
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
              <span class="flex-1 break-all whitespace-pre-wrap">{{ result }}</span>
              <button
                @click="copyToClipboard(result)"
                aria-label="Copy to clipboard"
                :class="cn(
                  'p-2 rounded-lg shrink-0 hover:bg-mint/20 transition-all duration-200',
                  'transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-mint/50',
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
