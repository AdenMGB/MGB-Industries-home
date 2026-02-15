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

const ipv6Input = ref('')
const ipv6Error = ref('')
const reverseMode = ref(false)

const ipv6ToHex = (ip: string): string | null => {
  const trimmed = ip.trim()
  if (!trimmed) return null
  const parts = trimmed.split(':')
  if (parts.length < 2 || parts.length > 8) return null
  const emptyIdx = parts.indexOf('')
  const before = parts.slice(0, emptyIdx >= 0 ? emptyIdx : parts.length).filter(p => p.length > 0)
  const after = emptyIdx >= 0 ? parts.slice(emptyIdx + 1).filter(p => p.length > 0) : []
  if (emptyIdx >= 0 && parts.filter(p => p === '').length > 1) return null
  for (const part of [...before, ...after]) {
    if (part.length > 4) return null
    const num = parseInt(part, 16)
    if (isNaN(num) || num < 0 || num > 0xFFFF) return null
  }
  const missing = 8 - before.length - after.length
  if (emptyIdx >= 0 && missing < 1) return null
  const filler = emptyIdx >= 0 ? Array(missing).fill('0000') : []
  const expanded = [...before, ...filler, ...after].map(p => p.padStart(4, '0').toLowerCase())
  if (expanded.length !== 8) return null
  return expanded.join(':')
}

const ipv6PureHex = (ip: string): string | null => {
  const expanded = ipv6ToHex(ip)
  if (!expanded) return null
  return expanded.replace(/:/g, '')
}

const hexToIpv6 = (hex: string): string | null => {
  const trimmed = hex.trim().replace(/^0x/i, '').replace(/:/g, '')
  if (trimmed.length !== 32 || !/^[0-9a-fA-F]+$/.test(trimmed)) return null
  const groups: string[] = []
  for (let i = 0; i < 8; i++) {
    groups.push(trimmed.slice(i * 4, (i + 1) * 4).toLowerCase())
  }
  return groups.join(':')
}

const ipv6HexResult = computed(() => {
  if (!ipv6Input.value.trim()) return null
  ipv6Error.value = ''
  if (reverseMode.value) {
    const ipv6 = hexToIpv6(ipv6Input.value)
    if (ipv6 === null) {
      ipv6Error.value = 'Invalid hex (32 hex chars, e.g. 20010db885a3000000008a2e03707334 or with colons)'
      return null
    }
    return {
      mode: 'reverse' as const,
      ipv6,
      expanded: ipv6,
      pureHex: ipv6.replace(/:/g, ''),
    }
  } else {
    const expanded = ipv6ToHex(ipv6Input.value)
    if (expanded === null) {
      ipv6Error.value = 'Invalid IPv6 address (e.g. 2001:0db8:85a3::8a2e:370:7334)'
      return null
    }
    return {
      mode: 'forward' as const,
      expanded,
      pureHex: ipv6PureHex(ipv6Input.value) ?? '',
    }
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
          IPv6 ↔ Hexadecimal
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Convert between IPv6 addresses and hexadecimal notation.
        </p>
      </div>

      <!-- Tool -->
      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <ArrowPathIcon class="w-5 h-5 text-lavender" />
          Converter
        </h2>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <button
              type="button"
              :class="cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                !reverseMode && 'bg-lavender/20 text-lavender ring-1 ring-lavender/30',
                reverseMode && 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
              )"
              @click="reverseMode = false"
            >
              IPv6 → Hex
            </button>
            <button
              type="button"
              :class="cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                reverseMode && 'bg-lavender/20 text-lavender ring-1 ring-lavender/30',
                !reverseMode && 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
              )"
              @click="reverseMode = true"
            >
              Hex → IPv6
            </button>
          </div>
          <div>
            <label :for="reverseMode ? 'hex-input' : 'ipv6-input'" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ reverseMode ? 'Hexadecimal (32 hex chars, with or without colons)' : 'IPv6 Address' }}
            </label>
            <input
              :id="reverseMode ? 'hex-input' : 'ipv6-input'"
              v-model="ipv6Input"
              type="text"
              :placeholder="reverseMode ? '20010db885a3000000008a2e03707334' : '2001:0db8:85a3::8a2e:370:7334'"
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-lavender/50',
                'transition-all duration-200',
              )"
            />
            <p v-if="ipv6Error" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ ipv6Error }}</p>
          </div>
          <div v-if="ipv6HexResult" class="space-y-4">
            <div v-if="ipv6HexResult.mode === 'reverse'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IPv6 Address</label>
              <div
                :class="cn(
                  'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200',
                )"
              >
                <span class="flex-1 break-all">{{ ipv6HexResult.ipv6 }}</span>
                <button
                  @click="copyToClipboard(ipv6HexResult.ipv6)"
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
            <template v-else>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expanded Hexadecimal</label>
                <div
                  :class="cn(
                    'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                    'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                    'text-gray-800 dark:text-gray-200',
                  )"
                >
                  <span class="flex-1 break-all">{{ ipv6HexResult.expanded }}</span>
                  <button
                    @click="copyToClipboard(ipv6HexResult.expanded)"
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
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pure Hexadecimal (no colons)</label>
                <div
                  :class="cn(
                    'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                    'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                    'text-gray-800 dark:text-gray-200',
                  )"
                >
                  <span class="flex-1 break-all">{{ ipv6HexResult.pureHex }}</span>
                  <button
                    @click="copyToClipboard(ipv6HexResult.pureHex)"
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
            </template>
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
