<script setup lang="ts">
import { ref, watch } from 'vue'
import { cn } from '@/utils/cn'
import { gitApi } from '@/api/git'

const props = defineProps<{
  repoUrl: string
  modelValue?: string
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const branches = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const error = ref('')

watch(
  () => props.repoUrl,
  () => {
    branches.value = []
    emit('update:modelValue', '')
    error.value = ''
  },
)

async function loadBranches() {
  if (!props.repoUrl.trim()) return
  loading.value = true
  error.value = ''
  const { data, err } = await gitApi.getBranches(props.repoUrl)
  loading.value = false
  if (err) {
    error.value = err
    return
  }
  branches.value = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
  const names = branches.value.map((b) => (b.name as string) ?? '').filter(Boolean)
  if (names.length && !props.modelValue) {
    const main = names.find((n) => ['main', 'master'].includes(n)) ?? names[0]
    emit('update:modelValue', main ?? '')
  }
}

function branchName(b: Record<string, unknown>): string {
  return (b.name as string) || ''
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <label v-if="label" :for="`branch-select-${label}`" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ label }}
      </label>
      <button
        v-if="!branches.length"
        type="button"
        @click="loadBranches"
        :disabled="loading || !props.repoUrl.trim()"
        :class="cn(
          'px-3 py-1.5 rounded-lg text-xs font-medium',
          'bg-soft-blue/20 hover:bg-soft-blue/30 text-gray-700 dark:text-gray-200',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )"
      >
        {{ loading ? 'Loading...' : 'Select branch' }}
      </button>
    </div>
    <select
      v-if="branches.length"
      :id="`branch-select-${label}`"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      :class="cn(
        'w-full max-w-xs px-4 py-2 rounded-lg border text-sm',
        'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
        'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
      )"
    >
      <option value="">Default (main/master)</option>
      <option v-for="b in branches" :key="branchName(b)" :value="branchName(b)">
        {{ branchName(b) }}
      </option>
    </select>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
  </div>
</template>
