<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, CodeBracketSquareIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const input = ref('')
const error = ref('')

const base64UrlDecode = (str: string): string => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad) base64 += '='.repeat(4 - pad)
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
  } catch {
    return ''
  }
}

const decoded = computed(() => {
  error.value = ''
  const trimmed = input.value.trim()
  if (!trimmed) return null
  const parts = trimmed.split('.')
  if (parts.length !== 3) {
    error.value = 'Invalid JWT format (expected header.payload.signature)'
    return null
  }
  try {
    const headerJson = base64UrlDecode(parts[0] ?? '')
    const payloadJson = base64UrlDecode(parts[1] ?? '')
    const header = JSON.parse(headerJson)
    const payload = JSON.parse(payloadJson)
    const headerPretty = JSON.stringify(header, null, 2)
    const payloadPretty = JSON.stringify(payload, null, 2)
    let expiryStatus: string | null = null
    if (typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp < now) {
        expiryStatus = 'Expired'
      } else {
        const secs = payload.exp - now
        expiryStatus = `Valid (expires in ${secs}s)`
      }
    }
    return { headerPretty, payloadPretty, expiryStatus }
  } catch (e) {
    error.value = 'Failed to decode JWT'
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
          'focus:outline-none focus:ring-2 focus:ring-soft-yellow/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          JWT Decoder
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Decode and inspect JWT tokens. View header, payload, and expiry status.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-6">
          <CodeBracketSquareIcon class="w-5 h-5 text-soft-yellow" />
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Decoder</h2>
        </div>
        <div class="space-y-4">
          <div>
            <label for="jwt-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">JWT Token</label>
            <textarea
              id="jwt-input"
              v-model="input"
              rows="4"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm resize-none',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-soft-yellow/50',
                'transition-all duration-200',
              )"
            />
            <p v-if="error" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
          </div>
          <div v-if="decoded" class="space-y-4">
            <div v-if="decoded.expiryStatus" class="flex items-center gap-2">
              <span
                :class="cn(
                  'text-sm font-medium px-2 py-1 rounded',
                  decoded.expiryStatus.startsWith('Expired')
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                    : 'bg-green-500/20 text-green-600 dark:text-green-400',
                )"
              >
                {{ decoded.expiryStatus }}
              </span>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Header</label>
              <div
                :class="cn(
                  'flex items-start gap-2 p-4 rounded-lg font-mono text-sm overflow-x-auto',
                  'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200',
                )"
              >
                <pre class="flex-1 min-w-0 whitespace-pre-wrap break-words">{{ decoded.headerPretty }}</pre>
                <button
                  @click="copyToClipboard(decoded.headerPretty)"
                  aria-label="Copy header"
                  :class="cn(
                    'p-2 rounded-lg shrink-0 hover:bg-soft-yellow/20 transition-all duration-200',
                    'transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-soft-yellow/50',
                  )"
                >
                  <ClipboardDocumentIcon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payload</label>
              <div
                :class="cn(
                  'flex items-start gap-2 p-4 rounded-lg font-mono text-sm overflow-x-auto',
                  'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200',
                )"
              >
                <pre class="flex-1 min-w-0 whitespace-pre-wrap break-words">{{ decoded.payloadPretty }}</pre>
                <button
                  @click="copyToClipboard(decoded.payloadPretty)"
                  aria-label="Copy payload"
                  :class="cn(
                    'p-2 rounded-lg shrink-0 hover:bg-soft-yellow/20 transition-all duration-200',
                    'transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-soft-yellow/50',
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
