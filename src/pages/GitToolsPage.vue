<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import {
  ArrowLeftIcon,
  ClockIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/vue/24/outline'
import GitRepoInput from '@/components/GitRepoInput.vue'
import GitBranchSelect from '@/components/GitBranchSelect.vue'
import GitEmbedSection from '@/components/GitEmbedSection.vue'
import GitShareLink from '@/components/GitShareLink.vue'
import { gitApi } from '@/api/git'
import { parseGitUrl } from '@/utils/git-url'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const router = useRouter()
const route = useRoute()

type TabId = 'history' | 'stats' | 'search' | 'file-history' | 'compare'
const tabs: { id: TabId; label: string; icon: typeof ClockIcon }[] = [
  { id: 'history', label: 'History', icon: ClockIcon },
  { id: 'stats', label: 'Stats', icon: ChartBarIcon },
  { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
  { id: 'file-history', label: 'File History', icon: DocumentTextIcon },
  { id: 'compare', label: 'Compare', icon: ArrowsRightLeftIcon },
]

const activeTab = ref<TabId>((route.query.tab as TabId) || 'history')
const repoUrl = ref((route.query.url as string) ?? '')
const branch = ref((route.query.sha as string) ?? '')
const author = ref((route.query.author as string) ?? '')
const since = ref((route.query.since as string) ?? '')
const until = ref((route.query.until as string) ?? '')
const filePath = ref((route.query.path as string) ?? '')
const baseBranch = ref((route.query.base as string) ?? '')
const headBranch = ref((route.query.head as string) ?? '')

const commits = ref<Record<string, unknown>[]>([])
const contributors = ref<Record<string, unknown>[]>([])
const branches = ref<Record<string, unknown>[]>([])
const compareResult = ref<Record<string, unknown> | null>(null)
const loading = ref(false)
const error = ref('')
const page = ref(1)
const hasMore = ref(true)
const repoInputRef = ref<InstanceType<typeof GitRepoInput> | null>(null)

const parsedRepo = computed(() => parseGitUrl(repoUrl.value))

function syncUrl() {
  const u = repoUrl.value.trim().replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/\/$/, '')
  if (!u) return
  const query: Record<string, string> = { url: u, tab: activeTab.value }
  if (branch.value) query.sha = branch.value
  if (author.value) query.author = author.value
  if (since.value) query.since = since.value
  if (until.value) query.until = until.value
  if (filePath.value) query.path = filePath.value
  if (baseBranch.value) query.base = baseBranch.value
  if (headBranch.value) query.head = headBranch.value
  router.replace({ path: route.path, query })
}

watch([repoUrl, branch, author, since, until, filePath, baseBranch, headBranch, activeTab], syncUrl, { deep: true })
watch(() => route.query.tab, (t) => { if (t && tabs.some(x => x.id === t)) activeTab.value = t as TabId })
watch(() => route.query.url, (u) => { if (u) repoUrl.value = u })

// Shared helpers
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
  return d ? new Date(d).toLocaleDateString() : ''
}
function commitTime(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const a = commit?.author as Record<string, unknown> | undefined
  const d = a?.date as string | undefined
  return d ? new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''
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
function formatTimelineDate(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const a = commit?.author as Record<string, unknown> | undefined
  const d = a?.date as string | undefined
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

// History
async function loadCommits(reset = false) {
  if (!repoInputRef.value?.validate()) return
  if (reset) { page.value = 1; commits.value = []; hasMore.value = true }
  loading.value = true
  error.value = ''
  const { data, error: err } = await gitApi.getCommits(repoUrl.value, {
    page: page.value,
    per_page: 30,
    ...(branch.value && { sha: branch.value }),
  })
  loading.value = false
  if (err) { error.value = err; return }
  if (Array.isArray(data)) {
    const arr = data as Record<string, unknown>[]
    commits.value = reset ? arr : [...commits.value, ...arr]
    hasMore.value = data.length >= 30
    if (data.length >= 30) page.value++
  }
}

// Stats
async function loadStats() {
  if (!repoInputRef.value?.validate()) return
  loading.value = true
  error.value = ''
  const { data, error: err } = await gitApi.getContributors(repoUrl.value)
  loading.value = false
  if (err) { error.value = err; return }
  contributors.value = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
}
const totalCommits = () => contributors.value.reduce((s, c) => s + (Number((c as Record<string, unknown>).contributions) || 0), 0)
function contributorName(c: Record<string, unknown>): string {
  const login = c.login as string | undefined
  const name = c.name as string | undefined
  return name || login || 'Anonymous'
}
function contributorAvatar(c: Record<string, unknown>): string {
  return (c.avatar_url as string) || ''
}

// Search
async function search() {
  if (!repoInputRef.value?.validate()) return
  loading.value = true
  error.value = ''
  const params: Record<string, string | number> = { page: 1, per_page: 50 }
  if (author.value.trim()) params.author = author.value.trim()
  if (since.value.trim()) params.since = since.value.trim() + 'T00:00:00Z'
  if (until.value.trim()) params.until = until.value.trim() + 'T23:59:59Z'
  if (branch.value) params.sha = branch.value
  const { data, error: err } = await gitApi.getCommits(repoUrl.value, params as Parameters<typeof gitApi.getCommits>[1])
  loading.value = false
  if (err) { error.value = err; return }
  commits.value = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
}

// File History
async function loadFileHistory() {
  if (!repoInputRef.value?.validate()) return
  if (!filePath.value.trim()) { error.value = 'Enter a file path (e.g. src/main.ts)'; return }
  loading.value = true
  error.value = ''
  const { data, error: err } = await gitApi.getCommits(repoUrl.value, {
    path: filePath.value.trim(),
    page: 1,
    per_page: 50,
    ...(branch.value && { sha: branch.value }),
  })
  loading.value = false
  if (err) { error.value = err; return }
  commits.value = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
}

// Compare
async function loadBranches() {
  if (!repoInputRef.value?.validate()) return
  loading.value = true
  error.value = ''
  const { data, error: err } = await gitApi.getBranches(repoUrl.value)
  loading.value = false
  if (err) { error.value = err; return }
  branches.value = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
  const names = branches.value.map((b) => (b.name as string) ?? '').filter(Boolean)
  if (names.length && !baseBranch.value) baseBranch.value = names[0] ?? ''
  if (names.length > 1 && !headBranch.value) headBranch.value = names[1] ?? ''
}
async function compare() {
  if (!repoInputRef.value?.validate()) return
  if (!baseBranch.value || !headBranch.value) { error.value = 'Select base and head branches'; return }
  loading.value = true
  error.value = ''
  const { data, error: err } = await gitApi.getCompare(repoUrl.value, baseBranch.value, headBranch.value)
  loading.value = false
  if (err) { error.value = err; return }
  compareResult.value = data as Record<string, unknown>
}
const aheadCommits = () => {
  const r = compareResult.value
  if (!r) return []
  const ahead = r.ahead_by as number | undefined
  const cmts = r.commits as Record<string, unknown>[] | undefined
  if (cmts && ahead) return cmts.slice(0, ahead)
  return Array.isArray(cmts) ? cmts : []
}
function branchName(b: Record<string, unknown>): string {
  return (b.name as string) || ''
}
function diffUrl(): string {
  const parsed = parsedRepo.value
  if (!parsed) return '#'
  return `https://${parsed.provider}.com/${parsed.owner}/${parsed.repo}/compare/${baseBranch.value}...${headBranch.value}`
}

async function runActiveTool() {
  error.value = ''
  if (activeTab.value === 'history') await loadCommits(true)
  else if (activeTab.value === 'stats') await loadStats()
  else if (activeTab.value === 'search') await search()
  else if (activeTab.value === 'file-history') await loadFileHistory()
  else if (activeTab.value === 'compare') {
    await loadBranches()
    if (baseBranch.value && headBranch.value && branches.value.length) await compare()
  }
}

const goBack = () => router.push('/developer-tools')

const embedToolLabel = computed(() => {
  const labels: Record<TabId, string> = {
    history: 'Git History',
    stats: 'Commit Stats',
    search: 'Commit Search',
    'file-history': 'File History',
    compare: 'Branch Compare',
  }
  return labels[activeTab.value] ?? 'Git Tools'
})
const embedExtraParams = computed(() => {
  const p: Record<string, string> = { tab: activeTab.value }
  if (branch.value) p.sha = branch.value
  if (activeTab.value === 'file-history' && filePath.value) p.path = filePath.value
  if (activeTab.value === 'compare' && baseBranch.value && headBranch.value) {
    p.base = baseBranch.value
    p.head = headBranch.value
  }
  return p
})

const showShareLink = computed(() => {
  if (activeTab.value === 'history') return repoUrl.value.trim() && commits.value.length > 0
  if (activeTab.value === 'stats') return repoUrl.value.trim() && contributors.value.length > 0
  if (activeTab.value === 'search') return repoUrl.value.trim() && commits.value.length > 0
  if (activeTab.value === 'file-history') return repoUrl.value.trim() && filePath.value.trim() && commits.value.length > 0
  if (activeTab.value === 'compare') return repoUrl.value.trim() && baseBranch.value && headBranch.value && compareResult.value
  return false
})

onMounted(async () => {
  await nextTick()
  if (repoUrl.value && repoInputRef.value) {
    if (repoInputRef.value.validate()) {
      runActiveTool()
    } else if (route.query.url && repoInputRef.value.parsed) {
      repoInputRef.value.addToRecent?.()
    }
  }
  gsap.fromTo('.page-header', { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: premiumEase })
  gsap.fromTo('.git-tab', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, delay: 0.1, ease: premiumEase })
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-5xl mx-auto">
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

      <div class="page-header mb-8">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Git Tools
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          History, stats, search, file history, and branch compare for any public GitHub or GitLab repo.
        </p>
      </div>

      <!-- Shared repo input -->
      <div class="git-tab p-6 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-soft-blue/30 dark:border-gray-600/50 mb-6">
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div class="flex-1 w-full min-w-0">
            <GitRepoInput ref="repoInputRef" v-model="repoUrl" />
          </div>
          <button
            @click="runActiveTool"
            :disabled="loading"
            :class="cn(
              'px-6 py-3 rounded-xl text-sm font-semibold shrink-0',
              'bg-soft-blue/40 hover:bg-soft-blue/50 text-gray-800 dark:text-white',
              'transition-all duration-200 transform hover:scale-105 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
            )"
          >
            {{ loading ? 'Loading...' : 'Go' }}
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex flex-wrap gap-2 mb-6">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          @click="activeTab = t.id; error = ''"
          :class="cn(
            'git-tab flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            activeTab === t.id
              ? 'bg-soft-blue/30 text-gray-800 dark:text-white ring-2 ring-soft-blue/50'
              : 'bg-white/40 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:bg-soft-blue/10 hover:text-gray-800 dark:hover:text-white',
          )"
        >
          <component :is="t.icon" class="w-4 h-4" />
          {{ t.label }}
        </button>
      </div>

      <!-- Tab panels -->
      <div class="git-tab p-6 md:p-8 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center justify-between gap-4 mb-6">
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <component :is="tabs.find(x => x.id === activeTab)?.icon" class="w-5 h-5 text-soft-blue" />
            {{ tabs.find(x => x.id === activeTab)?.label }}
          </h2>
          <GitShareLink v-if="showShareLink" />
        </div>

        <p v-if="error" class="text-sm text-red-600 dark:text-red-400 mb-4">{{ error }}</p>

        <!-- History -->
        <div v-show="activeTab === 'history'" class="space-y-4">
          <GitBranchSelect v-model="branch" :repo-url="repoUrl" label="Branch" />
          <GitEmbedSection
            v-if="repoUrl.trim()"
            :repo-url="repoUrl"
            tool-path="/developer-tools/git"
            :tool-label="embedToolLabel"
            :extra-params="embedExtraParams"
          />
          <div v-if="commits.length" class="relative">
            <div class="absolute left-4 md:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-soft-blue/50 via-soft-blue/30 to-transparent" aria-hidden="true" />
            <div class="space-y-0">
              <div
                v-for="(c, i) in commits"
                :key="(c.sha as string)"
                class="relative flex gap-4 md:gap-6 pl-10 md:pl-14 py-4 group"
              >
                <div class="absolute left-2 md:left-4 top-6 w-4 h-4 rounded-full border-2 border-soft-blue/60 bg-white dark:bg-gray-800 -translate-x-1/2 shrink-0 transition-all duration-200 group-hover:scale-125 group-hover:border-soft-blue group-hover:bg-soft-blue/20" />
                <div class="absolute left-0 top-5 text-xs font-medium text-gray-500 dark:text-gray-400 w-8 md:w-10 text-right -translate-x-full pr-2">
                  {{ formatTimelineDate(c) }}
                </div>
                <button
                  @click="openCommitDetails(c)"
                  :class="cn(
                    'flex-1 text-left p-4 rounded-xl font-mono text-sm',
                    'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                    'hover:bg-white/80 dark:hover:bg-gray-600/60 hover:border-soft-blue/30',
                    'transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99]',
                    'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
                  )"
                >
                  <div class="flex items-start gap-3">
                    <span class="text-soft-blue font-semibold shrink-0">{{ shortSha(c) }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-800 dark:text-white truncate">{{ message(c) }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ authorName(c) }} · {{ commitDate(c) }} {{ commitTime(c) }}</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <button
              v-if="hasMore && !loading && activeTab === 'history'"
              @click="loadCommits(false)"
              :class="cn('w-full py-3 mt-4 rounded-xl text-sm text-gray-600 dark:text-gray-400', 'hover:bg-gray-200/50 dark:hover:bg-gray-600/50 transition-colors duration-200')"
            >
              Load more
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div v-show="activeTab === 'stats'" class="space-y-6">
          <GitEmbedSection v-if="repoUrl.trim()" :repo-url="repoUrl" tool-path="/developer-tools/git" :tool-label="embedToolLabel" :extra-params="embedExtraParams" />
          <div v-if="contributors.length" class="space-y-6">
            <div class="p-6 rounded-xl bg-soft-blue/10 dark:bg-soft-blue/5 border border-soft-blue/20">
              <p class="text-4xl font-light text-gray-800 dark:text-white">{{ totalCommits() }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Total commits</p>
            </div>
            <div class="space-y-3">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">By contributor</p>
              <div
                v-for="c in contributors"
                :key="contributorName(c)"
                :class="cn(
                  'flex items-center gap-4 p-4 rounded-xl',
                  'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                )"
              >
                <img v-if="contributorAvatar(c)" :src="contributorAvatar(c)" :alt="contributorName(c)" class="w-10 h-10 rounded-full" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-800 dark:text-gray-200">{{ contributorName(c) }}</p>
                </div>
                <span class="font-mono text-sm font-medium text-soft-blue">{{ (c as Record<string, unknown>).contributions ?? 0 }} commits</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Search -->
        <div v-show="activeTab === 'search'" class="space-y-4">
          <GitBranchSelect v-model="branch" :repo-url="repoUrl" label="Branch" />
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label for="git-author" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author</label>
              <input id="git-author" v-model="author" type="text" placeholder="octocat" :class="cn('w-full px-4 py-2 rounded-lg border text-sm', 'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50', 'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50')" />
            </div>
            <div>
              <label for="git-since" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Since</label>
              <input id="git-since" v-model="since" type="text" placeholder="2024-01-01" :class="cn('w-full px-4 py-2 rounded-lg border text-sm', 'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50', 'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50')" />
            </div>
            <div>
              <label for="git-until" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Until</label>
              <input id="git-until" v-model="until" type="text" placeholder="2024-12-31" :class="cn('w-full px-4 py-2 rounded-lg border text-sm', 'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50', 'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50')" />
            </div>
          </div>
          <GitEmbedSection v-if="repoUrl.trim()" :repo-url="repoUrl" tool-path="/developer-tools/git" :tool-label="embedToolLabel" :extra-params="embedExtraParams" />
          <div v-if="commits.length && activeTab === 'search'" class="space-y-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ commits.length }} commits</p>
            <button
              v-for="c in commits"
              :key="(c.sha as string)"
              @click="openCommitDetails(c)"
              :class="cn(
                'w-full flex items-start gap-3 p-4 rounded-xl font-mono text-sm text-left',
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

        <!-- File History -->
        <div v-show="activeTab === 'file-history'" class="space-y-4">
          <GitBranchSelect v-model="branch" :repo-url="repoUrl" label="Branch" />
          <div>
            <label for="git-file-path" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File path</label>
            <input id="git-file-path" v-model="filePath" type="text" placeholder="src/main.ts" :class="cn('w-full px-4 py-2 rounded-lg border text-sm', 'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50', 'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50')" />
          </div>
          <GitEmbedSection v-if="repoUrl.trim() && filePath.trim()" :repo-url="repoUrl" tool-path="/developer-tools/git" :tool-label="embedToolLabel" :extra-params="embedExtraParams" />
          <div v-if="commits.length && activeTab === 'file-history'" class="space-y-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ commits.length }} commits</p>
            <button
              v-for="c in commits"
              :key="(c.sha as string)"
              @click="openCommitDetails(c)"
              :class="cn(
                'w-full flex items-start gap-3 p-4 rounded-xl font-mono text-sm text-left',
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

        <!-- Compare -->
        <div v-show="activeTab === 'compare'" class="space-y-4">
          <GitEmbedSection v-if="repoUrl.trim() && baseBranch && headBranch" :repo-url="repoUrl" tool-path="/developer-tools/git" :tool-label="embedToolLabel" :extra-params="embedExtraParams" />
          <div v-if="branches.length" class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="git-base" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base branch</label>
              <select id="git-base" v-model="baseBranch" :class="cn('w-full px-4 py-2 rounded-lg border text-sm', 'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50', 'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50')">
                <option v-for="b in branches" :key="branchName(b)" :value="branchName(b)">{{ branchName(b) }}</option>
              </select>
            </div>
            <div>
              <label for="git-head" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Head branch</label>
              <select id="git-head" v-model="headBranch" :class="cn('w-full px-4 py-2 rounded-lg border text-sm', 'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50', 'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50')">
                <option v-for="b in branches" :key="branchName(b)" :value="branchName(b)">{{ branchName(b) }}</option>
              </select>
            </div>
          </div>
          <div v-if="compareResult" class="space-y-4">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ baseBranch }}...{{ headBranch }}: {{ aheadCommits().length }} commits ahead</span>
              <a :href="diffUrl()" target="_blank" rel="noopener noreferrer" class="text-sm text-soft-blue hover:underline">View diff on {{ parsedRepo?.provider ?? 'Git' }}</a>
            </div>
            <button
              v-for="c in aheadCommits()"
              :key="(c.sha as string)"
              @click="openCommitDetails(c)"
              :class="cn(
                'w-full flex items-start gap-3 p-4 rounded-xl font-mono text-sm text-left',
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
.git-tab {
  transform-origin: center center;
}
</style>
