<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ArrowLeftIcon, ClockIcon } from '@heroicons/vue/24/outline'
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
const branch = ref((route.query.sha as string) ?? '')
const commits = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const hasMore = ref(true)
const repoInputRef = ref<InstanceType<typeof GitRepoInput> | null>(null)

async function loadCommits(reset = false) {
  if (!repoUrl.value.trim()) return
  if (reset) {
    page.value = 1
    commits.value = []
    hasMore.value = true
  }
  loading.value = true
  error.value = ''
  const { data, error: err } = await gitApi.getCommits(repoUrl.value, {
    page: page.value,
    per_page: 30,
    ...(branch.value && { sha: branch.value }),
  })
  loading.value = false
  if (err) {
    error.value = err
    return
  }
  if (Array.isArray(data)) {
    const arr = data as Record<string, unknown>[]
    commits.value = reset ? arr : [...commits.value, ...arr]
    hasMore.value = data.length >= 30
    if (data.length >= 30) page.value++
  }
}

async function onAnalyze() {
  if (!repoInputRef.value?.validate()) return
  await loadCommits(true)
}

function openCommitDetails(c: Record<string, unknown>) {
  const hash = c.sha as string | undefined
  if (hash && repoUrl.value) {
    router.push({ path: '/developer-tools/git-commit', query: { url: repoUrl.value, sha: hash } })
  }
}

function authorName(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const author = commit?.author as Record<string, unknown> | undefined
  if (author?.name) return String(author.name)
  const u = c.author as Record<string, unknown> | undefined
  return (u?.login as string) || 'Unknown'
}

function commitDate(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const author = commit?.author as Record<string, unknown> | undefined
  const d = author?.date as string | undefined
  if (d) return new Date(d).toLocaleDateString()
  return ''
}

function commitTime(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const author = commit?.author as Record<string, unknown> | undefined
  const d = author?.date as string | undefined
  if (d) return new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return ''
}

function shortSha(c: Record<string, unknown>): string {
  const s = c.sha as string | undefined
  return s ? s.slice(0, 7) : ''
}

function message(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const msg = commit?.message as string | undefined
  return msg ? msg.split('\n')[0] ?? '' : ''
}

function formatTimelineDate(c: Record<string, unknown>): string {
  const commit = c.commit as Record<string, unknown> | undefined
  const author = commit?.author as Record<string, unknown> | undefined
  const d = author?.date as string | undefined
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

const goBack = () => window.history.back()

watch(
  () => route.query.url,
  (url) => { if (url) repoUrl.value = url },
)
watch(
  () => route.query.sha,
  (sha) => { if (sha) branch.value = sha },
)

function syncUrl() {
  const u = repoUrl.value.trim().replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/\/$/, '')
  if (!u) return
  const query: Record<string, string> = { url: u }
  if (branch.value) query.sha = branch.value
  router.replace({ path: route.path, query })
}
watch([repoUrl, branch], syncUrl, { deep: true })

onMounted(async () => {
  await nextTick()
  if (repoUrl.value && repoInputRef.value) {
    if (repoInputRef.value.validate()) {
      loadCommits(true)
    } else if (route.query.url && repoInputRef.value.parsed) {
      repoInputRef.value.addToRecent?.()
    }
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
          Git History
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Visualize commit history for any public GitHub or GitLab repository.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-2">
            <ClockIcon class="w-5 h-5 text-soft-blue" />
            <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Timeline</h2>
          </div>
          <GitShareLink v-if="repoUrl.trim() && commits.length" />
        </div>
        <div class="space-y-4">
          <GitRepoInput ref="repoInputRef" v-model="repoUrl" />
          <GitBranchSelect v-model="branch" :repo-url="repoUrl" label="Branch" />
          <button
            @click="onAnalyze"
            :disabled="loading"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-soft-blue/30 hover:bg-soft-blue/40 text-gray-800 dark:text-white',
              'transition-all duration-200 transform hover:scale-105 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )"
          >
            {{ loading ? 'Loading...' : 'Load History' }}
          </button>
          <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
          <GitEmbedSection
            v-if="repoUrl.trim()"
            :repo-url="repoUrl"
            tool-path="/developer-tools/git-history"
            tool-label="Git History"
            :extra-params="branch ? { sha: branch } : undefined"
          />

          <!-- Timeline -->
          <div v-if="commits.length" class="relative">
            <div
              class="absolute left-4 md:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-soft-blue/50 via-soft-blue/30 to-transparent"
              aria-hidden="true"
            />
            <div class="space-y-0">
              <div
                v-for="(c, i) in commits"
                :key="(c.sha as string)"
                class="relative flex gap-4 md:gap-6 pl-10 md:pl-14 py-4 group"
              >
                <!-- Timeline dot -->
                <div
                  class="absolute left-2 md:left-4 top-6 w-4 h-4 rounded-full border-2 border-soft-blue/60 bg-white dark:bg-gray-800 -translate-x-1/2 shrink-0 transition-all duration-200 group-hover:scale-125 group-hover:border-soft-blue group-hover:bg-soft-blue/20"
                />
                <!-- Date label -->
                <div
                  class="absolute left-0 top-5 text-xs font-medium text-gray-500 dark:text-gray-400 w-8 md:w-10 text-right -translate-x-full pr-2"
                >
                  {{ formatTimelineDate(c) }}
                </div>
                <!-- Commit card -->
                <button
                  @click="openCommitDetails(c)"
                  :class="cn(
                    'flex-1 text-left p-4 rounded-lg font-mono text-sm',
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
                      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {{ authorName(c) }} · {{ commitDate(c) }} {{ commitTime(c) }}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <button
              v-if="hasMore && !loading"
              @click="loadCommits(false)"
              :class="cn(
                'w-full py-3 mt-4 rounded-lg text-sm text-gray-600 dark:text-gray-400',
                'hover:bg-gray-200/50 dark:hover:bg-gray-600/50 transition-colors duration-200',
              )"
            >
              Load more
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
