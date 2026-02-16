<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ArrowsRightLeftIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useRouter, useRoute } from 'vue-router'
import GitRepoInput from '@/components/GitRepoInput.vue'
import GitEmbedSection from '@/components/GitEmbedSection.vue'
import { gitApi } from '@/api/git'
import { parseGitUrl } from '@/utils/git-url'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const router = useRouter()
const route = useRoute()

const repoUrl = ref((route.query.url as string) ?? '')
const branches = ref<Record<string, unknown>[]>([])
const baseBranch = ref((route.query.base as string) ?? '')
const headBranch = ref((route.query.head as string) ?? '')
const compareResult = ref<Record<string, unknown> | null>(null)
const loading = ref(false)
const error = ref('')
const repoInputRef = ref<InstanceType<typeof GitRepoInput> | null>(null)

watch(repoUrl, () => {
  branches.value = []
  baseBranch.value = ''
  headBranch.value = ''
  compareResult.value = null
  error.value = ''
})

watch(() => route.query.url, (url) => { if (url) repoUrl.value = url })
watch(() => route.query.base, (b) => { if (b) baseBranch.value = b })
watch(() => route.query.head, (h) => { if (h) headBranch.value = h })

function syncUrl() {
  const u = repoUrl.value.trim().replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/\/$/, '')
  if (!u || !baseBranch.value || !headBranch.value) return
  router.replace({
    path: route.path,
    query: { url: u, base: baseBranch.value, head: headBranch.value },
  })
}
watch([repoUrl, baseBranch, headBranch], syncUrl, { deep: true })

async function loadBranches() {
  if (!repoInputRef.value?.validate()) return
  loading.value = true
  error.value = ''
  const { data, error: err } = await gitApi.getBranches(repoUrl.value)
  loading.value = false
  if (err) {
    error.value = err
    return
  }
  branches.value = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
  const names = branches.value.map((b) => (b.name as string) ?? '').filter(Boolean)
  if (names.length && !baseBranch.value) baseBranch.value = names[0] ?? ''
  if (names.length > 1 && !headBranch.value) headBranch.value = names[1] ?? ''
}

async function compare() {
  if (!repoInputRef.value?.validate()) return
  if (!baseBranch.value || !headBranch.value) {
    error.value = 'Select base and head branches'
    return
  }
  loading.value = true
  error.value = ''
  const { data, error: err } = await gitApi.getCompare(repoUrl.value, baseBranch.value, headBranch.value)
  loading.value = false
  if (err) {
    error.value = err
    return
  }
  compareResult.value = data as Record<string, unknown>
}

function branchName(b: Record<string, unknown>): string {
  return (b.name as string) || ''
}

const aheadCommits = () => {
  const r = compareResult.value
  if (!r) return []
  const ahead = r.ahead_by as number | undefined
  const commits = r.commits as Record<string, unknown>[] | undefined
  if (commits && ahead) return commits.slice(0, ahead)
  return Array.isArray(commits) ? commits : []
}

const parsedRepo = computed(() => parseGitUrl(repoUrl.value))

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

function diffUrl(): string {
  const parsed = parsedRepo.value
  if (!parsed) return '#'
  return `https://${parsed.provider}.com/${parsed.owner}/${parsed.repo}/compare/${baseBranch.value}...${headBranch.value}`
}

const goBack = () => window.history.back()

onMounted(async () => {
  if (repoUrl.value && repoInputRef.value?.validate()) {
    await loadBranches()
    if (baseBranch.value && headBranch.value && branches.value.length) await compare()
  }
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
          Git Branch Compare
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Compare branches and view commits in head not in base.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-2">
            <ArrowsRightLeftIcon class="w-5 h-5 text-soft-blue" />
            <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Compare</h2>
          </div>
          <GitShareLink v-if="repoUrl.trim() && baseBranch && headBranch && compareResult" />
        </div>
        <div class="space-y-4">
          <GitRepoInput ref="repoInputRef" v-model="repoUrl" />
          <button
            @click="loadBranches"
            :disabled="loading"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-soft-blue/30 hover:bg-soft-blue/40 text-gray-800 dark:text-white',
              'transition-all duration-200 transform hover:scale-105 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )"
          >
            {{ loading ? 'Loading...' : 'Load Branches' }}
          </button>
          <p v-if="error && !branches.length" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
          <GitEmbedSection
            v-if="repoUrl.trim() && baseBranch && headBranch"
            :repo-url="repoUrl"
            tool-path="/developer-tools/git-compare"
            tool-label="Branch Compare"
            :extra-params="{ base: baseBranch, head: headBranch }"
          />
          <div v-if="branches.length" class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="git-base" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base branch</label>
                <select
                  id="git-base"
                  v-model="baseBranch"
                  :class="cn(
                    'w-full px-4 py-2 rounded-lg border text-sm',
                    'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                    'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
                  )"
                >
                  <option v-for="b in branches" :key="branchName(b as Record<string, unknown>)" :value="branchName(b as Record<string, unknown>)">
                    {{ branchName(b as Record<string, unknown>) }}
                  </option>
                </select>
              </div>
              <div>
                <label for="git-head" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Head branch</label>
                <select
                  id="git-head"
                  v-model="headBranch"
                  :class="cn(
                    'w-full px-4 py-2 rounded-lg border text-sm',
                    'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                    'text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
                  )"
                >
                  <option v-for="b in branches" :key="branchName(b as Record<string, unknown>)" :value="branchName(b as Record<string, unknown>)">
                    {{ branchName(b as Record<string, unknown>) }}
                  </option>
                </select>
              </div>
            </div>
            <button
              @click="compare"
              :disabled="loading"
              :class="cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-soft-blue/30 hover:bg-soft-blue/40 text-gray-800 dark:text-white',
                'transition-all duration-200 transform hover:scale-105 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )"
            >
              {{ loading ? 'Comparing...' : 'Compare' }}
            </button>
            <p v-if="error && branches.length" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
            <div v-if="compareResult" class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ baseBranch }}...{{ headBranch }}: {{ aheadCommits().length }} commits ahead
                </span>
                <a
                  :href="diffUrl()"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-soft-blue hover:underline"
                >
                  View diff on {{ parsedRepo?.provider ?? 'Git' }}
                </a>
              </div>
              <button
                v-for="c in aheadCommits()"
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
  </div>
</template>

<style scoped>
.tool-card {
  transform-origin: center center;
}
</style>
