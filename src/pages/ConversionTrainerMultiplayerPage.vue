<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  PlayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
  TrophyIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
} from '@heroicons/vue/24/outline'
import { TrophyIcon as TrophyIconSolid } from '@heroicons/vue/24/solid'
import { useAuth } from '@/composables/useAuth'
import { api } from '@/api/client'
import { createMultiplayerWebSocket } from '@/composables/useMultiplayerWebSocket'
import ConversionBoxInput from '@/components/ConversionBoxInput.vue'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()

type View =
  | 'create-join'
  | 'lobby'
  | 'syncing'
  | 'playing'
  | 'spectating'
  | 'ended'

const view = ref<View>('create-join')
const roomCode = ref('')
const participantId = ref('')
const displayName = ref('')
const joinPassword = ref('')
const joinAsSpectator = ref(false)
const error = ref('')
const isHost = ref(false)

// WebSocket state - all in component for reliable reactivity
const wsConnected = ref(false)
const participants = ref<Array<{ id: string; displayName: string; role: string; score: number; isHost?: boolean }>>([])
const roomStatus = ref<'lobby' | 'syncing' | 'playing' | 'ended'>('lobby')
const roomConfig = ref<{ mode: string; conv: string; goalType: string; goalValue: Record<string, unknown> } | null>(null)
const showLeaderboard = ref(true)
const syncRound = ref(0)
const currentQuestion = ref<{ value: string; index: number } | null>(null)
const leaderboard = ref<Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>>([])
const chatMessages = ref<Array<{ participantId: string; displayName: string; message: string; timestamp: string }>>([])
const answerFeedback = ref<'correct' | 'incorrect' | null>(null)
const gameEndedData = ref<{ leaderboard: Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>; reason?: string } | null>(null)

// Create form
const createMode = ref('classic')
const createConv = ref('binary-standalone')
const createGoalType = ref('first_to')
const createGoalValue = ref({ firstTo: 10, timeSeconds: 60, lives: 3 })
const createVisibility = ref('private')
const createPassword = ref('')
const createMaxPlayers = ref(32)
const createShowLeaderboard = ref(true)
const createShowPowerTable = ref(true)

// Input state for game
const conversionBoxRef = ref<InstanceType<typeof ConversionBoxInput> | null>(null)
const chatInput = ref('')
const chatMessagesRef = ref<HTMLElement | null>(null)

const mp = createMultiplayerWebSocket()

const conv = computed(() => roomConfig.value?.conv ?? 'binary-standalone')
const mode = computed(() => roomConfig.value?.mode ?? 'classic')
const showPowerTable = computed(() => (roomConfig.value?.goalValue as Record<string, unknown> | undefined)?.showPowerTable !== false)

const conversionTypes = [
  { id: 'binary-standalone', label: 'Binary' },
  { id: 'binary-octet', label: 'Binary (octet)' },
  { id: 'hex-standalone', label: 'Hex' },
  { id: 'hex-octet', label: 'Hex (octet)' },
  { id: 'ipv4-full', label: 'IPv4 → Binary' },
  { id: 'ipv6-hextet', label: 'IPv6 → Hex' },
]

const gameModes = [
  { id: 'classic', label: 'Classic' },
  { id: 'speed-round', label: 'Speed Round' },
  { id: 'survival', label: 'Survival' },
  { id: 'streak-challenge', label: 'Streak Challenge' },
  { id: 'nibble-sprint', label: 'Nibble Sprint' },
]

function copyRoomCode() {
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/developer-tools/conversion-trainer/multiplayer/${roomCode.value}`
  navigator.clipboard.writeText(url)
}

function getGoalValue(): Record<string, unknown> {
  const g: Record<string, unknown> = {}
  if (createGoalType.value === 'first_to') g.firstTo = createGoalValue.value.firstTo ?? 10
  if (['most_in_time', 'timed'].includes(createGoalType.value)) g.timeSeconds = createGoalValue.value.timeSeconds ?? 60
  if (createGoalType.value === 'survival') g.lives = createGoalValue.value.lives ?? 3
  if (createGoalType.value === 'streak') g.streak = true
  g.showPowerTable = createShowPowerTable.value
  return g
}

function resetRoomState() {
  participants.value = []
  roomStatus.value = 'lobby'
  roomConfig.value = null
  showLeaderboard.value = true
  syncRound.value = 0
  currentQuestion.value = null
  leaderboard.value = []
  chatMessages.value = []
  answerFeedback.value = null
  gameEndedData.value = null
  wsConnected.value = false
}

mp.setCallbacks({
  onRoomState: (data) => {
    participants.value = data.participants ?? []
    roomStatus.value = data.status as typeof roomStatus.value
    roomConfig.value = data.config ?? null
    showLeaderboard.value = data.showLeaderboard ?? true
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
  onChatMessage: (data) => {
    if (data) {
      chatMessages.value = [...chatMessages.value, data].slice(-100)
    }
  },
  onGameEnded: (data) => {
    roomStatus.value = 'ended'
    gameEndedData.value = data ?? null
    currentQuestion.value = null
  },
})

async function createRoom() {
  error.value = ''
  const name = displayName.value.trim() || (isAuthenticated.value ? 'Player' : 'Guest')
  const res = await api.createMultiplayerRoom({
    mode: createMode.value,
    conv: createConv.value,
    goalType: createGoalType.value,
    goalValue: getGoalValue(),
    visibility: createVisibility.value,
    password: createPassword.value || undefined,
    maxPlayers: createMaxPlayers.value,
    showLeaderboard: createShowLeaderboard.value,
    showPowerTable: createShowPowerTable.value,
    displayName: name,
  })
  if (res.error) {
    error.value = res.error
    return
  }
  if (res.data) {
    roomCode.value = res.data.roomCode
    participantId.value = res.data.participantId
    isHost.value = true
    displayName.value = name
    await connectAndEnter(res.data.roomId, res.data.participantId)
  }
}

async function joinRoom(code?: string) {
  error.value = ''
  const codeToUse = (code ?? roomCode.value).toUpperCase().trim()
  const name = displayName.value.trim() || 'Guest'
  const res = await api.joinMultiplayerRoom({
    roomCode: codeToUse,
    password: joinPassword.value || undefined,
    displayName: name,
    asSpectator: joinAsSpectator.value,
  })
  if (res.error) {
    error.value = res.error
    return
  }
  if (res.data) {
    roomCode.value = res.data.roomId
    participantId.value = res.data.participantId
    displayName.value = name
    isHost.value = false
    await connectAndEnter(res.data.roomId, res.data.participantId)
    if (joinAsSpectator.value) view.value = 'spectating'
  }
}

async function connectAndEnter(rid: string, pid: string) {
  resetRoomState()
  await mp.connect(rid, pid)
  wsConnected.value = true
  view.value = 'lobby'
  if (roomStatus.value === 'syncing') view.value = 'syncing'
  if (roomStatus.value === 'playing') {
    view.value = joinAsSpectator.value ? 'spectating' : 'playing'
  }
  if (roomStatus.value === 'ended') view.value = 'ended'
}

async function startGame() {
  if (!isHost.value) return
  const res = await api.startMultiplayerGame(roomCode.value, participantId.value)
  if (res.error) {
    error.value = res.error
    return
  }
  view.value = 'syncing'
}

function submitAnswer(payload?: { answer: string }) {
  const ans = payload?.answer ?? conversionBoxRef.value?.getAnswer() ?? ''
  if (!ans.trim()) return
  mp.send('answer_submit', { answer: ans })
}

function sendChatMessage() {
  const msg = chatInput.value.trim()
  if (!msg) return
  mp.send('chat', { message: msg })
  chatInput.value = ''
}

function endGameEarly() {
  mp.send('end_game_request')
}

function leaveRoom() {
  mp.disconnect()
  resetRoomState()
  view.value = 'create-join'
  roomCode.value = ''
  participantId.value = ''
}

watch(roomStatus, (status) => {
  if (status === 'syncing') view.value = 'syncing'
  else if (status === 'playing') view.value = joinAsSpectator.value ? 'spectating' : 'playing'
  else if (status === 'ended') view.value = 'ended'
})

watch(currentQuestion, (q) => {
  if (q) conversionBoxRef.value?.clear()
})

watch(chatMessages, () => {
  nextTick(() => {
    const el = chatMessagesRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}, { flush: 'post', deep: true })

watch(answerFeedback, (fb) => {
  if (fb === 'incorrect') {
    conversionBoxRef.value?.clear()
    nextTick(() => conversionBoxRef.value?.focus())
  }
})

function resetCurrentQuestion() {
  conversionBoxRef.value?.clear()
  nextTick(() => conversionBoxRef.value?.focus())
}

function handlePlayingKeydown(e: KeyboardEvent) {
  if (view.value !== 'playing' || !currentQuestion.value) return
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' && target.getAttribute('placeholder')?.includes('Type a message')) return
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    resetCurrentQuestion()
  }
}

onMounted(() => {
  const code = route.params.roomCode as string
  if (code) {
    roomCode.value = code
    displayName.value = isAuthenticated.value ? 'Player' : 'Guest'
  }
  document.addEventListener('keydown', handlePlayingKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handlePlayingKeydown)
  mp.disconnect()
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8 bg-slate-50 dark:bg-gray-950">
    <div class="max-w-4xl mx-auto">
      <button
        @click="view === 'create-join' ? router.push('/developer-tools') : leaveRoom()"
        class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-8 transition-colors"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        {{ view === 'create-join' ? 'Back to Developer Tools' : 'Leave' }}
      </button>

      <!-- Create / Join -->
      <div v-if="view === 'create-join'" class="space-y-8">
        <h1 class="text-5xl md:text-7xl font-light tracking-tight text-gray-800 dark:text-white">
          Multiplayer Conversion Trainer
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Create a room or join with a shareable link. Up to 32 players. Play as guest or sign in.
        </p>

        <div v-if="error" class="p-4 rounded-xl bg-coral/20 text-coral dark:text-rose-300">
          {{ error }}
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- Create -->
          <div class="p-6 rounded-2xl bg-white/40 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
            <h2 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
              <PlayIcon class="w-5 h-5 text-mint" />
              Create Room
            </h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your name</label>
                <input
                  v-model="displayName"
                  type="text"
                  :placeholder="isAuthenticated ? 'Your name' : 'Guest name'"
                  class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game mode</label>
                <select v-model="createMode" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  <option v-for="m in gameModes" :key="m.id" :value="m.id">{{ m.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conversion type</label>
                <select v-model="createConv" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  <option v-for="c in conversionTypes" :key="c.id" :value="c.id">{{ c.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal</label>
                <select v-model="createGoalType" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  <option value="first_to">First to N correct</option>
                  <option value="most_in_time">Most in time limit</option>
                  <option value="survival">Survival (lives)</option>
                  <option value="streak">Best streak</option>
                  <option value="timed">Timed</option>
                </select>
              </div>
              <div v-if="createGoalType === 'first_to'">
                <input v-model.number="createGoalValue.firstTo" type="number" min="1" max="100" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>
              <div v-if="['most_in_time','timed'].includes(createGoalType)">
                <input v-model.number="createGoalValue.timeSeconds" type="number" min="10" max="600" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>
              <div v-if="createGoalType === 'survival'">
                <input v-model.number="createGoalValue.lives" type="number" min="1" max="10" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibility</label>
                <select v-model="createVisibility" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  <option value="private">Private (link only)</option>
                  <option value="public">Public</option>
                  <option value="public_password">Public + Password</option>
                </select>
              </div>
              <div v-if="createVisibility === 'public_password'">
                <input v-model="createPassword" type="password" placeholder="Password" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>
              <div class="flex items-center gap-2">
                <input v-model="createShowLeaderboard" type="checkbox" id="show-lb" />
                <label for="show-lb" class="text-sm text-gray-600 dark:text-gray-400">Show leaderboard during game</label>
              </div>
              <div class="flex items-center gap-2">
                <input v-model="createShowPowerTable" type="checkbox" id="show-power-table" />
                <label for="show-power-table" class="text-sm text-gray-600 dark:text-gray-400">Show power-of-2 table under binary boxes</label>
              </div>
              <button
                @click="createRoom"
                class="w-full px-6 py-3 rounded-xl font-semibold bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all"
              >
                Create & Join
              </button>
            </div>
          </div>

          <!-- Join -->
          <div class="p-6 rounded-2xl bg-white/40 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
            <h2 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
              <UserGroupIcon class="w-5 h-5 text-lavender" />
              Join Room
            </h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room code</label>
                <input
                  v-model="roomCode"
                  type="text"
                  placeholder="ABC123"
                  maxlength="6"
                  class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono uppercase"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your name</label>
                <input
                  v-model="displayName"
                  type="text"
                  placeholder="Guest"
                  class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password (if required)</label>
                <input v-model="joinPassword" type="password" placeholder="Room password" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>
              <div class="flex items-center gap-2">
                <input v-model="joinAsSpectator" type="checkbox" id="spectator" />
                <label for="spectator" class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <EyeIcon class="w-4 h-4" /> Join as spectator
                </label>
              </div>
              <button
                @click="joinRoom()"
                class="w-full px-6 py-3 rounded-xl font-semibold bg-lavender/60 text-violet-800 dark:text-violet-200 hover:bg-lavender/80 transition-all"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lobby -->
      <div v-else-if="view === 'lobby'" class="space-y-6">
        <h1 class="text-3xl font-light text-gray-800 dark:text-white">Lobby</h1>
        <div class="flex items-center gap-4 p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
          <span class="font-mono text-2xl font-bold text-mint">{{ roomCode }}</span>
          <button @click="copyRoomCode" class="p-2 rounded-lg hover:bg-mint/20 transition-colors" title="Copy link">
            <ClipboardDocumentIcon class="w-5 h-5" />
          </button>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Share this link to invite players
        </p>
        <div class="p-4 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Players ({{ participants.length }})</h3>
          <div class="space-y-2">
            <div
              v-for="p in participants"
              :key="p.id"
              class="flex items-center gap-2 py-2"
            >
              <span class="font-medium text-gray-800 dark:text-gray-200">{{ p.displayName }}</span>
              <span v-if="p.isHost" class="text-xs px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">Host</span>
              <span v-if="p.role === 'spectator'" class="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">Spectator</span>
            </div>
          </div>
        </div>
        <div v-if="isHost" class="flex gap-4">
          <button
            @click="startGame"
            class="px-8 py-3 rounded-xl font-semibold bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all"
          >
            Start Game
          </button>
          <button
            @click="leaveRoom"
            class="px-6 py-3 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
          >
            Leave
          </button>
        </div>
        <div v-else>
          <button @click="leaveRoom" class="px-6 py-3 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
            Leave
          </button>
        </div>
      </div>

      <!-- Syncing (automatic - no user input) -->
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
          <h1 class="text-2xl font-light text-gray-800 dark:text-white">Playing</h1>
          <div v-if="showLeaderboard && leaderboard.length" class="flex gap-4">
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
          <ConversionBoxInput
            ref="conversionBoxRef"
            :conv="conv"
            :mode="mode"
            :show-power-table="showPowerTable"
            :feedback="answerFeedback"
            :shake="answerFeedback === 'incorrect'"
            submit-label="Check"
            @submit="(p) => submitAnswer(p)"
          />
          <div v-if="answerFeedback" class="mt-4 flex items-center gap-2">
            <CheckIcon v-if="answerFeedback === 'correct'" class="w-6 h-6 text-emerald-500" />
            <XMarkIcon v-else class="w-6 h-6 text-coral" />
            <span :class="answerFeedback === 'correct' ? 'text-emerald-600 dark:text-emerald-400' : 'text-coral dark:text-rose-400'">
              {{ answerFeedback === 'correct' ? 'Correct!' : 'Try again' }}
            </span>
          </div>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <kbd class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 font-mono text-xs">R</kbd> Reset current question
          </p>
        </div>

        <div class="flex gap-4 items-center">
          <div v-if="isHost">
            <button @click="endGameEarly" class="px-4 py-2 rounded-lg bg-coral/40 text-rose-800 dark:text-rose-200 text-sm">
              End Game
            </button>
          </div>
        </div>
        </div>

        <!-- Chat sidebar - fixed size, input outside scroll area -->
        <div class="w-full lg:w-72 shrink-0 flex flex-col rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center gap-1 shrink-0">
            <ChatBubbleLeftRightIcon class="w-4 h-4" /> Chat
          </h3>
          <div
            ref="chatMessagesRef"
            class="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto overscroll-contain px-4 py-3 space-y-2 text-sm"
          >
            <div v-for="(m, i) in chatMessages" :key="i" class="flex flex-col gap-0.5">
              <span class="font-medium text-gray-600 dark:text-gray-400 text-xs">{{ m.displayName }}</span>
              <span class="text-gray-800 dark:text-gray-200 break-words">{{ m.message }}</span>
            </div>
            <p v-if="!chatMessages.length" class="text-gray-500 dark:text-gray-500 text-center py-4">No messages yet</p>
          </div>
          <div class="p-3 border-t border-gray-200/50 dark:border-gray-700/50 shrink-0 flex gap-2">
            <input
              v-model="chatInput"
              type="text"
              placeholder="Type a message..."
              class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-500"
              @keydown.enter="sendChatMessage"
            />
            <button @click="sendChatMessage" class="px-4 py-2 rounded-lg bg-lavender/40 text-violet-700 dark:text-violet-300 text-sm font-medium shrink-0">Send</button>
          </div>
        </div>
      </div>

      <!-- Spectating -->
      <div v-else-if="view === 'spectating'" class="flex flex-col lg:flex-row gap-6 items-stretch">
        <div class="flex-1 min-w-0 space-y-6">
          <h1 class="text-3xl font-light text-gray-800 dark:text-white flex items-center gap-2">
            <EyeIcon class="w-8 h-8" /> Spectating
          </h1>
          <div class="grid md:grid-cols-2 gap-6">
            <div class="p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Current Question</h3>
              <p class="text-4xl font-mono text-emerald-700 dark:text-emerald-300">
                {{ currentQuestion?.value ?? '—' }}
              </p>
            </div>
            <div class="p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                <TrophyIcon class="w-4 h-4" /> Leaderboard
              </h3>
              <div class="space-y-2">
                <div v-for="r in leaderboard" :key="r.rank" class="flex items-center gap-2">
                  <span class="w-6 text-gray-500">{{ r.rank }}</span>
                  <span class="flex-1 text-gray-800 dark:text-gray-200">{{ r.displayName }}</span>
                  <span class="font-semibold text-emerald-600">{{ r.score }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Chat sidebar (same as playing) -->
        <div class="w-full lg:w-72 shrink-0 flex flex-col rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center gap-1 shrink-0">
            <ChatBubbleLeftRightIcon class="w-4 h-4" /> Chat
          </h3>
          <div
            ref="chatMessagesRef"
            class="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto overscroll-contain px-4 py-3 space-y-2 text-sm"
          >
            <div v-for="(m, i) in chatMessages" :key="i" class="flex flex-col gap-0.5">
              <span class="font-medium text-gray-600 dark:text-gray-400 text-xs">{{ m.displayName }}</span>
              <span class="text-gray-800 dark:text-gray-200 break-words">{{ m.message }}</span>
            </div>
            <p v-if="!chatMessages.length" class="text-gray-500 dark:text-gray-500 text-center py-4">No messages yet</p>
          </div>
          <div class="p-3 border-t border-gray-200/50 dark:border-gray-700/50 shrink-0 flex gap-2">
            <input
              v-model="chatInput"
              type="text"
              placeholder="Type a message..."
              class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-500"
              @keydown.enter="sendChatMessage"
            />
            <button @click="sendChatMessage" class="px-4 py-2 rounded-lg bg-lavender/40 text-violet-700 dark:text-violet-300 text-sm font-medium shrink-0">Send</button>
          </div>
        </div>
      </div>

      <!-- Ended -->
      <div v-else-if="view === 'ended'" class="space-y-8">
        <h1 class="text-3xl font-light text-gray-800 dark:text-white">Game Over</h1>
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
              <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ r.score }}</span>
            </div>
          </div>
        </div>
        <button
          @click="leaveRoom"
          class="px-8 py-3 rounded-xl font-semibold bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  </div>
</template>

