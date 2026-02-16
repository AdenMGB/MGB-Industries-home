<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'
import { gitApi } from '@/api/git'
import { parseGitUrl } from '@/utils/git-url'
import GitShareLink from '@/components/GitShareLink.vue'

const route = useRoute()
const router = useRouter()

const repoUrl = ref('')
const sha = ref('')
const commit = ref<Record<string, unknown> | null>(null)
const loading = ref(false)
const error = ref('')
const selectedFile = ref(0)

const files = ref<Record<string, unknown>[]>([])

const commitMessage = ref('')
const fullMessage = ref('')
const authorName = ref('')
const commitDate = ref('')
const shortSha = ref('')

const parsed = ref<ReturnType<typeof parseGitUrl>>(null)

const commitUrl = ref('#')

const selectedFileData = ref<Record<string, unknown> | null>(null)

function fileName(f: Record<string, unknown>): string {
  return (f.filename as string) || (f.new_path as string) || (f.old_path as string) || 'unknown'
}

function fileStatus(f: Record<string, unknown>): string {
  return (f.status as string) || 'modified'
}

function statusColor(status: string): string {
  if (status === 'added') return 'text-green-600 dark:text-green-400'
  if (status === 'removed') return 'text-red-600 dark:text-red-400'
  if (status === 'renamed') return 'text-amber-600 dark:text-amber-400'
  return 'text-gray-600 dark:text-gray-400'
}

async function loadCommit() {
  const url = repoUrl.value
  const hash = sha.value
  if (!url || !hash) {
    error.value = 'Missing repo URL or commit SHA'
    return
  }
  loading.value = true
  error.value = ''
  commit.value = null
  selectedFile.value = 0
  const { data, error: err } = await gitApi.getCommit(url, hash)
  loading.value = false
  if (err) {
    error.value = err
    return
  }
  const c = data as Record<string, unknown>
  commit.value = c

  const commitObj = c.commit as Record<string, unknown> | undefined
  const msg = commitObj?.message as string | undefined
  fullMessage.value = msg || ''
  commitMessage.value = msg ? msg.split('\n')[0] ?? '' : ''

  const author = commitObj?.author as Record<string, unknown> | undefined
  authorName.value = author?.name ? String(author.name) : (c.author as Record<string, unknown>)?.login as string || 'Unknown'
  const d = author?.date as string | undefined
  commitDate.value = d ? new Date(d).toLocaleString() : ''

  shortSha.value = (c.sha as string)?.slice(0, 7) || ''
  parsed.value = parseGitUrl(url)
  commitUrl.value = (c.html_url as string) || (parsed.value ? `https://${parsed.value.provider}.com/${parsed.value.owner}/${parsed.value.repo}/commit/${hash}` : '#')

  const f = c.files as Record<string, unknown>[] | undefined
  files.value = Array.isArray(f) ? f : []
  selectedFileData.value = files.value[0] ?? null
}

watch(selectedFile, (idx) => {
  selectedFileData.value = files.value[idx] ?? null
})

onMounted(() => {
  repoUrl.value = (route.query.url as string) || ''
  sha.value = (route.query.sha as string) || ''
  loadCommit()
  gsap.fromTo('.page-header', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
  gsap.fromTo('.commit-card', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.1, ease: 'power2.out' })
})

watch(
  () => [route.query.url, route.query.sha],
  ([url, hash]) => {
    repoUrl.value = (url as string) || ''
    sha.value = (hash as string) || ''
    if (repoUrl.value && sha.value) loadCommit()
  },
)

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/developer-tools')
  }
}
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

      <div class="page-header mb-8">
        <h1 class="text-3xl md:text-5xl font-light tracking-tight text-gray-800 dark:text-white">
          Commit {{ shortSha || sha }}
        </h1>
      </div>

      <div v-if="loading" class="py-16 text-center text-gray-500 dark:text-gray-400">
        Loading commit...
      </div>

      <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

      <div v-else-if="commit" class="commit-card space-y-6">
        <div class="p-6 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <p class="font-medium text-gray-800 dark:text-white text-lg">{{ commitMessage }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ authorName }} · {{ commitDate }}</p>
              <pre v-if="fullMessage !== commitMessage" class="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap mt-2 p-3 rounded-lg bg-gray-100/50 dark:bg-gray-700/50">{{ fullMessage }}</pre>
            </div>
            <div class="flex items-center gap-2">
              <GitShareLink v-if="repoUrl && sha" />
              <a
                :href="commitUrl"
                target="_blank"
                rel="noopener noreferrer"
                :class="cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                  'text-soft-blue hover:bg-soft-blue/10 transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
                )"
              >
                <ArrowTopRightOnSquareIcon class="w-5 h-5" />
                View on {{ parsed?.provider ?? 'Git' }}
              </a>
            </div>
          </div>
        </div>

        <div v-if="files.length" class="space-y-4">
          <h2 class="text-lg font-medium text-gray-700 dark:text-gray-300">Files changed ({{ files.length }})</h2>
          <div class="flex flex-col lg:flex-row gap-6">
            <div class="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible lg:w-56 shrink-0">
              <button
                v-for="(f, i) in files"
                :key="fileName(f)"
                @click="selectedFile = i"
                :class="cn(
                  'text-left px-3 py-2 rounded-lg text-sm font-mono truncate transition-colors duration-200 shrink-0',
                  selectedFile === i
                    ? 'bg-soft-blue/20 text-soft-blue dark:bg-soft-blue/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-600/50',
                )"
              >
                <span :class="statusColor(fileStatus(f))">
                  {{ fileStatus(f) === 'added' ? '+' : fileStatus(f) === 'removed' ? '−' : ' ' }}
                </span>
                {{ fileName(f) }}
              </button>
            </div>
            <div class="flex-1 min-w-0">
              <div
                v-if="selectedFileData"
                class="rounded-xl bg-gray-900 dark:bg-gray-950 overflow-hidden border border-gray-700/50"
              >
                <div class="p-3 font-mono text-xs text-gray-400 border-b border-gray-700 flex items-center gap-2">
                  {{ fileName(selectedFileData) }}
                  <span v-if="selectedFileData.additions !== undefined" class="text-green-400">+{{ selectedFileData.additions }}</span>
                  <span v-if="selectedFileData.deletions !== undefined" class="text-red-400">−{{ selectedFileData.deletions }}</span>
                </div>
                <pre class="p-4 text-sm overflow-x-auto overflow-y-auto max-h-[60vh]"><code
                  v-for="(line, idx) in ((selectedFileData.patch as string) || '').split('\n')"
                  :key="idx"
                  :class="cn(
                    'block font-mono',
                    line.startsWith('+') && !line.startsWith('+++') && 'text-green-400 bg-green-950/30',
                    line.startsWith('-') && !line.startsWith('---') && 'text-red-400 bg-red-950/30',
                  )"
                >{{ line || ' ' }}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
