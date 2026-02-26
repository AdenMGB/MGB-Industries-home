<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import {
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import { TrophyIcon as TrophyIconSolid } from '@heroicons/vue/24/solid'
import { useAuth } from '@/composables/useAuth'
import { api } from '@/api/client'
import { createTournamentWebSocket } from '@/composables/useTournamentWebSocket'
import { createTournamentControlWebSocket } from '@/composables/useTournamentControlWebSocket'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()

type View = 'join' | 'control' | 'lobby' | 'syncing' | 'playing' | 'ended'

const view = ref<View>('join')
const tournamentId = ref('')
const participantId = ref('')
const bracketIndex = ref(0)
const displayName = ref('')
const error = ref('')
const canStartTournament = computed(() => tournamentInfo.value?.canStart ?? false)
const brackets = ref<Array<{ bracketIndex: number; status: string; participantCount: number }>>([])
const bracketsLoading = ref(false)

const tournamentInfo = ref<{
  id: string
  name: string
  config: Record<string, unknown>
  bracketSize: number
  maxPlayers: number
  status: string
  participantCount: number
  canStart?: boolean
} | null>(null)

const wsConnected = ref(false)
const participants = ref<Array<{ id: string; displayName: string; score: number }>>([])
const roomStatus = ref<'lobby' | 'syncing' | 'playing' | 'ended'>('lobby')
const roomConfig = ref<Record<string, unknown> | null>(null)
const syncRound = ref(0)
const currentQuestion = ref<{ value: string; index: number } | null>(null)
const leaderboard = ref<Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>>([])
const answerFeedback = ref<'correct' | 'incorrect' | null>(null)
const gameEndedData = ref<{ leaderboard: Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>; reason?: string } | null>(null)

const boxValues = ref<string[]>(Array(8).fill(''))
const practiceInput = ref('')
const boxRefs = ref<(HTMLInputElement | null)[]>(Array(8).fill(null))
const boxContainerRef = ref<HTMLElement | null>(null)
const practiceInputRef = ref<HTMLInputElement | null>(null)
const boxShake = ref(false)

const powerTable = [128, 64, 32, 16, 8, 4, 2, 1]
const animEase = 'back.out(1.4)'
const animEaseBounce = 'elastic.out(1, 0.5)'

const tws = createTournamentWebSocket()
const controlWs = createTournamentControlWebSocket()

const conv = computed(() => (roomConfig.value?.conv as string) ?? 'binary-standalone')
const mode = computed(() => (roomConfig.value?.mode as string) ?? 'classic')
const boxCount = computed(() => {
  if (mode.value === 'nibble-sprint') return 4
  if (conv.value === 'ipv6-hextet') return 4
  if (conv.value.includes('hex')) return 2
  return 8
})
const useSegmentedBoxes = computed(() => conv.value !== 'ipv4-full')
const showPowerTable = computed(() => (roomConfig.value?.goalValue as Record<string, unknown> | undefined)?.showPowerTable !== false)
const powerOf2ForBoxes = computed(() => powerTable.slice(-boxCount.value))

function setBoxRef(i: number, el: unknown) {
  if (el && el instanceof HTMLInputElement) boxRefs.value[i] = el
}

function animateBoxTyped(index: number) {
  const el = boxRefs.value[index]
  if (!el) return
  gsap.fromTo(el, { scale: 1.15 }, { scale: 1, duration: 0.25, ease: animEase })
}

function animateBoxFocused(index: number) {
  const el = boxRefs.value[index]
  if (!el) return
  gsap.fromTo(el, { scale: 1.05 }, { scale: 1, duration: 0.2, ease: 'power2.out' })
}

function animateCorrect() {
  const container = boxContainerRef.value
  const input = practiceInputRef.value
  const targets = useSegmentedBoxes.value && container
    ? Array.from(container.querySelectorAll('input'))
    : input ? [input] : []
  if (targets.length === 0) return
  gsap.fromTo(targets, { scale: 1 }, { scale: 1.08, duration: 0.15, ease: 'power2.out' })
  gsap.to(targets, { scale: 1, duration: 0.35, ease: animEaseBounce, delay: 0.15 })
  gsap.fromTo(targets, { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' }, { boxShadow: '0 0 20px 4px rgba(34, 197, 94, 0.4)', duration: 0.2 })
  gsap.to(targets, { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)', duration: 0.4, delay: 0.2 })
}

function animateIncorrect() {
  const container = boxContainerRef.value
  const input = practiceInputRef.value
  const targets = useSegmentedBoxes.value && container
    ? Array.from(container.querySelectorAll('input'))
    : input ? [input] : []
  if (targets.length === 0) return
  gsap.fromTo(targets, { x: 0 }, { x: -10, duration: 0.05, ease: 'power2.in' })
  gsap.to(targets, { x: 10, duration: 0.05, delay: 0.05 })
  gsap.to(targets, { x: -8, duration: 0.05, delay: 0.1 })
  gsap.to(targets, { x: 8, duration: 0.05, delay: 0.15 })
  gsap.to(targets, { x: -5, duration: 0.05, delay: 0.2 })
  gsap.to(targets, { x: 0, duration: 0.12, ease: 'power2.out', delay: 0.25 })
  gsap.fromTo(targets, { boxShadow: '0 0 0 0 rgba(244, 63, 94, 0)' }, { boxShadow: '0 0 16px 2px rgba(244, 63, 94, 0.5)', duration: 0.1 })
  gsap.to(targets, { boxShadow: '0 0 0 0 rgba(244, 63, 94, 0)', duration: 0.5, delay: 0.15 })
}

function handleBoxInput(index: number, raw: string) {
  const isHex = conv.value.includes('hex') || conv.value === 'ipv6-hextet'
  let valid = isHex
    ? raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase()
    : raw.replace(/[^01]/g, '')
  if (!isHex && valid.length === 0 && raw.length === 1 && /[2-9]/.test(raw)) valid = raw === '2' ? '0' : '1'
  if (valid.length === 0) {
    if (raw.length === 0) boxValues.value[index] = ''
    return
  }
  if (valid.length === 1) {
    boxValues.value[index] = valid
    animateBoxTyped(index)
    if (index < boxCount.value - 1) nextTick(() => boxRefs.value[index + 1]?.focus())
    return
  }
  const chars = valid.split('').slice(0, boxCount.value)
  const arr = [...boxValues.value]
  for (let i = 0; i < boxCount.value; i++) arr[i] = chars[i] ?? ''
  boxValues.value = arr
  nextTick(() => {
    const lastIdx = Math.min(valid.length, boxCount.value) - 1
    animateBoxTyped(lastIdx)
    boxRefs.value[lastIdx]?.focus()
  })
}

function handleBoxKeydown(index: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && boxValues.value[index] === '') {
    e.preventDefault()
    if (index > 0) {
      boxValues.value[index - 1] = ''
      animateBoxFocused(index - 1)
      nextTick(() => boxRefs.value[index - 1]?.focus())
    }
    return
  }
  if (e.key === 'ArrowLeft' && index > 0) {
    e.preventDefault()
    animateBoxFocused(index - 1)
    nextTick(() => boxRefs.value[index - 1]?.focus())
    return
  }
  if (e.key === 'ArrowRight' && index < boxCount.value - 1) {
    e.preventDefault()
    animateBoxFocused(index + 1)
    nextTick(() => boxRefs.value[index + 1]?.focus())
    return
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault()
    const isHex = conv.value.includes('hex') || conv.value === 'ipv6-hextet'
    let valid = isHex
      ? e.key.replace(/[^0-9a-fA-F]/g, '').toUpperCase()
      : e.key.replace(/[^01]/g, '')
    if (!isHex && valid.length === 0 && /[2-9]/.test(e.key)) valid = e.key === '2' ? '0' : '1'
    if (valid.length === 0) return
    boxValues.value[index] = valid
    animateBoxTyped(index)
    if (index < boxCount.value - 1) nextTick(() => boxRefs.value[index + 1]?.focus())
  }
}

function getAnswerString(): string {
  return useSegmentedBoxes.value
    ? boxValues.value.slice(0, boxCount.value).join('')
    : practiceInput.value
}

function clearInput() {
  boxValues.value = Array(8).fill('')
  practiceInput.value = ''
}

function copyJoinLink() {
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/developer-tools/conversion-trainer/tournament/${tournamentId.value}`
  navigator.clipboard.writeText(url)
}

tws.setCallbacks({
  onRoomState: (data) => {
    participants.value = data.participants ?? []
    roomStatus.value = data.status as typeof roomStatus.value
    roomConfig.value = data.config as Record<string, unknown>
    syncRound.value = data.syncRound ?? 0
  },
  onSyncRoundComplete: (data) => {
    syncRound.value = data.round
    if (data.allReady && data.round < 3) syncRound.value = data.round + 1
  },
  onGameStarted: () => {
    roomStatus.value = 'playing'
  },
  onQuestion: (data) => {
    currentQuestion.value = data ? { value: data.value, index: data.index } : null
    answerFeedback.value = null
  },
  onAnswerResult: (data) => {
    answerFeedback.value = data?.correct ? 'correct' : 'incorrect'
  },
  onLeaderboard: (data) => {
    leaderboard.value = data ?? []
  },
  onGameEnded: (data) => {
    roomStatus.value = 'ended'
    gameEndedData.value = data ?? null
    currentQuestion.value = null
  },
})

async function joinTournament() {
  error.value = ''
  const id = tournamentId.value.toUpperCase().trim()
  const name = displayName.value.trim() || (isAuthenticated.value ? 'Player' : 'Guest')
  const res = await api.joinTournament(id, name)
  if (res.error) {
    error.value = res.error
    return
  }
  if (res.data) {
    tournamentId.value = res.data.tournamentId
    participantId.value = res.data.participantId
    bracketIndex.value = res.data.bracketIndex
    displayName.value = name
    await tws.connect(tournamentId.value, participantId.value)
    wsConnected.value = true
    view.value = 'lobby'
    if (roomStatus.value === 'syncing') view.value = 'syncing'
    if (roomStatus.value === 'playing') view.value = 'playing'
    if (roomStatus.value === 'ended') view.value = 'ended'
  }
}

async function loadTournamentInfo() {
  const id = (route.params.tournamentId as string)?.toUpperCase()
  if (!id) return
  tournamentId.value = id
  displayName.value = isAuthenticated.value ? 'Player' : 'Guest'
  error.value = ''
  const res = await api.getTournament(id)
  if (res.data) {
    tournamentInfo.value = res.data
    if (res.data.canStart) {
      view.value = 'control'
      await loadBrackets()
      // Only connect if not already connected (avoids loop: bracket_update -> loadTournamentInfo -> connect -> bracket_update)
      const alreadyConnected = controlWs.ws.value?.readyState === WebSocket.OPEN
      if (!alreadyConnected) {
        await connectControlPanel()
      }
    }
  } else {
    error.value = res.error ?? 'Tournament not found'
    tournamentInfo.value = null
  }
}

async function connectControlPanel() {
  if (!tournamentId.value || !isAuthenticated.value) return
  controlWs.setCallbacks({
    onBracketUpdate: () => {
      loadBrackets()
      loadTournamentInfo()
    },
  })
  try {
    await controlWs.connect(tournamentId.value)
  } catch {
    /* control panel works without WS - polling fallback */
  }
}

async function loadBrackets() {
  if (!tournamentId.value || !canStartTournament.value) return
  bracketsLoading.value = true
  const res = await api.getTournamentBrackets(tournamentId.value)
  if (res.data) brackets.value = res.data.brackets
  bracketsLoading.value = false
}

function goToTournament() {
  const code = tournamentId.value.trim().toUpperCase()
  if (code) {
    router.push({ name: 'ConversionTrainerTournamentJoin', params: { tournamentId: code } })
  }
}

async function startTournament() {
  if (!canStartTournament.value) return
  error.value = ''
  const res = await api.startTournament(tournamentId.value)
  if (res.error) {
    error.value = res.error
    return
  }
  await loadTournamentInfo()
  await loadBrackets()
}

function resetState() {
  participants.value = []
  roomStatus.value = 'lobby'
  roomConfig.value = null
  syncRound.value = 0
  currentQuestion.value = null
  leaderboard.value = []
  answerFeedback.value = null
  gameEndedData.value = null
  wsConnected.value = false
}

function leaveTournament() {
  tws.disconnect()
  controlWs.disconnect()
  resetState()
  view.value = 'join'
  tournamentId.value = ''
  participantId.value = ''
}

function submitAnswer() {
  const ans = getAnswerString()
  if (!ans.trim()) return
  tws.send('answer_submit', { answer: ans })
}

watch(roomStatus, (status) => {
  if (status === 'syncing') view.value = 'syncing'
  else if (status === 'playing') view.value = 'playing'
  else if (status === 'ended') view.value = 'ended'
})

watch(currentQuestion, (q) => {
  if (q) clearInput()
})

watch(answerFeedback, (fb) => {
  if (fb === 'correct') animateCorrect()
  else if (fb === 'incorrect') {
    animateIncorrect()
    boxShake.value = true
    setTimeout(() => { boxShake.value = false }, 500)
    clearInput()
    nextTick(() => {
      if (useSegmentedBoxes.value) boxRefs.value[0]?.focus()
      else practiceInputRef.value?.focus()
    })
  }
})

function resetCurrentQuestion() {
  clearInput()
  nextTick(() => {
    if (useSegmentedBoxes.value) boxRefs.value[0]?.focus()
    else practiceInputRef.value?.focus()
  })
}

function handlePlayingKeydown(e: KeyboardEvent) {
  if (view.value !== 'playing' || !currentQuestion.value) return
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    resetCurrentQuestion()
  }
}

watch(() => route.params.tournamentId, (id) => {
  if (id) {
    view.value = 'join'
    loadTournamentInfo()
  } else {
    tournamentInfo.value = null
    view.value = 'join'
  }
}, { immediate: true })

let controlPanelRefreshInterval: ReturnType<typeof setInterval> | null = null
watch([view, () => tournamentInfo.value?.status], ([v, status]) => {
  if (controlPanelRefreshInterval) {
    clearInterval(controlPanelRefreshInterval)
    controlPanelRefreshInterval = null
  }
  if (v === 'control' && status && status !== 'lobby' && status !== 'ended') {
    controlPanelRefreshInterval = setInterval(() => {
      loadTournamentInfo()
      loadBrackets()
    }, 3000)
  }
})

onMounted(() => {
  document.addEventListener('keydown', handlePlayingKeydown)
})

onBeforeUnmount(() => {
  if (controlPanelRefreshInterval) clearInterval(controlPanelRefreshInterval)
  document.removeEventListener('keydown', handlePlayingKeydown)
  tws.disconnect()
  controlWs.disconnect()
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8 bg-slate-50 dark:bg-gray-950">
    <div class="max-w-4xl mx-auto">
      <button
        @click="view === 'join' || view === 'control' ? router.push('/developer-tools') : leaveTournament()"
        class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-8 transition-colors"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        {{ view === 'join' || view === 'control' ? 'Back to Developer Tools' : 'Leave' }}
      </button>

      <!-- Join -->
      <div v-if="view === 'join'" class="space-y-8">
        <h1 class="text-5xl md:text-7xl font-light tracking-tight text-gray-800 dark:text-white">
          Tournament
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Join via the link shared by the tournament organizer. Up to 10,000 players in configurable brackets.
        </p>

        <div v-if="error" class="p-4 rounded-xl bg-coral/20 text-coral dark:text-rose-300">
          {{ error }}
        </div>

        <div v-if="!route.params.tournamentId" class="p-6 rounded-2xl bg-white/40 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter the tournament code from your invite link:</p>
          <div class="flex gap-2">
            <input
              v-model="tournamentId"
              type="text"
              placeholder="e.g. ABC12345"
              class="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono uppercase"
              @keydown.enter="goToTournament"
            />
            <button @click="goToTournament" class="px-6 py-2 rounded-xl font-semibold bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all">
              Go
            </button>
          </div>
        </div>

        <div v-else-if="tournamentInfo" class="p-6 rounded-2xl bg-white/40 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
          <h2 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{{ tournamentInfo.name }}</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {{ tournamentInfo.participantCount }} / {{ tournamentInfo.maxPlayers }} players
            · Bracket size: {{ tournamentInfo.bracketSize }}
            · Status: {{ tournamentInfo.status }}
          </p>
          <div v-if="tournamentInfo.status === 'lobby'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your name</label>
              <input
                v-model="displayName"
                type="text"
                :placeholder="isAuthenticated ? 'Your name' : 'Guest name'"
                class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            <button
              @click="joinTournament"
              class="w-full px-6 py-3 rounded-xl font-semibold bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all"
            >
              Join Tournament
            </button>
          </div>
          <p v-else class="text-amber-600 dark:text-amber-400">
            Tournament has {{ tournamentInfo.status === 'ended' ? 'ended' : 'already started' }}.
          </p>
        </div>

        <p v-else-if="route.params.tournamentId && !tournamentInfo" class="text-gray-500">Loading tournament...</p>
      </div>

      <!-- Control Panel (creator only) -->
      <div v-else-if="view === 'control'" class="space-y-6">
        <h1 class="text-3xl font-light text-gray-800 dark:text-white">Tournament Control Panel</h1>
        <div v-if="tournamentInfo" class="space-y-4">
          <div class="p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
            <h2 class="text-xl font-semibold mb-2 text-gray-800 dark:text-white">{{ tournamentInfo.name }}</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {{ tournamentInfo.participantCount }} / {{ tournamentInfo.maxPlayers }} players
              · Bracket size: {{ tournamentInfo.bracketSize }}
            </p>
            <div class="flex items-center gap-2">
              <span class="font-mono text-lg font-bold text-mint">{{ tournamentId }}</span>
              <button @click="copyJoinLink" class="p-2 rounded-lg hover:bg-mint/20 transition-colors" title="Copy link">
                <ClipboardDocumentIcon class="w-5 h-5" />
              </button>
            </div>
          </div>
          <div class="p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1">
              <TrophyIcon class="w-4 h-4" /> Brackets
            </h3>
            <div v-if="bracketsLoading" class="text-gray-500 text-sm">Loading...</div>
            <div v-else class="space-y-2">
              <div
                v-for="b in brackets"
                :key="b.bracketIndex"
                class="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-100/50 dark:bg-gray-700/30"
              >
                <span class="font-medium text-gray-800 dark:text-gray-200">Bracket {{ b.bracketIndex + 1 }}</span>
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ b.participantCount }} players</span>
                <span class="text-xs px-2 py-0.5 rounded" :class="{
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200': b.status === 'lobby',
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200': b.status === 'syncing' || b.status === 'playing',
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200': b.status === 'ended',
                }">{{ b.status }}</span>
              </div>
              <p v-if="!brackets.length" class="text-gray-500 text-sm">No brackets yet. Share the link for players to join.</p>
            </div>
          </div>
          <div v-if="error" class="p-4 rounded-xl bg-coral/20 text-coral dark:text-rose-300 text-sm">
            {{ error }}
          </div>
          <button
            v-if="canStartTournament"
            @click="startTournament"
            class="px-8 py-3 rounded-xl font-semibold bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all"
          >
            Start Tournament
          </button>
        </div>
      </div>

      <!-- Lobby -->
      <div v-else-if="view === 'lobby'" class="space-y-6">
        <h1 class="text-3xl font-light text-gray-800 dark:text-white">Bracket {{ bracketIndex + 1 }} Lobby</h1>
        <div class="flex items-center gap-4 p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
          <span class="font-mono text-2xl font-bold text-mint">{{ tournamentId }}</span>
          <button @click="copyJoinLink" class="p-2 rounded-lg hover:bg-mint/20 transition-colors" title="Copy link">
            <ClipboardDocumentIcon class="w-5 h-5" />
          </button>
        </div>
        <div class="p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            <UserGroupIcon class="w-4 h-4" /> Players in your bracket ({{ participants.length }})
          </h3>
          <div class="space-y-2">
            <div v-for="p in participants" :key="p.id" class="flex items-center gap-2 py-2">
              <span class="font-medium text-gray-800 dark:text-gray-200">{{ p.displayName }}</span>
              <span v-if="roomStatus === 'playing'" class="text-emerald-600 font-semibold">{{ p.score }}</span>
            </div>
          </div>
        </div>
        <p class="text-sm text-gray-500">Waiting for the tournament organizer to start. Only admins can start tournaments.</p>
        <div class="flex gap-4">
          <button v-if="canStartTournament" @click="startTournament" class="px-8 py-3 rounded-xl font-semibold bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all">
            Start Tournament
          </button>
          <button @click="leaveTournament" class="px-6 py-3 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            Leave
          </button>
        </div>
      </div>

      <!-- Syncing -->
      <div v-else-if="view === 'syncing'" class="space-y-8">
        <h1 class="text-3xl font-light text-gray-800 dark:text-white">Get Ready!</h1>
        <p class="text-lg text-gray-600 dark:text-gray-400">
          Syncing... round {{ syncRound || 1 }} of 3. Game will start automatically.
        </p>
        <div class="flex gap-2">
          <div
            v-for="r in 3"
            :key="r"
            class="w-3 h-3 rounded-full transition-all duration-300"
            :class="(syncRound || 0) >= r ? 'bg-mint' : 'bg-gray-300 dark:bg-gray-600'"
          />
        </div>
      </div>

      <!-- Playing -->
      <div v-else-if="view === 'playing'" class="flex flex-col lg:flex-row gap-6 items-stretch">
        <div class="flex-1 min-w-0 space-y-6">
          <div class="flex flex-wrap gap-4 items-center justify-between">
            <h1 class="text-2xl font-light text-gray-800 dark:text-white">Bracket {{ bracketIndex + 1 }}</h1>
            <div v-if="leaderboard.length" class="flex gap-4">
              <div v-for="(r, i) in leaderboard.slice(0, 5)" :key="i" class="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-100/50 dark:bg-amber-900/20">
                <TrophyIconSolid v-if="r.rank <= 3" class="w-4 h-4" :class="r.rank === 1 ? 'text-amber-500' : r.rank === 2 ? 'text-slate-400' : 'text-amber-700'" />
                <span class="font-medium text-gray-800 dark:text-gray-200">{{ r.displayName }}</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ r.score }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentQuestion" class="p-8 rounded-2xl bg-white/80 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-600">
            <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">Convert to {{ conv.includes('hex') ? 'hex' : 'binary' }}:</p>
            <p class="text-5xl md:text-7xl font-mono font-light text-emerald-700 dark:text-emerald-300 mb-8">
              {{ currentQuestion.value }}
            </p>
            <div class="flex gap-3 flex-wrap items-center">
              <div v-if="useSegmentedBoxes" class="flex flex-col items-center gap-2">
                <div ref="boxContainerRef" :class="cn('flex gap-1.5', boxShake && 'animate-shake')">
                  <input
                    v-for="(_, i) in boxCount"
                    :key="i"
                    :ref="(el) => setBoxRef(i, el)"
                    :value="boxValues[i]"
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    :class="cn(
                      'box-input w-12 h-14 rounded-xl border-2 font-mono text-xl text-center',
                      'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600',
                      'focus:outline-none focus:ring-2 focus:ring-mint',
                      answerFeedback === 'incorrect' && 'border-coral ring-2 ring-coral/30',
                      answerFeedback === 'correct' && 'border-emerald-400',
                    )"
                    @input="handleBoxInput(i, ($event.target as HTMLInputElement).value)"
                    @keydown="handleBoxKeydown(i, $event)"
                    @keydown.enter="submitAnswer"
                  />
                </div>
                <div v-if="showPowerTable && conv.includes('binary')" class="flex gap-1.5">
                  <div v-for="(val, i) in powerOf2ForBoxes" :key="i" class="w-12 text-center py-1 font-mono text-xs text-amber-700 dark:text-amber-300">
                    {{ val }}
                  </div>
                </div>
              </div>
              <input
                v-else
                ref="practiceInputRef"
                v-model="practiceInput"
                type="text"
                :placeholder="conv === 'ipv4-full' ? '11000000.10101000...' : conv === 'ipv6-hextet' ? '0ABC' : 'FF'"
                :class="cn(
                  'box-input flex-1 min-w-[280px] px-6 py-4 rounded-2xl border-2 font-mono text-xl',
                  'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600',
                  'focus:outline-none focus:ring-2 focus:ring-mint',
                  answerFeedback === 'incorrect' && 'border-coral',
                  answerFeedback === 'correct' && 'border-emerald-400',
                )"
                @keydown.enter="submitAnswer"
              />
              <button
                @click="submitAnswer"
                class="px-8 py-4 rounded-2xl font-semibold bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all"
              >
                Check
              </button>
            </div>
            <div v-if="answerFeedback" class="mt-4 flex items-center gap-2">
              <CheckIcon v-if="answerFeedback === 'correct'" class="w-6 h-6 text-emerald-500" />
              <XMarkIcon v-else class="w-6 h-6 text-coral" />
              <span :class="answerFeedback === 'correct' ? 'text-emerald-600' : 'text-coral'">
                {{ answerFeedback === 'correct' ? 'Correct!' : 'Try again' }}
              </span>
            </div>
            <p class="mt-2 text-xs text-slate-500">
              <kbd class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 font-mono text-xs">R</kbd> Reset
            </p>
          </div>
        </div>
      </div>

      <!-- Ended -->
      <div v-else-if="view === 'ended'" class="space-y-8">
        <h1 class="text-3xl font-light text-gray-800 dark:text-white">Bracket Complete</h1>
        <div class="p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrophyIcon class="w-6 h-6" /> Final Leaderboard
          </h3>
          <div class="space-y-3">
            <div
              v-for="r in (gameEndedData?.leaderboard ?? leaderboard)"
              :key="r.rank"
              class="flex items-center gap-3 py-2 px-4 rounded-xl"
              :class="r.rank <= 3 ? 'bg-amber-100/50 dark:bg-amber-900/20' : 'bg-gray-100/50 dark:bg-gray-800/30'"
            >
              <TrophyIconSolid v-if="r.rank <= 3" class="w-6 h-6" :class="r.rank === 1 ? 'text-amber-500' : r.rank === 2 ? 'text-slate-400' : 'text-amber-700'" />
              <span v-else class="w-6 text-center font-medium text-gray-600">{{ r.rank }}</span>
              <span class="flex-1 font-medium text-gray-800 dark:text-gray-200">{{ r.displayName }}</span>
              <span class="font-bold text-emerald-600">{{ r.score }}</span>
            </div>
          </div>
        </div>
        <button @click="leaveTournament" class="px-8 py-3 rounded-xl font-semibold bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all">
          Back
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.animate-shake { animation: shake 0.5s ease-in-out; }
.box-input { transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease; }
</style>
