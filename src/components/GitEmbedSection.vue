<script setup lang="ts">
import { ref, computed } from 'vue'
import { cn } from '@/utils/cn'
import { DocumentDuplicateIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'
import { SITE_URL } from '@/config/seo'

const props = defineProps<{
  repoUrl: string
  toolPath: string
  toolLabel: string
  /** Extra query params e.g. branch, path */
  extraParams?: Record<string, string>
}>()

const expanded = ref(false)
const copied = ref<string | null>(null)

const normalizedRepo = computed(() =>
  props.repoUrl.trim().replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/\/$/, ''),
)

const fullUrl = computed(() => {
  const params = new URLSearchParams({ url: normalizedRepo.value })
  Object.entries(props.extraParams ?? {}).forEach(([k, v]) => {
    if (v) params.set(k, v)
  })
  return `${SITE_URL}${props.toolPath}?${params.toString()}`
})

const markdownLink = computed(() => `[View ${props.toolLabel}](${fullUrl.value})`)

const markdownBadge = computed(
  () =>
    `[![${props.toolLabel}](https://img.shields.io/badge/Git-${props.toolLabel.replace(/\s/g, '_')}-2196F3?style=flat-square)](${fullUrl.value})`,
)

async function copy(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = id
    setTimeout(() => (copied.value = null), 2000)
  } catch {
    copied.value = null
  }
}
</script>

<template>
  <div
    :class="cn(
      'rounded-lg border border-gray-200/50 dark:border-gray-600/50',
      'bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm',
    )"
  >
    <button
      @click="expanded = !expanded"
      :class="cn(
        'w-full flex items-center justify-between px-4 py-3 text-left',
        'text-sm font-medium text-gray-700 dark:text-gray-300',
        'hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors duration-200',
        'rounded-lg',
      )"
    >
      <span class="flex items-center gap-2">
        <DocumentDuplicateIcon class="w-4 h-4 text-soft-blue" />
        Embed in README
      </span>
      <ChevronDownIcon v-if="!expanded" class="w-4 h-4" />
      <ChevronUpIcon v-else class="w-4 h-4" />
    </button>
    <div v-if="expanded" class="px-4 pb-4 pt-0 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-medium text-gray-600 dark:text-gray-400">Shareable link</p>
        <button
          @click="copy(fullUrl, 'url')"
          :class="cn(
            'px-2 py-1 rounded text-xs',
            'bg-soft-blue/20 hover:bg-soft-blue/30',
            'transition-colors duration-200',
          )"
        >
          {{ copied === 'url' ? 'Copied!' : 'Copy link' }}
        </button>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 break-all font-mono">{{ fullUrl }}</p>
      <p class="text-xs text-gray-500 dark:text-gray-400 pt-1">Or embed in your GitHub/GitLab README:</p>
      <div class="space-y-2">
        <div>
          <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Link (compact)</p>
          <div
            :class="cn(
              'flex items-center gap-2 p-2 rounded-lg font-mono text-xs',
              'bg-gray-100/80 dark:bg-gray-700/80',
              'text-gray-800 dark:text-gray-200 break-all',
            )"
          >
            <code class="flex-1 min-w-0">{{ markdownLink }}</code>
            <button
              @click="copy(markdownLink, 'link')"
              :class="cn(
                'shrink-0 px-2 py-1 rounded text-xs',
                'bg-soft-blue/20 hover:bg-soft-blue/30',
                'transition-colors duration-200',
              )"
            >
              {{ copied === 'link' ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>
        <div>
          <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Badge (shields.io)</p>
          <div
            :class="cn(
              'flex items-center gap-2 p-2 rounded-lg font-mono text-xs',
              'bg-gray-100/80 dark:bg-gray-700/80',
              'text-gray-800 dark:text-gray-200 break-all',
            )"
          >
            <code class="flex-1 min-w-0">{{ markdownBadge }}</code>
            <button
              @click="copy(markdownBadge, 'badge')"
              :class="cn(
                'shrink-0 px-2 py-1 rounded text-xs',
                'bg-soft-blue/20 hover:bg-soft-blue/30',
                'transition-colors duration-200',
              )"
            >
              {{ copied === 'badge' ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
