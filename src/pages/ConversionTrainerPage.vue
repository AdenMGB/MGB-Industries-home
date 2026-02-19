<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import {
  ArrowLeftIcon,
  ArrowsPointingOutIcon,
  CalculatorIcon,
  TableCellsIcon,
  BookOpenIcon,
  PlayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
  TrophyIcon,
  HeartIcon,
  ClockIcon,
  BoltIcon,
  AcademicCapIcon,
  StarIcon,
} from '@heroicons/vue/24/outline'
import { HeartIcon as HeartIconSolid, TrophyIcon as TrophyIconSolid } from '@heroicons/vue/24/solid'
import { CONVERSION_TRAINER_ACHIEVEMENTS } from '@/config/conversionTrainerAchievements'
import {
  parseNumber,
  decimalToBinary,
  decimalToHex,
  ipv4ToBinary,
  decimalToIpv6Hextet,
} from '@/utils/numberConversion'
import confetti from 'canvas-confetti'
import { useAuth } from '@/composables/useAuth'
import { api } from '@/api/client'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()

type TabId = 'calculator' | 'table' | 'learn' | 'practice'
const VALID_TABS = ['calculator', 'table', 'learn', 'practice'] as const
const VALID_GAMES = ['classic', 'speed-round', 'survival', 'streak-challenge', 'nibble-sprint'] as const
const VALID_CONV = ['binary-standalone', 'binary-octet', 'hex-standalone', 'hex-octet', 'ipv4-full', 'ipv6-hextet'] as const
const VALID_LB_MODES = ['speed-round', 'survival', 'streak-challenge', 'nibble-sprint', 'daily-streak'] as const

function parseFromQuery<T>(q: Record<string, unknown>, key: string, valid: readonly T[]): T | null {
  const v = q[key]
  const s = Array.isArray(v) ? v[0] : v
  return (typeof s === 'string' && valid.includes(s as T)) ? (s as T) : null
}

const activeTab = ref<TabId>(
  route.query.fullscreen === '1' ? 'practice' : (parseFromQuery(route.query as Record<string, unknown>, 'tab', VALID_TABS) ?? 'calculator')
)

type ConversionType =
  | 'binary-standalone'
  | 'binary-octet'
  | 'hex-standalone'
  | 'hex-octet'
  | 'ipv4-full'
  | 'ipv6-hextet'

type GameType = 'classic' | 'speed-round' | 'survival' | 'streak-challenge' | 'nibble-sprint'

const tabs = [
  { id: 'calculator' as TabId, label: 'Calculator', icon: CalculatorIcon },
  { id: 'table' as TabId, label: 'Reference Table', icon: TableCellsIcon },
  { id: 'learn' as TabId, label: 'Learn', icon: BookOpenIcon },
  { id: 'practice' as TabId, label: 'Practice', icon: PlayIcon },
]

// --- Calculator ---
const calcInput = ref('')
const calcError = ref('')
const calcResult = computed(() => {
  if (!calcInput.value.trim()) return null
  calcError.value = ''
  const num = parseNumber(calcInput.value)
  if (num === null) {
    calcError.value = 'Invalid number (decimal, 0xff, 0o377, or 0b11111111)'
    return null
  }
  return {
    decimal: num.toString(10),
    hex: '0x' + num.toString(16).toLowerCase(),
    octal: '0o' + num.toString(8),
    binary: num.toString(2),
  }
})

// --- Reference tables ---
const tableNibble = computed(() =>
  Array.from({ length: 16 }, (_, i) => ({
    dec: i,
    binary: decimalToBinary(i, 4),
    hex: i.toString(16).toUpperCase(),
  }))
)

const tableByte = computed(() =>
  Array.from({ length: 256 }, (_, i) => ({
    dec: i,
    binary: decimalToBinary(i, 8),
    hex: i.toString(16).toUpperCase().padStart(2, '0'),
  }))
)

// --- Practice ---
const conversionType = ref<ConversionType>(parseFromQuery(route.query as Record<string, unknown>, 'conv', VALID_CONV) ?? 'binary-standalone')
const gameType = ref<GameType>(parseFromQuery(route.query as Record<string, unknown>, 'game', VALID_GAMES) ?? 'classic')
const practiceInput = ref('')
const boxValues = ref<string[]>(Array(8).fill(''))
const boxRefs = ref<(HTMLInputElement | null)[]>(Array(8).fill(null))
const showPowerTable = ref(true)
const overflowError = ref(false)
const boxShake = ref(false)
const boxContainerRef = ref<HTMLElement | null>(null)
const practiceInputRef = ref<HTMLInputElement | null>(null)
const questionRef = ref<HTMLElement | null>(null)
const practiceQuestion = ref<{ value: string; answer: string } | null>(null)
const practiceFeedback = ref<'correct' | 'incorrect' | null>(null)
const practiceStreak = ref(0)
const practiceTotal = ref(0)
const practiceCorrect = ref(0)
const showAnswer = ref(false)
const bestStreakThisSession = ref(0)

// Game-specific state
const timerSeconds = ref(0)
const timerInterval = ref<number | null>(null)
const lives = ref(3)
const gameOver = ref(false)
const gameStarted = ref(false)
const gameSessionId = ref<string | null>(null)

// Power-of-2 table for binary conversion (bit 7 → bit 0)
const powerTable = [128, 64, 32, 16, 8, 4, 2, 1]

const boxCount = computed(() => {
  if (gameType.value === 'nibble-sprint') return 4
  if (conversionType.value === 'ipv6-hextet') return 4
  if (conversionType.value.includes('hex')) return 2
  return 8
})

const useSegmentedBoxes = computed(() =>
  conversionType.value !== 'ipv4-full'
)

const powerOf2ForBoxes = computed(() =>
  powerTable.slice(-boxCount.value)
)

function clearOverflowError() {
  overflowError.value = false
}

function triggerOverflowError() {
  overflowError.value = true
  boxShake.value = true
  setTimeout(() => { boxShake.value = false }, 500)
}

function handleBoxInput(index: number, raw: string) {
  // Paste only - typing is handled in keydown for reliable overwrite
  if (overflowError.value) clearOverflowError()
  const isHex = conversionType.value.includes('hex') || conversionType.value === 'ipv6-hextet'
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
  // Multi-char paste
  const chars = valid.split('').slice(0, boxCount.value)
  const overflow = valid.length > boxCount.value
  const arr = [...boxValues.value]
  for (let i = 0; i < boxCount.value; i++) {
    arr[i] = chars[i] ?? ''
  }
  boxValues.value = arr
  if (overflow) triggerOverflowError()
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
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (index > 0) {
      animateBoxFocused(index - 1)
      nextTick(() => boxRefs.value[index - 1]?.focus())
    }
    return
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (index < boxCount.value - 1) {
      animateBoxFocused(index + 1)
      nextTick(() => boxRefs.value[index + 1]?.focus())
    }
    return
  }
  // Handle character input - always overwrite (even when box has value)
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault()
    const isHex = conversionType.value.includes('hex') || conversionType.value === 'ipv6-hextet'
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

function setBoxRef(i: number, el: unknown) {
  if (el && el instanceof HTMLInputElement) boxRefs.value[i] = el
}

const animEase = 'back.out(1.4)'
const animEaseBounce = 'elastic.out(1, 0.5)'

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

// Vanilla arithmetic calculator for practice session
const calcDisplay = ref('0')
const calcPrev = ref<number | null>(null)
const calcOp = ref<'+' | '-' | '*' | '/' | null>(null)
const calcWaitingForOperand = ref(false)

// XP, progress, achievements
const progress = ref<{
  totalXp: number
  level: number
  bestStreak: number
  bestClassicStreak: number
  dailyStreak: number
  bestSpeedRound: number
  bestSurvival: number
  bestNibbleSprint: number
} | null>(null)
const unlockedAchievements = ref<Set<string>>(new Set())
const leaderboard = ref<Array<{ rank: number; userName: string; score: number; createdAt: string }>>([])
const leaderboardMode = ref(parseFromQuery(route.query as Record<string, unknown>, 'lbMode', VALID_LB_MODES) ?? 'speed-round')
const leaderboardConv = ref<ConversionType>(parseFromQuery(route.query as Record<string, unknown>, 'lbConv', VALID_CONV) ?? 'binary-standalone')
const leaderboardLoading = ref(false)
const leaderboardFullscreen = ref(route.query.lb === '1')

const xpLeaderboard = ref<Array<{ rank: number; userName: string; totalXp: number; level: number }>>([])
const xpLeaderboardLoading = ref(false)
const xpLeaderboardFullscreen = ref(false)

const XP_PER_LEVEL = 100
const ACHIEVEMENTS = CONVERSION_TRAINER_ACHIEVEMENTS
const achievementIcons: Record<string, typeof TrophyIcon> = {
  trophy: TrophyIconSolid,
  bolt: BoltIcon,
  heart: HeartIconSolid,
  clock: ClockIcon,
  star: StarIcon,
}

function calcInputDigit(d: string) {
  if (calcWaitingForOperand.value) {
    calcDisplay.value = d
    calcWaitingForOperand.value = false
  } else {
    calcDisplay.value = calcDisplay.value === '0' ? d : calcDisplay.value + d
  }
}

function calcInputOp(op: '+' | '-' | '*' | '/') {
  const current = parseFloat(calcDisplay.value)
  if (calcPrev.value !== null && calcOp.value !== null && !calcWaitingForOperand.value) {
    const result = calcPerform(calcPrev.value, calcOp.value, current)
    calcDisplay.value = String(Number.isInteger(result) ? result : Math.round(result * 1e10) / 1e10)
    calcPrev.value = parseFloat(calcDisplay.value)
  } else {
    calcPrev.value = current
  }
  calcOp.value = op
  calcWaitingForOperand.value = true
}

function calcPerform(a: number, op: string, b: number): number {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return b === 0 ? 0 : a / b
    default: return b
  }
}

function calcEquals() {
  if (calcPrev.value === null || calcOp.value === null) return
  const current = parseFloat(calcDisplay.value)
  const result = calcPerform(calcPrev.value, calcOp.value, current)
  calcDisplay.value = String(Number.isInteger(result) ? result : Math.round(result * 1e10) / 1e10)
  calcPrev.value = null
  calcOp.value = null
  calcWaitingForOperand.value = true
}

function calcClear() {
  calcDisplay.value = '0'
  calcPrev.value = null
  calcOp.value = null
  calcWaitingForOperand.value = false
}

function calcInputDecimal() {
  if (calcWaitingForOperand.value) {
    calcDisplay.value = '0.'
    calcWaitingForOperand.value = false
  } else if (!calcDisplay.value.includes('.')) {
    calcDisplay.value += '.'
  }
}

const calcExpression = computed(() => {
  if (calcPrev.value === null || calcOp.value === null) return ''
  const opSymbol = calcOp.value === '*' ? '×' : calcOp.value === '/' ? '÷' : calcOp.value
  return `${calcPrev.value} ${opSymbol}`
})

const conversionTypes = [
  { id: 'binary-standalone' as ConversionType, label: 'Binary', desc: 'Decimal → Binary (0–255)' },
  { id: 'binary-octet' as ConversionType, label: 'Binary (octet)', desc: '8-bit binary' },
  { id: 'hex-standalone' as ConversionType, label: 'Hex', desc: 'Decimal → Hex (0–255)' },
  { id: 'hex-octet' as ConversionType, label: 'Hex (octet)', desc: 'Octet to hex' },
  { id: 'ipv4-full' as ConversionType, label: 'IPv4 → Binary', desc: 'Full IP to binary' },
  { id: 'ipv6-hextet' as ConversionType, label: 'IPv6 → Hex', desc: 'Decimal → Hex hextet (0–65535)' },
]

const gameTypes = [
  { id: 'classic' as GameType, label: 'Classic', desc: 'Practice at your own pace', icon: PlayIcon },
  { id: 'speed-round' as GameType, label: 'Speed Round', desc: '60 seconds, answer as many as you can', icon: BoltIcon },
  { id: 'survival' as GameType, label: 'Survival', desc: '3 lives, wrong = lose one', icon: HeartIcon },
  { id: 'streak-challenge' as GameType, label: 'Streak Challenge', desc: 'Beat your best streak', icon: AcademicCapIcon },
  { id: 'nibble-sprint' as GameType, label: 'Nibble Sprint', desc: '0–15 only, 30 seconds', icon: ClockIcon },
]

const timedGameInstructions: Record<string, { description: string; bullets: string[] }> = {
  'speed-round': {
    description: 'Answer as many conversions as you can before time runs out.',
    bullets: [
      '60 seconds on the clock',
      'Convert decimal to binary or hex',
      'Each correct answer adds to your score',
    ],
  },
  survival: {
    description: 'Survive as long as you can with 3 lives.',
    bullets: [
      'Start with 3 lives',
      'Wrong answer = lose one life',
      'Game over when all lives are gone',
    ],
  },
  'nibble-sprint': {
    description: 'Quick conversions for values 0–15 in 30 seconds.',
    bullets: [
      '30 seconds on the clock',
      'Only 4-bit values (0–15)',
      'Fast nibble conversions',
    ],
  },
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generatePracticeQuestion(): void {
  showAnswer.value = false
  practiceFeedback.value = null
  practiceInput.value = ''
  boxValues.value = Array(8).fill('')
  overflowError.value = false

  const isNibble = gameType.value === 'nibble-sprint'
  const isIpv6Hextet = conversionType.value === 'ipv6-hextet'
  const maxVal = isIpv6Hextet ? 65535 : isNibble ? 15 : 255
  const minVal = 0

  if (conversionType.value === 'ipv4-full' && !isNibble) {
    const octets = [
      randomInt(1, 223),
      randomInt(0, 255),
      randomInt(0, 255),
      randomInt(1, 254),
    ]
    const ip = octets.join('.')
    const answer = ipv4ToBinary(ip)
    if (answer) {
      practiceQuestion.value = { value: ip, answer }
    }
    return
  }

  const dec = randomInt(minVal, maxVal)
  const decimalStr = dec.toString()

  if (conversionType.value === 'binary-standalone' || conversionType.value === 'binary-octet') {
    const bits = isNibble ? 4 : 8
    practiceQuestion.value = {
      value: decimalStr,
      answer: decimalToBinary(dec, bits),
    }
  } else if (isIpv6Hextet) {
    const hextetVal = randomInt(0, 65535)
    const answer = decimalToIpv6Hextet(hextetVal)
    if (answer) {
      practiceQuestion.value = { value: hextetVal.toString(), answer }
    }
  } else {
    const hex = decimalToHex(dec).toUpperCase().padStart(2, '0')
    practiceQuestion.value = { value: decimalStr, answer: hex }
  }
}

function normalizeAnswer(input: string, mode: ConversionType): string {
  let trimmed = input.trim().toLowerCase()
  // Alias: "2" is accepted as "0" (zero) - common typo/numpad
  if (trimmed === '2') trimmed = '0'
  if (mode === 'ipv4-full') {
    return trimmed
  }
  if (mode === 'hex-standalone' || mode === 'hex-octet') {
    const cleaned = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed
    return cleaned.toUpperCase().padStart(2, '0')
  }
  if (mode === 'ipv6-hextet') {
    const cleaned = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed
    return cleaned.toUpperCase().padStart(4, '0')
  }
  return trimmed
}

function stopTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

function startTimer(seconds: number) {
  stopTimer()
  timerSeconds.value = seconds
  gameStarted.value = true
  gameOver.value = false
  timerInterval.value = window.setInterval(() => {
    timerSeconds.value--
    if (timerSeconds.value <= 0) {
      stopTimer()
      gameOver.value = true
      endTimedGame()
    }
  }, 1000) as unknown as number
}

function endTimedGame() {
  const score = practiceCorrect.value
  const mode = gameType.value
  if (isAuthenticated.value && gameSessionId.value) {
    api.submitConversionScore(gameSessionId.value, mode, score, {
      correct: practiceCorrect.value,
      total: practiceTotal.value,
      timeSeconds: mode === 'speed-round' ? 60 : 30,
    }, conversionType.value)
    api.updateConversionProgress({
      xpEarned: practiceCorrect.value * 10 + practiceStreak.value * 5,
      recordPlayed: true,
      ...(mode === 'speed-round' && { bestSpeedRound: Math.max(progress.value?.bestSpeedRound ?? 0, score) }),
      ...(mode === 'nibble-sprint' && { bestNibbleSprint: Math.max(progress.value?.bestNibbleSprint ?? 0, score) }),
    })
    checkAchievements()
  }
}

function checkAchievements() {
  if (!isAuthenticated.value) return
  const toUnlock: string[] = []
  if (practiceStreak.value >= 5 && !unlockedAchievements.value.has('first_5')) toUnlock.push('first_5')
  if (gameType.value === 'speed-round' && practiceCorrect.value >= 20 && !unlockedAchievements.value.has('speed_demon')) toUnlock.push('speed_demon')
  if (gameType.value === 'survival' && practiceCorrect.value >= 50 && !unlockedAchievements.value.has('survivor')) toUnlock.push('survivor')
  if (gameType.value === 'nibble-sprint' && practiceCorrect.value >= 15 && !unlockedAchievements.value.has('nibble_master')) toUnlock.push('nibble_master')
  if (practiceTotal.value >= 10 && practiceCorrect.value === practiceTotal.value && !unlockedAchievements.value.has('perfect_10')) toUnlock.push('perfect_10')
  for (const id of toUnlock) {
    api.unlockConversionAchievement(id)
    unlockedAchievements.value.add(id)
    confetti({ particleCount: 100, spread: 100, origin: { y: 0.6 } })
  }
}

function checkPracticeAnswer(): void {
  if (!practiceQuestion.value) return
  const expected = practiceQuestion.value.answer.toLowerCase()
  const inputStr = useSegmentedBoxes.value
    ? boxValues.value.slice(0, boxCount.value).join('')
    : practiceInput.value
  const got = normalizeAnswer(inputStr, conversionType.value)

  practiceTotal.value++

  const isCorrect =
    conversionType.value === 'ipv4-full'
      ? got === expected
      : got.toLowerCase() === expected.toLowerCase()

  if (isCorrect) {
    practiceCorrect.value++
    practiceStreak.value++
    bestStreakThisSession.value = Math.max(bestStreakThisSession.value, practiceStreak.value)
    practiceFeedback.value = 'correct'
    nextTick(() => animateCorrect())
    if ([5, 10, 20].includes(practiceStreak.value)) {
      confetti({ particleCount: 50 + practiceStreak.value * 5, spread: 60, origin: { y: 0.7 } })
    }
    if (isAuthenticated.value) {
      api.updateConversionProgress({
        xpEarned: 10 + practiceStreak.value * 5,
        bestStreak: Math.max(progress.value?.bestStreak ?? 0, practiceStreak.value),
        ...(gameType.value === 'classic' && { bestClassicStreak: Math.max(progress.value?.bestClassicStreak ?? 0, practiceStreak.value) }),
        recordPlayed: true,
      })
    }
    checkAchievements()

    if (gameType.value === 'speed-round' || gameType.value === 'nibble-sprint') {
      setTimeout(() => {
        if (!gameOver.value) nextQuestion()
      }, 300)
    }
  } else {
    practiceStreak.value = 0
    practiceFeedback.value = 'incorrect'
    nextTick(() => animateIncorrect())
    if (isAuthenticated.value && gameType.value === 'classic' && practiceTotal.value === 1) {
      api.updateConversionProgress({ recordPlayed: true })
    }

    if (gameType.value === 'survival') {
      lives.value--
      if (lives.value <= 0) {
        gameOver.value = true
        if (isAuthenticated.value && gameSessionId.value) {
          api.submitConversionScore(gameSessionId.value, 'survival', practiceCorrect.value, { correct: practiceCorrect.value, total: practiceTotal.value }, conversionType.value)
          api.updateConversionProgress({
            xpEarned: practiceCorrect.value * 10,
            recordPlayed: true,
            bestSurvival: Math.max(progress.value?.bestSurvival ?? 0, practiceCorrect.value),
          })
          checkAchievements()
        }
      } else {
        setTimeout(() => nextQuestion(), 800)
      }
    }
  }
}

function nextQuestion(): void {
  if (gameOver.value) return
  generatePracticeQuestion()
  nextTick(() => {
    if (useSegmentedBoxes.value) {
      boxRefs.value[0]?.focus()
    } else {
      practiceInputRef.value?.focus()
    }
  })
}

function revealAnswer(): void {
  showAnswer.value = true
}

async function startGame() {
  practiceCorrect.value = 0
  practiceTotal.value = 0
  practiceStreak.value = 0
  bestStreakThisSession.value = 0
  lives.value = 3
  gameOver.value = false
  gameStarted.value = true
  gameSessionId.value = null
  generatePracticeQuestion()
  if (isAuthenticated.value) {
    api.updateConversionProgress({ recordPlayed: true })
    // Get session for score submission (anti-cheat)
    if (['speed-round', 'survival', 'streak-challenge', 'nibble-sprint'].includes(gameType.value)) {
      const res = await api.startConversionSession(gameType.value, conversionType.value)
      if (res.data) gameSessionId.value = res.data.sessionId
    }
  }

  if (gameType.value === 'speed-round') {
    startTimer(60)
  } else if (gameType.value === 'nibble-sprint') {
    startTimer(30)
  }

  nextTick(() => {
    if (useSegmentedBoxes.value) {
      boxRefs.value[0]?.focus()
    } else {
      practiceInputRef.value?.focus()
    }
  })
}

function endStreakChallenge() {
  if (isAuthenticated.value && bestStreakThisSession.value > 0 && gameSessionId.value) {
    api.submitConversionScore(gameSessionId.value, 'streak-challenge', bestStreakThisSession.value, { streak: bestStreakThisSession.value }, conversionType.value)
    api.updateConversionProgress({
      bestStreak: Math.max(progress.value?.bestStreak ?? 0, bestStreakThisSession.value),
      recordPlayed: true,
    })
  }
}

async function loadProgress() {
  if (!isAuthenticated.value) return
  const res = await api.getConversionProgress()
  if (res.data) progress.value = res.data
}

async function loadAchievements() {
  if (!isAuthenticated.value) return
  const res = await api.getConversionAchievements()
  if (res.data) {
    unlockedAchievements.value = new Set(res.data.achievements.map((a) => a.id))
  }
}

async function loadLeaderboard() {
  leaderboardLoading.value = true
  const conv = leaderboardMode.value === 'daily-streak'
    ? undefined
    : leaderboardMode.value === 'nibble-sprint'
      ? 'binary-standalone'
      : leaderboardConv.value
  const res = await api.getConversionLeaderboard(leaderboardMode.value, 20, conv)
  leaderboardLoading.value = false
  if (res.data) {
    leaderboard.value = res.data.leaderboard.map((r, i) => ({
      rank: i + 1,
      userName: r.userName,
      score: r.score,
      createdAt: r.createdAt,
    }))
  }
}

async function loadXpLeaderboard() {
  xpLeaderboardLoading.value = true
  const res = await api.getConversionXpLeaderboard(20)
  xpLeaderboardLoading.value = false
  if (res.data) {
    xpLeaderboard.value = res.data.leaderboard
  }
}

function openXpLeaderboard() {
  xpLeaderboardFullscreen.value = true
  loadXpLeaderboard()
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* ignore */
  }
}

const goBack = () => router.push('/developer-tools')

const xpProgress = computed(() => {
  if (!progress.value) return 0
  return (progress.value.totalXp % XP_PER_LEVEL) / XP_PER_LEVEL
})

watch(activeTab, (tab) => {
  if (tab === 'practice') {
    loadLeaderboard()
    if (isAuthenticated.value) {
      loadProgress()
      loadAchievements()
    }
  }
})

// When auth completes after mount (e.g. refresh or login redirect), load data
watch(isAuthenticated, (val) => {
  if (val && activeTab.value === 'practice') {
    loadProgress()
    loadAchievements()
    loadLeaderboard()
  }
})

watch(gameType, (newType, oldType) => {
  if (oldType === 'streak-challenge' && bestStreakThisSession.value > 0) {
    endStreakChallenge()
  }
  if (newType === 'nibble-sprint') {
    conversionType.value = 'binary-standalone'
  }
  // Sync leaderboard mode to game mode when switching
  if (['speed-round', 'survival', 'streak-challenge', 'nibble-sprint'].includes(newType)) {
    leaderboardMode.value = newType
    leaderboardConv.value = conversionType.value
    loadLeaderboard()
  }
})

watch(leaderboardConv, () => {
  if (leaderboardMode.value !== 'daily-streak') loadLeaderboard()
})

// Sync leaderboard conv when conversion type changes (like gamemode does)
watch(conversionType, (newConv) => {
  if (leaderboardMode.value !== 'daily-streak' && leaderboardMode.value !== 'nibble-sprint') {
    leaderboardConv.value = newConv
    loadLeaderboard()
  }
})

watch(practiceQuestion, (q) => {
  if (q && questionRef.value) {
    gsap.fromTo(questionRef.value, { scale: 0.92, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.35, ease: animEase })
  }
}, { deep: true })

function buildQuery() {
  const q: Record<string, string> = {}
  if (activeTab.value === 'practice') {
    q.fullscreen = '1'
  } else {
    q.tab = activeTab.value
  }
  q.game = gameType.value
  q.conv = conversionType.value
  q.lbMode = leaderboardMode.value
  if (leaderboardMode.value !== 'daily-streak') q.lbConv = leaderboardConv.value
  if (leaderboardFullscreen.value) q.lb = '1'
  return q
}

function syncUrl() {
  const q = buildQuery()
  const current = { ...route.query }
  const changed = Object.keys(q).some(k => String(current[k] ?? '') !== String(q[k]))
    || Object.keys(current).some(k => !(k in q) && current[k] !== undefined)
  if (changed) {
    router.replace({ path: route.path, query: q })
  }
}

// Sync state to URL (tab, game, conv, lb, lbMode, lbConv)
watch([activeTab, gameType, conversionType, leaderboardMode, leaderboardConv, leaderboardFullscreen], syncUrl, { deep: true })

// Enter to restart when game over
let gameOverKeyHandler: ((e: KeyboardEvent) => void) | null = null
watch(gameOver, (isOver) => {
  if (gameOverKeyHandler) {
    document.removeEventListener('keydown', gameOverKeyHandler)
    gameOverKeyHandler = null
  }
  if (isOver) {
    gameOverKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        startGame()
      }
    }
    document.addEventListener('keydown', gameOverKeyHandler)
  }
})
onBeforeUnmount(() => {
  if (gameOverKeyHandler) {
    document.removeEventListener('keydown', gameOverKeyHandler)
  }
})

onMounted(() => {
  gsap.fromTo('.page-header', { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: premiumEase })
  gsap.fromTo('.tool-card', { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, delay: 0.1, ease: premiumEase })
  generatePracticeQuestion()
  loadLeaderboard()
  if (isAuthenticated.value) {
    loadProgress()
    loadAchievements()
  }
  syncUrl()
})
</script>

<template>
  <div :class="cn(
    'transition-all duration-200',
    activeTab === 'practice'
      ? 'fixed inset-0 z-[60] flex flex-col overflow-hidden bg-slate-50 dark:bg-gray-950'
      : 'min-h-screen py-24 px-4 md:px-8 overflow-y-auto',
  )">
    <div :class="cn(
      'transition-all duration-200',
      activeTab === 'practice' ? 'flex-1 flex flex-col min-h-0' : 'max-w-4xl mx-auto',
    )">
      <!-- Header: compact bar in practice, full header otherwise -->
      <header :class="cn(
        'transition-all duration-200',
        activeTab === 'practice'
          ? 'shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-lavender/20 dark:bg-lavender/10 border-b border-lavender/30'
          : 'flex flex-col gap-6 mb-8',
      )">
        <button
          @click="goBack"
          :class="cn(
            'flex items-center gap-2 text-sm transition-colors duration-200 w-fit',
            activeTab === 'practice'
              ? 'text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lavender/50 rounded-lg px-2 py-1 -ml-2',
          )"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          {{ activeTab === 'practice' ? 'Back' : 'Back to Developer Tools' }}
        </button>

        <div v-if="activeTab !== 'practice'" class="page-header">
          <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
            Conversion Trainer
          </h1>
          <p class="text-base text-gray-600 dark:text-gray-400">
            Practice mental binary and hex conversion with calculator, reference table, and quiz games.
          </p>
        </div>

        <!-- Tabs -->
        <div class="flex flex-wrap gap-2" :class="activeTab !== 'practice' && 'mt-2'">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            @click="activeTab = tab.id"
            :class="cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-lavender/40 text-violet-800 dark:text-violet-200 ring-2 ring-lavender/50 shadow-sm'
                : 'bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-lavender/20 dark:hover:bg-lavender/10',
            )"
          >
            <component :is="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>
      </header>

      <!-- Calculator Tab -->
      <div v-show="activeTab === 'calculator'" class="tool-card p-8 rounded-2xl bg-soft-blue/20 dark:bg-soft-blue/10 backdrop-blur-md border border-soft-blue/30">
        <h2 class="text-xl font-light mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <CalculatorIcon class="w-5 h-5 text-soft-blue" />
          Calculator
        </h2>
        <div class="space-y-4">
          <div>
            <label for="calc-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Number (decimal, 0xff, 0o377, 0b11111111)
            </label>
            <input
              id="calc-input"
              v-model="calcInput"
              type="text"
              placeholder="255 or 0xff or 0o377"
              :class="cn(
                'w-full px-4 py-3 rounded-lg border font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-mint/50',
                'transition-all duration-200',
              )"
            />
            <p v-if="calcError" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ calcError }}</p>
          </div>
          <div v-if="calcResult" class="space-y-3">
            <div
              v-for="(val, key) in calcResult"
              :key="key"
              :class="cn(
                'flex items-center gap-2 p-4 rounded-lg font-mono text-sm',
                'bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50',
                'text-gray-800 dark:text-gray-200',
              )"
            >
              <span class="w-20 text-gray-500 dark:text-gray-400 capitalize">{{ key }}</span>
              <span class="flex-1 break-all">{{ val }}</span>
              <button
                @click="copyToClipboard(val)"
                aria-label="Copy"
                :class="cn(
                  'p-2 rounded-lg shrink-0 hover:bg-mint/20 transition-all duration-200 transform hover:scale-105 active:scale-95',
                  'focus:outline-none focus:ring-2 focus:ring-mint/50',
                )"
              >
                <ClipboardDocumentIcon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Reference Table Tab -->
      <div v-show="activeTab === 'table'" class="tool-card p-8 rounded-2xl bg-soft-yellow/20 dark:bg-amber-900/20 backdrop-blur-md border border-soft-yellow/30">
        <h2 class="text-xl font-light mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <TableCellsIcon class="w-5 h-5 text-amber-600 dark:text-amber-400" />
          Reference Table
        </h2>
        <div class="space-y-8">
          <div>
            <h3 class="text-base font-medium text-gray-700 dark:text-gray-300 mb-3">Nibble (0–15)</h3>
            <div class="overflow-x-auto rounded-lg border border-gray-200/50 dark:border-gray-600/50">
              <table class="w-full font-mono text-sm">
                <thead class="bg-gray-100/80 dark:bg-gray-700/80">
                  <tr>
                    <th class="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Dec</th>
                    <th class="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Binary</th>
                    <th class="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Hex</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, i) in tableNibble"
                    :key="i"
                    :class="i % 2 === 0 ? 'bg-white/40 dark:bg-gray-800/40' : 'bg-gray-50/40 dark:bg-gray-700/20'"
                  >
                    <td class="px-4 py-2 text-gray-800 dark:text-gray-200">{{ row.dec }}</td>
                    <td class="px-4 py-2 text-gray-800 dark:text-gray-200">{{ row.binary }}</td>
                    <td class="px-4 py-2 text-gray-800 dark:text-gray-200">{{ row.hex }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 class="text-base font-medium text-gray-700 dark:text-gray-300 mb-3">Byte (0–255, IP octets)</h3>
            <div class="overflow-x-auto max-h-64 overflow-y-auto rounded-lg border border-gray-200/50 dark:border-gray-600/50">
              <table class="w-full font-mono text-sm">
                <thead class="sticky top-0 bg-gray-100/80 dark:bg-gray-700/80">
                  <tr>
                    <th class="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Dec</th>
                    <th class="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Binary</th>
                    <th class="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Hex</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, i) in tableByte"
                    :key="i"
                    :class="i % 2 === 0 ? 'bg-white/40 dark:bg-gray-800/40' : 'bg-gray-50/40 dark:bg-gray-700/20'"
                  >
                    <td class="px-4 py-1.5 text-gray-800 dark:text-gray-200">{{ row.dec }}</td>
                    <td class="px-4 py-1.5 text-gray-800 dark:text-gray-200">{{ row.binary }}</td>
                    <td class="px-4 py-1.5 text-gray-800 dark:text-gray-200">{{ row.hex }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Learn Tab -->
      <div v-show="activeTab === 'learn'" class="tool-card p-8 rounded-2xl bg-soft-blue/20 dark:bg-soft-blue/10 backdrop-blur-md border border-soft-blue/30">
        <h2 class="text-xl font-light mb-6 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <BookOpenIcon class="w-5 h-5 text-lavender" />
          Learn
        </h2>
        <div class="space-y-8 text-gray-700 dark:text-gray-300">
          <section>
            <h3 class="text-lg font-medium text-gray-800 dark:text-white mb-2">Binary (Base 2)</h3>
            <p class="text-sm leading-relaxed mb-2">
              Binary uses only two digits: 0 and 1. Each position represents a power of 2. From right to left: 2⁰, 2¹, 2², 2³, etc.
            </p>
            <p class="text-sm leading-relaxed mb-2">
              Example: 1010 = 1×8 + 0×4 + 1×2 + 0×1 = 10 in decimal.
            </p>
            <p class="text-sm leading-relaxed">
              For IP addresses, each octet is 8 bits (0–255). Memorize powers of 2: 128, 64, 32, 16, 8, 4, 2, 1.
            </p>
          </section>
          <section>
            <h3 class="text-lg font-medium text-gray-800 dark:text-white mb-2">Hexadecimal (Base 16)</h3>
            <p class="text-sm leading-relaxed mb-2">
              Hex uses 16 digits: 0–9 and A–F (A=10, B=11, C=12, D=13, E=14, F=15). Each position is a power of 16.
            </p>
            <p class="text-sm leading-relaxed mb-2">
              Example: 0xFF = 15×16 + 15 = 255 in decimal.
            </p>
            <p class="text-sm leading-relaxed">
              One hex digit = 4 bits (a nibble). Two hex digits = 8 bits (a byte). Useful for IPv6 and memory addresses.
            </p>
          </section>
          <section>
            <h3 class="text-lg font-medium text-gray-800 dark:text-white mb-2">IP Octets</h3>
            <p class="text-sm leading-relaxed">
              An IPv4 address has four octets (e.g. 192.168.1.1). Each octet is 0–255. To convert to binary, convert each octet to 8-bit binary and join with dots.
            </p>
          </section>
        </div>
      </div>

      <!-- Practice Tab - Full screen layout -->
      <div v-show="activeTab === 'practice'" class="flex-1 flex min-h-0 overflow-hidden">
        <!-- Left sidebar: controls -->
        <aside class="w-64 shrink-0 flex flex-col gap-4 p-4 overflow-y-auto bg-soft-blue/30 dark:bg-soft-blue/10 border-r border-soft-blue/40">
          <button
            v-if="isAuthenticated && progress"
            type="button"
            @click="openXpLeaderboard"
            class="w-full p-3 rounded-xl bg-cream/60 dark:bg-amber-900/20 border border-soft-yellow/40 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-cream/80 dark:hover:bg-amber-900/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            title="View XP leaderboard"
          >
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-amber-800 dark:text-amber-200">Lv {{ progress.level }}</span>
              <span class="text-amber-700 dark:text-amber-300">{{ progress.totalXp }} XP</span>
            </div>
            <div class="h-2 rounded-full bg-amber-200/50 dark:bg-amber-800/30 overflow-hidden">
              <div class="h-full bg-soft-yellow rounded-full transition-all duration-200" :style="{ width: `${xpProgress * 100}%` }" />
            </div>
            <div v-if="progress.dailyStreak > 0 || progress.bestClassicStreak > 0" class="flex gap-3 mt-2 text-xs text-amber-700 dark:text-amber-300">
              <span v-if="progress.dailyStreak > 0" title="Consecutive days played">🔥 {{ progress.dailyStreak }} day streak</span>
              <span v-if="progress.bestClassicStreak > 0" title="Best streak in Classic mode">⚡ {{ progress.bestClassicStreak }} best</span>
            </div>
          </button>
          <div v-else-if="!isAuthenticated" class="text-xs text-slate-600 dark:text-slate-400 p-2">
            <p class="mb-1.5">Sign in to earn XP and compete.</p>
            <div class="flex flex-wrap gap-1.5 mb-1.5">
              <router-link :to="{ path: '/login', query: { redirect: route.fullPath } }" class="text-mint dark:text-emerald-400 hover:underline font-medium">Sign in</router-link>
              <span class="text-slate-400">·</span>
              <router-link :to="{ path: '/signup', query: { redirect: route.fullPath } }" class="text-mint dark:text-emerald-400 hover:underline font-medium">Sign up</router-link>
            </div>
            <button type="button" @click="openXpLeaderboard" class="text-amber-600 dark:text-amber-400 hover:underline font-medium">View XP leaderboard</button>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Game Mode</label>
            <div class="flex flex-col gap-1.5">
              <button
                v-for="gt in gameTypes"
                :key="gt.id"
                type="button"
                @click="gameType = gt.id; gameStarted = false; generatePracticeQuestion()"
                :class="cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left',
                  gameType === gt.id
                    ? 'bg-lavender/50 text-violet-800 dark:text-violet-200 ring-2 ring-lavender/60'
                    : 'bg-white/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 hover:bg-lavender/20',
                )"
              >
                <component :is="gt.icon" class="w-4 h-4 shrink-0" />
                {{ gt.label }}
              </button>
            </div>
          </div>

          <div v-if="gameType !== 'nibble-sprint'">
            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Conversion</label>
            <div class="flex flex-col gap-1.5">
              <button
                v-for="ct in conversionTypes"
                :key="ct.id"
                type="button"
                @click="conversionType = ct.id; generatePracticeQuestion()"
                :class="cn(
                  'px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-left',
                  conversionType === ct.id
                    ? 'bg-peach/50 text-rose-800 dark:text-rose-200 ring-2 ring-peach/50'
                    : 'bg-white/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 hover:bg-peach/20',
                )"
              >
                {{ ct.label }}
              </button>
            </div>
          </div>

          <div v-if="useSegmentedBoxes && conversionType.includes('binary')" class="flex items-center gap-2">
            <input
              id="show-power-table"
              v-model="showPowerTable"
              type="checkbox"
              class="rounded border-slate-300 dark:border-slate-600 text-mint focus:ring-mint"
            />
            <label for="show-power-table" class="text-sm text-slate-600 dark:text-slate-400">Show power-of-2 table under boxes</label>
          </div>
        </aside>

        <!-- Main: question area -->
        <main class="flex-1 flex flex-col min-w-0 p-6 md:p-10 bg-mint/20 dark:bg-mint/5">
          <!-- Timed game start screen: Speed Round, Survival, Nibble Sprint -->
          <div
            v-if="['speed-round', 'nibble-sprint', 'survival'].includes(gameType) && !gameStarted"
            class="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full"
          >
            <div
              class="w-full rounded-3xl p-8 md:p-10 bg-white/90 dark:bg-slate-800/90 border-2 border-slate-200/80 dark:border-slate-600/80 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 flex flex-col items-center text-center"
            >
              <div class="w-16 h-16 rounded-2xl bg-soft-blue/30 dark:bg-soft-blue/20 flex items-center justify-center mb-6">
                <component
                  :is="gameTypes.find(g => g.id === gameType)?.icon"
                  class="w-8 h-8 text-slate-700 dark:text-slate-200"
                />
              </div>
              <h2 class="text-2xl font-light text-slate-800 dark:text-white mb-3">
                {{ gameTypes.find(g => g.id === gameType)?.label }}
              </h2>
              <p class="text-slate-700 dark:text-slate-300 mb-6">
                {{ timedGameInstructions[gameType]?.description }}
              </p>
              <ul class="text-sm text-slate-600 dark:text-slate-400 text-left mb-8 space-y-2 w-full max-w-xs mx-auto">
                <li v-for="(bullet, i) in (timedGameInstructions[gameType]?.bullets ?? [])" :key="i" class="flex items-start gap-2">
                  <span class="text-mint dark:text-emerald-400 mt-0.5 shrink-0">•</span>
                  <span>{{ bullet }}</span>
                </li>
              </ul>
              <button
                type="button"
                @click="startGame"
                class="px-12 py-4 rounded-2xl font-semibold text-lg bg-mint/50 text-emerald-800 dark:text-emerald-200 hover:bg-mint/70 ring-2 ring-mint/50 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Start {{ gameType === 'speed-round' ? '60s' : gameType === 'nibble-sprint' ? '30s' : '' }} Round
              </button>
            </div>
          </div>

          <div v-else-if="practiceQuestion && (['classic', 'streak-challenge'].includes(gameType) || gameStarted)" class="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
            <!-- Stats bar -->
            <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
              <span class="text-base text-slate-600 dark:text-slate-400">
                Streak: <strong class="text-emerald-600 dark:text-emerald-400">{{ practiceStreak }}</strong>
                <template v-if="gameType === 'streak-challenge'"> · Best: {{ bestStreakThisSession }}</template>
                <template v-else-if="gameType === 'classic' && progress?.bestClassicStreak"> · Best: {{ progress.bestClassicStreak }}</template>
                · {{ practiceCorrect }}/{{ practiceTotal }}
              </span>
              <div class="flex items-center gap-4">
                <span v-if="(gameType === 'speed-round' || gameType === 'nibble-sprint') && gameStarted" class="flex items-center gap-2 px-4 py-2 rounded-xl bg-coral/20 text-coral dark:text-rose-300 font-mono text-xl">
                  <ClockIcon class="w-6 h-6" />
                  {{ timerSeconds }}s
                </span>
                <span v-if="gameType === 'survival'" class="flex items-center gap-1">
                  <HeartIconSolid v-for="i in lives" :key="i" class="w-7 h-7 text-coral" />
                  <HeartIcon v-for="i in (3 - lives)" :key="'e'+i" class="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </span>
              </div>
            </div>

            <div v-if="gameOver" class="text-center py-12">
              <p class="text-3xl font-light text-slate-800 dark:text-white mb-2">Game Over!</p>
              <p class="text-xl text-slate-600 dark:text-slate-400 mb-6">Score: {{ practiceCorrect }}</p>
              <button type="button" @click="startGame" class="px-8 py-4 rounded-xl font-semibold bg-mint/50 text-emerald-800 dark:text-emerald-200 hover:bg-mint/70 transition-all duration-200 hover:scale-105 active:scale-95">
                Play Again
              </button>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-3">Press Enter to restart</p>
            </div>

            <template v-else>
              <p class="text-lg text-slate-600 dark:text-slate-400 mb-4">
                {{ conversionType === 'ipv4-full' ? 'Convert to binary (8 bits per octet, dots):' : conversionType === 'ipv6-hextet' ? 'Convert to hex (4 digits, IPv6 hextet):' : 'Convert to ' + (conversionType.includes('hex') ? 'hex' : 'binary') + ':' }}
              </p>
              <p ref="questionRef" class="text-5xl md:text-7xl font-mono font-light text-emerald-700 dark:text-emerald-300 mb-10 tracking-tight">
                {{ practiceQuestion.value }}
              </p>
              <div class="flex gap-3 flex-wrap items-center">
                <!-- Segmented boxes for binary/hex -->
                <div v-if="useSegmentedBoxes" class="flex flex-col items-center gap-2">
                  <div
                    ref="boxContainerRef"
                    :class="cn(
                      'flex gap-1.5',
                      boxShake && 'animate-shake',
                    )"
                  >
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
                        'text-slate-800 dark:text-slate-200 placeholder-slate-400',
                        'focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2',
                        practiceFeedback === 'incorrect' && 'border-coral ring-2 ring-coral/30',
                        practiceFeedback === 'correct' && 'border-emerald-400 dark:border-emerald-500',
                        overflowError && 'border-coral ring-2 ring-coral/30',
                      )"
                      @input="handleBoxInput(i, ($event.target as HTMLInputElement).value)"
                      @keydown="handleBoxKeydown(i, $event)"
                      @keydown.enter="practiceFeedback ? nextQuestion() : checkPracticeAnswer()"
                    />
                  </div>
                  <div v-if="showPowerTable && conversionType.includes('binary')" class="flex gap-1.5">
                    <div
                      v-for="(val, i) in powerOf2ForBoxes"
                      :key="i"
                      class="w-12 text-center py-1 font-mono text-xs text-amber-700 dark:text-amber-300"
                    >
                      {{ val }}
                    </div>
                  </div>
                  <p v-if="overflowError" class="text-coral dark:text-rose-400 text-sm font-medium animate-pulse">
                    Whoa there! An octet only has 8 bits — no room for your extra digits! 🚫
                  </p>
                </div>
                <!-- Single input for IPv4 -->
                <input
                  v-else
                  ref="practiceInputRef"
                  v-model="practiceInput"
                  type="text"
                  :placeholder="conversionType === 'ipv4-full' ? '11000000.10101000...' : conversionType === 'ipv6-hextet' ? '0ABC' : conversionType.includes('hex') ? 'FF' : '11111111'"
                  :class="cn(
                    'flex-1 min-w-[280px] px-6 py-4 rounded-2xl border-2 font-mono text-xl',
                    'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600',
                    'text-slate-800 dark:text-slate-200 placeholder-slate-400',
                    'focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2',
                    practiceFeedback === 'incorrect' && 'border-coral ring-2 ring-coral/30',
                    practiceFeedback === 'correct' && 'border-emerald-400 dark:border-emerald-500',
                  )"
                  @keydown.enter="practiceFeedback ? nextQuestion() : checkPracticeAnswer()"
                />
                <button
                  v-if="!practiceFeedback"
                  type="button"
                  @click="checkPracticeAnswer()"
                  class="px-8 py-4 rounded-2xl font-semibold text-lg bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
                >
                  Check
                </button>
                <button
                  v-else
                  type="button"
                  @click="nextQuestion()"
                  class="px-8 py-4 rounded-2xl font-semibold text-lg bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
                >
                  Next
                </button>
                <button
                  v-if="!practiceFeedback && !['speed-round','nibble-sprint','survival'].includes(gameType)"
                  type="button"
                  @click="revealAnswer()"
                  class="px-4 py-4 rounded-2xl text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Show answer
                </button>
              </div>
              <Transition name="feedback">
                <div v-if="practiceFeedback" class="mt-6 flex items-center gap-3">
                  <CheckIcon v-if="practiceFeedback === 'correct'" class="w-8 h-8 text-emerald-500" />
                  <XMarkIcon v-else class="w-8 h-8 text-coral" />
                  <span :class="practiceFeedback === 'correct' ? 'text-emerald-600 dark:text-emerald-400 text-lg' : 'text-coral dark:text-rose-400 text-lg'">
                    {{ practiceFeedback === 'correct' ? 'Correct!' : 'Answer: ' + practiceQuestion.answer }}
                  </span>
                </div>
              </Transition>
              <div v-if="showAnswer && !practiceFeedback" class="mt-4 text-slate-600 dark:text-slate-400">
                Answer: <span class="font-mono text-emerald-600 dark:text-emerald-400 text-lg">{{ practiceQuestion.answer }}</span>
              </div>
            </template>
          </div>
        </main>

        <!-- Right sidebar: calculator, power table, leaderboard -->
        <aside class="w-72 shrink-0 flex flex-col gap-4 p-4 overflow-y-auto bg-soft-yellow/20 dark:bg-amber-900/10 border-l border-soft-yellow/30">
          <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-soft-yellow/40">
            <h3 class="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 uppercase">Power of 2</h3>
            <div class="grid grid-cols-8 gap-1 font-mono text-sm">
              <div v-for="(val, i) in powerTable" :key="i" class="text-center py-1.5 rounded bg-amber-100/50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200">
                {{ val }}
              </div>
            </div>
          </div>
          <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-soft-yellow/40">
            <h3 class="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 uppercase">Calculator</h3>
            <div v-if="calcExpression" class="font-mono text-right text-xs text-slate-500 mb-1">{{ calcExpression }}</div>
            <div class="font-mono text-right text-2xl text-slate-800 dark:text-slate-200 mb-3">{{ calcDisplay }}</div>
            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="key in ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+']"
                :key="key"
                type="button"
                @click="key === '=' ? calcEquals() : ['+','-','*','/'].includes(key) ? calcInputOp(key as '+'|'-'|'*'|'/') : key === '.' ? calcInputDecimal() : calcInputDigit(key)"
                :class="cn(
                  'py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  ['+','-','*','/'].includes(key) ? 'bg-lavender/40 text-violet-700' : key === '=' ? 'bg-mint/50 text-emerald-800' : 'bg-white/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200',
                  'hover:scale-[1.02] active:scale-95'
                )"
              >
                {{ key }}
              </button>
              <button type="button" @click="calcClear()" class="py-2.5 rounded-xl col-span-2 bg-peach/40 text-rose-800 hover:bg-peach/60 transition-all duration-200">C</button>
            </div>
          </div>

          <div v-if="isAuthenticated && Object.keys(ACHIEVEMENTS).length > 0" class="p-4 rounded-2xl bg-warm-pink/20 dark:bg-rose-900/20 border border-warm-pink/30">
            <h3 class="text-xs font-semibold text-rose-700 dark:text-rose-300 mb-2 uppercase">Achievements</h3>
            <div class="flex flex-wrap gap-2">
              <div v-for="(ach, id) in ACHIEVEMENTS" :key="id"
                :class="cn(
                  'flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs transition-all',
                  unlockedAchievements.has(id)
                    ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-700/50 dark:text-amber-100 ring-1 ring-amber-300/50 dark:ring-amber-600/50'
                    : 'bg-slate-200/50 dark:bg-slate-700/30 text-slate-500',
                )"
                :title="ach.description"
              >
                <component :is="achievementIcons[ach.icon]" class="w-4 h-4 shrink-0" :class="unlockedAchievements.has(id) ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'" />
                {{ ach.name }}
              </div>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-soft-yellow/40 flex-1 min-h-0 flex flex-col">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase flex items-center gap-1">
                <TrophyIcon class="w-4 h-4" /> Leaderboard
              </h3>
              <button
                type="button"
                @click="leaderboardFullscreen = true"
                class="p-1.5 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                title="Expand leaderboard"
              >
                <ArrowsPointingOutIcon class="w-4 h-4" />
              </button>
            </div>
            <div class="flex items-center gap-1.5 mb-2 flex-nowrap">
              <select v-model="leaderboardMode" @change="loadLeaderboard" class="text-xs px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 min-w-0 flex-1 shrink">
                <option value="speed-round">Speed</option>
                <option value="survival">Survival</option>
                <option value="streak-challenge">Streak</option>
                <option value="nibble-sprint">Nibble</option>
                <option value="daily-streak">Daily Streak</option>
              </select>
              <select v-if="leaderboardMode !== 'daily-streak' && leaderboardMode !== 'nibble-sprint'" v-model="leaderboardConv" @change="loadLeaderboard" class="text-xs px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 min-w-0 flex-1 shrink">
                <option v-for="ct in conversionTypes" :key="ct.id" :value="ct.id">{{ ct.label }}</option>
              </select>
            </div>
            <div v-if="!isAuthenticated" class="text-xs text-slate-500 py-1.5 mb-1">
              <p class="mb-1">Sign in to save a score.</p>
              <div class="flex flex-wrap gap-2">
                <router-link :to="{ path: '/login', query: { redirect: route.fullPath } }" class="text-mint dark:text-emerald-400 hover:underline font-medium">Sign in</router-link>
                <span class="text-slate-400">·</span>
                <router-link :to="{ path: '/signup', query: { redirect: route.fullPath } }" class="text-mint dark:text-emerald-400 hover:underline font-medium">Sign up</router-link>
              </div>
            </div>
            <div v-if="leaderboardLoading" class="text-xs text-slate-500 py-2">Loading...</div>
            <div v-else-if="leaderboard.length === 0" class="text-xs text-slate-500 py-2">No scores yet.</div>
            <div v-else class="overflow-y-auto flex-1 min-h-0 text-sm">
              <div v-for="r in leaderboard" :key="r.rank" class="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                <span class="w-6 flex items-center justify-center shrink-0">
                  <TrophyIconSolid v-if="r.rank === 1" class="w-4 h-4 text-amber-500" title="1st" />
                  <TrophyIconSolid v-else-if="r.rank === 2" class="w-4 h-4 text-slate-400" title="2nd" />
                  <TrophyIconSolid v-else-if="r.rank === 3" class="w-4 h-4 text-amber-700" title="3rd" />
                  <span v-else class="text-slate-600 dark:text-slate-400 text-xs">{{ r.rank }}</span>
                </span>
                <span class="flex-1 truncate text-slate-800 dark:text-slate-200">{{ r.userName }}</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-medium">{{ r.score }}</span>
              </div>
            </div>
          </div>

          <!-- XP Leaderboard fullscreen modal -->
          <Teleport to="body">
            <div
              v-if="xpLeaderboardFullscreen"
              class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              @click.self="xpLeaderboardFullscreen = false"
            >
              <div
                class="w-full max-w-lg rounded-3xl p-8 bg-white/95 dark:bg-slate-800/95 border-2 border-slate-200/80 dark:border-slate-600/80 shadow-2xl flex flex-col max-h-[85vh]"
                @click.stop
              >
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-amber-800 dark:text-amber-300 uppercase flex items-center gap-2">
                    <AcademicCapIcon class="w-6 h-6" /> XP Leaderboard
                  </h3>
                  <button
                    type="button"
                    @click="xpLeaderboardFullscreen = false"
                    class="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                    aria-label="Close"
                  >
                    <XMarkIcon class="w-5 h-5" />
                  </button>
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">Top players by total XP earned.</p>
                <div v-if="xpLeaderboardLoading" class="text-sm text-slate-500 py-4 text-center">Loading...</div>
                <div v-else-if="xpLeaderboard.length === 0" class="text-sm text-slate-500 py-4 text-center">No players yet. Play to earn XP!</div>
                <div v-else class="flex flex-col gap-4 min-h-0 overflow-y-auto">
                  <div v-for="r in xpLeaderboard" :key="r.rank" class="flex items-center gap-3 py-3 px-4 rounded-xl bg-slate-50/80 dark:bg-slate-700/30">
                    <span class="w-8 flex items-center justify-center shrink-0">
                      <TrophyIconSolid v-if="r.rank === 1" class="w-6 h-6 text-amber-500" title="1st" />
                      <TrophyIconSolid v-else-if="r.rank === 2" class="w-6 h-6 text-slate-400" title="2nd" />
                      <TrophyIconSolid v-else-if="r.rank === 3" class="w-6 h-6 text-amber-700" title="3rd" />
                      <span v-else class="text-slate-600 dark:text-slate-400 font-medium">{{ r.rank }}</span>
                    </span>
                    <span class="flex-1 truncate text-slate-800 dark:text-slate-200">{{ r.userName }}</span>
                    <span class="text-amber-600 dark:text-amber-400 font-semibold">Lv {{ r.level }}</span>
                    <span class="text-slate-600 dark:text-slate-400 text-sm">{{ r.totalXp }} XP</span>
                  </div>
                </div>
              </div>
            </div>
          </Teleport>

          <!-- Leaderboard fullscreen plaque -->
          <Teleport to="body">
            <div
              v-if="leaderboardFullscreen"
              class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              @click.self="leaderboardFullscreen = false"
            >
              <div
                class="w-full max-w-lg rounded-3xl p-8 bg-white/95 dark:bg-slate-800/95 border-2 border-slate-200/80 dark:border-slate-600/80 shadow-2xl flex flex-col max-h-[85vh]"
                @click.stop
              >
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-amber-800 dark:text-amber-300 uppercase flex items-center gap-2">
                    <TrophyIcon class="w-6 h-6" /> Leaderboard
                  </h3>
                  <button
                    type="button"
                    @click="leaderboardFullscreen = false"
                    class="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                    aria-label="Close"
                  >
                    <XMarkIcon class="w-5 h-5" />
                  </button>
                </div>
                <div class="flex flex-col gap-2 mb-4">
                  <select v-model="leaderboardMode" @change="loadLeaderboard" :class="cn('w-full text-sm px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300')">
                    <option value="speed-round">Speed Round</option>
                    <option value="survival">Survival</option>
                    <option value="streak-challenge">Streak Challenge</option>
                    <option value="nibble-sprint">Nibble Sprint</option>
                    <option value="daily-streak">Daily Streak</option>
                  </select>
                  <select v-if="leaderboardMode !== 'daily-streak' && leaderboardMode !== 'nibble-sprint'" v-model="leaderboardConv" @change="loadLeaderboard" class="w-full text-sm px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                    <option v-for="ct in conversionTypes" :key="ct.id" :value="ct.id">{{ ct.label }}</option>
                  </select>
                </div>
                <div v-if="!isAuthenticated" class="text-sm text-slate-500 py-3 mb-2 text-center rounded-xl bg-slate-50/80 dark:bg-slate-700/30">
                  <p class="mb-2">Sign in to save a score.</p>
                  <div class="flex justify-center gap-3">
                    <router-link :to="{ path: '/login', query: { redirect: route.fullPath } }" class="px-4 py-2 rounded-xl bg-mint/30 text-emerald-800 dark:text-emerald-200 hover:bg-mint/50 font-medium transition-colors">Sign in</router-link>
                    <router-link :to="{ path: '/signup', query: { redirect: route.fullPath } }" class="px-4 py-2 rounded-xl bg-mint/30 text-emerald-800 dark:text-emerald-200 hover:bg-mint/50 font-medium transition-colors">Sign up</router-link>
                  </div>
                </div>
                <div v-if="leaderboardLoading" class="text-sm text-slate-500 py-4 text-center">Loading...</div>
                <div v-else-if="leaderboard.length === 0" class="text-sm text-slate-500 py-4 text-center">No scores yet.</div>
                <div v-else class="flex flex-col gap-4 min-h-0">
                  <div class="overflow-y-auto flex-1 min-h-0 text-base space-y-1">
                    <div v-for="r in leaderboard" :key="r.rank" class="flex items-center gap-3 py-3 px-4 rounded-xl bg-slate-50/80 dark:bg-slate-700/30">
                      <span class="w-8 flex items-center justify-center shrink-0">
                        <TrophyIconSolid v-if="r.rank === 1" class="w-6 h-6 text-amber-500" title="1st" />
                        <TrophyIconSolid v-else-if="r.rank === 2" class="w-6 h-6 text-slate-400" title="2nd" />
                        <TrophyIconSolid v-else-if="r.rank === 3" class="w-6 h-6 text-amber-700" title="3rd" />
                        <span v-else class="text-slate-600 dark:text-slate-400 font-medium">{{ r.rank }}</span>
                      </span>
                      <span class="flex-1 truncate text-slate-800 dark:text-slate-200">{{ r.userName }}</span>
                      <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ r.score }}</span>
                    </div>
                  </div>
                  <div v-if="Object.keys(ACHIEVEMENTS).length > 0" class="pt-4 border-t border-slate-200 dark:border-slate-600">
                    <p class="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 uppercase">Your achievements</p>
                    <div class="flex flex-wrap gap-2">
                      <div v-for="(ach, id) in ACHIEVEMENTS" :key="id"
                        :class="cn(
                          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs',
                          unlockedAchievements.has(id) ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-700/50 dark:text-amber-100' : 'bg-slate-100/80 dark:bg-slate-700/50 text-slate-400',
                        )"
                        :title="ach.description"
                      >
                        <component :is="achievementIcons[ach.icon]" class="w-3.5 h-3.5 shrink-0" />
                        {{ ach.name }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Teleport>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-card {
  transform-origin: center center;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 0.5s ease-in-out;
}

/* Feedback message transition */
.feedback-enter-active {
  animation: feedback-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.feedback-leave-active {
  animation: feedback-out 0.25s ease-out forwards;
}
@keyframes feedback-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes feedback-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
  }
}

/* Box input transition for smooth state changes */
.box-input {
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
</style>
