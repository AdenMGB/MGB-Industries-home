<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { ChartBarIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import GitRepoInput from '@/components/GitRepoInput.vue'
import { gitApi } from '@/api/git'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const router = useRouter()

const repoUrl = ref('')
const contributors = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const error = ref('')
const repoInputRef = ref<InstanceType<typeof GitRepoInput> | null>(null)

async function loadStats() {
  if (!repoInputRef.value?.validate()) return
  loading.value = true
  error.value = ''
  const { data, error: err } = await gitApi.getContributors(repoUrl.value)
  loading.value = false
  if (err) {
    error.value = err
    return
  }
  contributors.value = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
}

const totalCommits = () => {
  return contributors.value.reduce((s, c) => s + (Number((c as Record<string, unknown>).contributions) || 0), 0)
}

function contributorName(c: Record<string, unknown>): string {
  const login = c.login as string | undefined
  const name = (c as Record<string, unknown>).name as string | undefined
  return name || login || 'Anonymous'
}

function contributorAvatar(c: Record<string, unknown>): string {
  const avatar = (c as Record<string, unknown>).avatar_url as string | undefined
  return avatar || ''
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
          'focus:outline-none focus:ring-2 focus:ring-soft-blue/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Git Commit Stats
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          View commit statistics per contributor for any public repository.
        </p>
      </div>

      <div class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-6">
          <ChartBarIcon class="w-5 h-5 text-soft-blue" />
          <h2 class="text-xl font-light text-gray-800 dark:text-gray-200">Stats</h2>
        </div>
        <div class="space-y-4">
          <GitRepoInput ref="repoInputRef" v-model="repoUrl" />
          <button
            @click="loadStats"
            :disabled="loading"
            :class="cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-soft-blue/30 hover:bg-soft-blue/40 text-gray-800 dark:text-white',
              'transition-all duration-200 transform hover:scale-105 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-soft-blue/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )"
          >
            {{ loading ? 'Loading...' : 'Load Stats' }}
          </button>
          <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
          <div v-if="contributors.length" class="space-y-4">
            <div class="p-4 rounded-lg bg-soft-blue/10 dark:bg-soft-blue/5 border border-soft-blue/20">
              <p class="text-2xl font-light text-gray-800 dark:text-white">{{ totalCommits() }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Total commits</p>
            </div>
            <div class="space-y-2">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">By contributor</p>
              <div
                v-for="c in contributors"
                :key="contributorName(c as Record<string, unknown>)"
                :class="cn(
                  'flex items-center gap-3 p-4 rounded-lg',
                  'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                )"
              >
                <img
                  v-if="contributorAvatar(c as Record<string, unknown>)"
                  :src="contributorAvatar(c as Record<string, unknown>)"
                  :alt="contributorName(c as Record<string, unknown>)"
                  class="w-8 h-8 rounded-full"
                />
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-800 dark:text-gray-200">{{ contributorName(c as Record<string, unknown>) }}</p>
                </div>
                <span class="font-mono text-sm text-gray-600 dark:text-gray-400">
                  {{ (c as Record<string, unknown>).contributions ?? 0 }} commits
                </span>
              </div>
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
