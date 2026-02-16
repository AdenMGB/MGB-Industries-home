<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useRouter, useRoute } from 'vue-router'
import GitRepoInput from '@/components/GitRepoInput.vue'
import GitBranchSelect from '@/components/GitBranchSelect.vue'
import GitEmbedSection from '@/components/GitEmbedSection.vue'
import GitShareLink from '@/components/GitShareLink.vue'
import { gitApi } from '@/api/git'

const router = useRouter()
const route = useRoute()

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const repoUrl = ref((route.query.url as string) ?? '')
const branch = ref('')
const author = ref('')
const since = ref('')
const until = ref('')
const commits = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const error = ref('')
const repoInputRef = ref<InstanceType<typeof GitRepoInput> | null>(null)

async function search() {
  if (!repoInputRef.value?.validate()) return
  loading.value = true
  error.value = ''
  const params: Record<string, string | number> = { page: 1, per_page: 50 }
  if (author.value.trim()) params.author = author.value.trim()
  if (since.value.trim()) params.since = since.value.trim() + 'T00:00:00Z'
  if (until.value.trim()) params.until = until.value.trim() + 'T23:59:59Z'
  if (branch.value) params.sha = branch.value
  const { data, error: err } = await gitApi.getCommits(repoUrl.value, params as { page?: number; per_page?: number; author?: string; since?: string; until?: string; sha?: string })
  loading.value = false
  if (err) {
    error.value = err
    return
  }
  commits.value = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
}

const filteredCommits = () => commits.value

function openCommitDetails(c: Record<string, unknown>) {
  const hash = c.sha as string | undefined
  if (hash && repoUrl.value) {
    router.push({ path: '/developer-tools/git-commit', query: { url: repoUrl.value, sha: hash } })
  }
}

function authorName(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const a = commit?.author as Record<string, unknown> | undefined
  if (a?.name) return String(a.name)
  const u = c.author as Record<string, unknown> | undefined
  return (u?.login as string) || 'Unknown'
}

function commitDate(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const a = commit?.author as Record<string, unknown> | undefined
  const d = a?.date as string | undefined
  return d ? new Date(d).toLocaleString() : ''
}

function shortSha(c: Record<string, unknown>): string {
  const s = c.sha as string | undefined
  return s ? s.slice(0, 7) : ''
}

function message(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const m = commit?.message as string | undefined
  return m ? m.split('\n')[0] ?? '' : ''
}

const goBack = () => window.history.back()

watch(() => route.query.url, (url) => { if (url) repoUrl.value = url })
watch(() => route.query.sha, (s) => { if (s) branch.value = s })
watch(() => route.query.author, (a) => { if (a !== undefined) author.value = a })
watch(() => route.query.since, (s) => { if (s !== undefined) since.value = s })
watch(() => route.query.until, (u) => { if (u !== undefined) until.value = u })

function syncUrl() {
  const u = repoUrl.value.trim().replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/\/$/, '')
  if (!u) return
  const query: Record<string, string> = { url: u }
  if (branch.value) query.sha = branch.value
  if (author.value.trim()) query.author = author.value
  if (since.value.trim()) query.since = since.value
  if (until.value.trim()) query.until = until.value
  router.replace({ path: route.path, query })
}
watch([repoUrl, branch, author, since, until], syncUrl, { deep: true })

onMounted(async () => {
  await nextTick()
  if (repoUrl.value && repoInputRef.value?.validate()) search()
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
          'focus:outline-none focus:ring-2 focus:ring-soft-blue/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Git Commit Search
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Search commits by author and date range.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-2">
            <MagnifyingGlassIcon class="w-5 h-5 text-soft-blue" />
            <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Search</h2>
          </div>
          <GitShareLink v-if="repoUrl.trim() && commits.length" />
        </div>
        <div class="space-y-4">
          <GitRepoInput ref="repoInputRef" v-model="repoUrl" />
          <GitBranchSelect v-model="branch" :repo-url="repoUrl" label="Branch" />
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label for="git-author" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author (username)</label>
              <input
                id="git-author"
                v-model="author"
                type="text"
                placeholder="octocat"
                :class="cn(
                  'w-full px-4 py-2 rounded-lg border text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
                )"
              />
            </div>
            <div>
              <label for="git-since" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Since (YYYY-MM-DD)</label>
              <input
                id="git-since"
                v-model="since"
                type="text"
                placeholder="2024-01-01"
                :class="cn(
                  'w-full px-4 py-2 rounded-lg border text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
                )"
              />
            </div>
            <div>
              <label for="git-until" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Until (YYYY-MM-DD)</label>
              <input
                id="git-until"
                v-model="until"
                type="text"
                placeholder="2024-12-31"
                :class="cn(
                  'w-full px-4 py-2 rounded-lg border text-sm',
                  'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
                )"
              />
            </div>
          </div>
          <button
            @click="search"
            :disabled="loading"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-soft-blue/30 hover:bg-soft-blue/40 text-gray-800 dark:text-white',
              'transition-all duration-200 transform hover:scale-105 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )"
          >
            {{ loading ? 'Searching...' : 'Search' }}
          </button>
          <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
          <GitEmbedSection
            v-if="repoUrl.trim()"
            :repo-url="repoUrl"
            tool-path="/developer-tools/git-search"
            tool-label="Commit Search"
            :extra-params="branch ? { sha: branch } : undefined"
          />
          <div v-if="filteredCommits().length" class="space-y-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ filteredCommits().length }} commits</p>
            <button
              v-for="c in filteredCommits()"
              :key="(c.sha as string)"
              @click="openCommitDetails(c)"
              :class="cn(
                'w-full flex items-start gap-3 p-4 rounded-lg font-mono text-sm text-left',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'hover:bg-white/80 dark:hover:bg-gray-600/60 hover:border-soft-blue/30',
                'text-gray-800 dark:text-gray-200 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
              )"
            >
              <span class="text-soft-blue font-semibold shrink-0">{{ shortSha(c) }}</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ message(c) }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ authorName(c) }} · {{ commitDate(c) }}</p>
              </div>
            </button>
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
