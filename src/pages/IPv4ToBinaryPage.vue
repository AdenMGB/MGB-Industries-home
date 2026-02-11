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

const ipv4Input = ref('')
const ipv4Error = ref('')

const ipv4ToBinary = (ip: string): string | null => {
  const octets = ip.trim().split('.')
  if (octets.length !== 4) return null
  const parts: string[] = []
  for (const octet of octets) {
    const num = parseInt(octet, 10)
    if (isNaN(num) || num < 0 || num > 255) return null
    parts.push(num.toString(2).padStart(8, '0'))
  }
  return parts.join('.')
}

const ipv4BinaryResult = computed(() => {
  if (!ipv4Input.value.trim()) return null
  ipv4Error.value = ''
  const result = ipv4ToBinary(ipv4Input.value)
  if (result === null) {
    ipv4Error.value = 'Invalid IPv4 address (e.g. 192.168.1.1)'
    return null
  }
  return result
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
          IPv4 to Binary
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Convert IPv4 addresses to 8-bit binary notation for each octet.
        </p>
      </div>

      <!-- Tool -->
      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <ArrowPathIcon class="w-5 h-5 text-peach" />
          Converter
        </h2>
        <div class="space-y-4">
          <div>
            <label for="ipv4-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IPv4 Address</label>
            <input
              id="ipv4-input"
              v-model="ipv4Input"
              type="text"
              placeholder="192.168.1.1"
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-peach/50',
                'transition-all duration-200',
              )"
            />
            <p v-if="ipv4Error" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ ipv4Error }}</p>
          </div>
          <div v-if="ipv4BinaryResult" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Binary Result</label>
            <div
              :class="cn(
                'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200',
              )"
            >
              <span class="flex-1 break-all">{{ ipv4BinaryResult }}</span>
              <button
                @click="copyToClipboard(ipv4BinaryResult)"
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
