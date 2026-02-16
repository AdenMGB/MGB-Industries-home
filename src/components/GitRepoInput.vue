<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { cn } from '@/utils/cn'

const RECENT_KEY = 'git-tools-recent-repos'
const RECENT_MAX = 5

export interface ParsedRepo {
  provider: 'github' | 'gitlab'
  owner: string
  repo: string
}

function parseUrl(url: string): ParsedRepo | null {
  const trimmed = url.trim().replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/\/$/, '')
  const gh = trimmed.match(/^(?:www\.)?github\.com\/([^/]+)\/([^/]+)/)
  if (gh) return { provider: 'github', owner: gh[1]!, repo: gh[2]! }
  const gl = trimmed.match(/^(?:www\.)?gitlab\.com\/([^/]+)\/([^/]+)/)
  if (gl) return { provider: 'gitlab', owner: gl[1]!, repo: gl[2]!.replace(/\.git$/, '') }
  return null
}

function getRecentRepos(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function addRecentRepo(repo: string) {
  const normalized = repo.trim().replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/\/$/, '')
  if (!normalized || !parseUrl(normalized)) return
  let recent = getRecentRepos().filter((r) => r !== normalized)
  recent = [normalized, ...recent].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
  } catch {
    // ignore
  }
}

const url = defineModel<string>({ default: '' })
const recentRepos = ref<string[]>(getRecentRepos())
const error = ref('')

const parsed = computed(() => {
  if (!url.value.trim()) return null
  return parseUrl(url.value)
})

const isValid = computed(() => !!parsed.value)

function validate() {
  error.value = ''
  if (!url.value.trim()) {
    error.value = 'Enter a repo URL'
    return false
  }
  if (!parsed.value) {
    error.value = 'Invalid URL. Use github.com/owner/repo or gitlab.com/owner/repo'
    return false
  }
  addRecentRepo(url.value)
  recentRepos.value = getRecentRepos()
  return true
}

function pickRecent(repo: string) {
  url.value = repo
}

watch(url, (v) => {
  if (v && parsed.value) recentRepos.value = getRecentRepos()
})

function addToRecent() {
  if (url.value.trim() && parsed.value) {
    addRecentRepo(url.value)
    recentRepos.value = getRecentRepos()
  }
}

defineExpose({ validate, parsed, isValid, addToRecent })
</script>

<template>
  <div class="space-y-2">
    <label for="git-repo-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Repository URL</label>
    <input
      id="git-repo-url"
      v-model="url"
      type="text"
      placeholder="github.com/vuejs/core or gitlab.com/gitlab-org/gitlab"
      :class="cn(
        'w-full px-4 py-3 rounded-lg border font-mono text-sm',
        'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
        'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
        'transition-all duration-200',
      )"
    />
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-else-if="parsed" class="text-sm text-gray-500 dark:text-gray-400">
      {{ parsed.provider }} / {{ parsed.owner }} / {{ parsed.repo }}
    </p>
    <div v-if="recentRepos.length" class="flex flex-wrap gap-2 mt-2">
      <span class="text-xs text-gray-500 dark:text-gray-400">Recent:</span>
      <button
        v-for="r in recentRepos"
        :key="r"
        @click="pickRecent(r)"
        :class="cn(
          'px-2 py-1 rounded text-xs font-mono',
          'bg-gray-200/60 dark:bg-gray-600/40 hover:bg-soft-blue/20',
          'text-gray-700 dark:text-gray-300 transition-colors duration-200',
        )"
      >
        {{ r }}
      </button>
    </div>
  </div>
</template>
