<script setup lang="ts">
import { ref } from 'vue'
import { cn } from '@/utils/cn'
import { LinkIcon, CheckIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(
  defineProps<{
    url?: string
    label?: string
  }>(),
  { url: '' },
)

const copied = ref(false)

async function copyLink() {
  const urlToCopy = props.url || (typeof window !== 'undefined' ? window.location.href : '')
  if (!urlToCopy) return
  try {
    await navigator.clipboard.writeText(urlToCopy)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <button
    @click="copyLink"
    :class="cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
      'bg-soft-blue/20 hover:bg-soft-blue/30 text-gray-700 dark:text-gray-200',
      'transition-all duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
    )"
    title="Copy shareable link"
  >
    <CheckIcon v-if="copied" class="w-4 h-4 text-green-600" />
    <LinkIcon v-else class="w-4 h-4" />
    <span>{{ copied ? 'Copied!' : (label ?? 'Copy link') }}</span>
  </button>
</template>
