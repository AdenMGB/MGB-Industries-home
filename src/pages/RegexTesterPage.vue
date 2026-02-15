<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ClipboardDocumentIcon, MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const { success } = useToast()
const router = useRouter()

const pattern = ref('')
const testString = ref('')
const replaceString = ref('$&')
const flags = ref('g')

const regexError = ref('')
const regex = computed(() => {
  regexError.value = ''
  if (!pattern.value.trim()) return null
  try {
    return new RegExp(pattern.value, flags.value)
  } catch (e) {
    regexError.value = 'Invalid regex'
    return null
  }
})

const matches = computed(() => {
  if (!regex.value || !testString.value) return null
  const str = testString.value
  const re = regex.value
  const results: { match: string; index: number; groups: string[] }[] = []
  let m: RegExpExecArray | null
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  while ((m = r.exec(str)) !== null) {
    results.push({
      match: m[0],
      index: m.index,
      groups: m.slice(1).filter((g) => g !== undefined),
    })
    if (!re.flags.includes('g')) break
  }
  return results
})

const replaceResult = computed(() => {
  if (!regex.value || !testString.value) return null
  try {
    return testString.value.replace(regex.value, replaceString.value)
  } catch {
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
          'focus:outline-none focus:ring-2 focus:ring-lavender/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Regex Tester
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Test regular expressions with sample text. View matches, groups, and replace preview.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-6">
          <MagnifyingGlassIcon class="w-5 h-5 text-lavender" />
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Tester</h2>
        </div>
        <div class="space-y-4">
          <div>
            <label for="regex-pattern" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pattern</label>
            <div class="flex gap-2">
              <input
                id="regex-pattern"
                v-model="pattern"
                type="text"
                placeholder="\\w+"
                :class="cn(
                  'flex-1 px-4 py-3 rounded-lg border font-mono text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-lavender/50',
                  'transition-all duration-200',
                )"
              />
              <input
                v-model="flags"
                type="text"
                placeholder="g"
                class="w-16 px-2 py-3 rounded-lg border font-mono text-sm bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-lavender/50"
              />
            </div>
            <p v-if="regexError" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ regexError }}</p>
          </div>
          <div>
            <label for="regex-test" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test string</label>
            <textarea
              id="regex-test"
              v-model="testString"
              rows="4"
              placeholder="Enter text to test..."
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm resize-none',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-lavender/50',
                'transition-all duration-200',
              )"
            />
          </div>
          <div v-if="matches && matches.length > 0" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Matches ({{ matches.length }})</label>
            <div
              v-for="(m, i) in matches"
              :key="i"
              :class="cn(
                'flex items-start gap-2 p-3 rounded-lg font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200',
              )"
            >
              <span class="text-gray-500 dark:text-gray-400 shrink-0">#{{ Number(i) + 1 }}</span>
              <span class="flex-1 break-all">"{{ m.match }}" at index {{ m.index }}</span>
              <span v-if="m.groups.length" class="text-lavender">Groups: {{ m.groups.join(', ') }}</span>
            </div>
          </div>
          <div v-else-if="regex && pattern.trim() && testString" class="text-sm text-gray-500 dark:text-gray-400">
            No matches
          </div>
          <div v-if="regex && testString">
            <label for="replace-string" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Replace with</label>
            <input
              id="replace-string"
              v-model="replaceString"
              type="text"
              placeholder="$&"
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-lavender/50',
                'transition-all duration-200',
              )"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">$& = full match, $1, $2 = groups</p>
          </div>
          <div v-if="replaceResult !== null" class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Replace result</label>
            <div
              :class="cn(
                'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200',
              )"
            >
              <span class="flex-1 break-all whitespace-pre-wrap">{{ replaceResult }}</span>
              <button
                @click="copyToClipboard(replaceResult ?? '')"
                aria-label="Copy result"
                :class="cn(
                  'p-2 rounded-lg shrink-0 hover:bg-lavender/20 transition-all duration-200',
                  'transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-lavender/50',
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
