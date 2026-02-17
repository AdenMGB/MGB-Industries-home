<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import {
  ArrowLeftIcon,
  CalculatorIcon,
  TableCellsIcon,
  BookOpenIcon,
  PlayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import {
  parseNumber,
  decimalToBinary,
  decimalToHex,
  ipv4ToBinary,
} from '@/utils/numberConversion'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const router = useRouter()

type TabId = 'calculator' | 'table' | 'learn' | 'practice'
const activeTab = ref<TabId>('calculator')

type PracticeMode =
  | 'binary-standalone'
  | 'binary-octet'
  | 'hex-standalone'
  | 'hex-octet'
  | 'ipv4-full'

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
const practiceMode = ref<PracticeMode>('binary-standalone')
const practiceInput = ref('')
const practiceQuestion = ref<{ value: string; answer: string } | null>(null)
const practiceFeedback = ref<'correct' | 'incorrect' | null>(null)
const practiceStreak = ref(0)
const practiceTotal = ref(0)
const practiceCorrect = ref(0)
const showAnswer = ref(false)

// Power-of-2 table for binary conversion (bit 7 → bit 0)
const powerTable = [128, 64, 32, 16, 8, 4, 2, 1]

// Vanilla arithmetic calculator for practice session
const calcDisplay = ref('0')
const calcPrev = ref<number | null>(null)
const calcOp = ref<'+' | '-' | '*' | '/' | null>(null)
const calcWaitingForOperand = ref(false)

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

const practiceModes = [
  { id: 'binary-standalone' as PracticeMode, label: 'Binary (standalone)', desc: 'Decimal → Binary (0–255)' },
  { id: 'binary-octet' as PracticeMode, label: 'Binary (IP octet)', desc: 'Convert octet to 8-bit binary' },
  { id: 'hex-standalone' as PracticeMode, label: 'Hex (standalone)', desc: 'Decimal → Hex (0–255)' },
  { id: 'hex-octet' as PracticeMode, label: 'Hex (IP octet)', desc: 'Convert octet to hex' },
  { id: 'ipv4-full' as PracticeMode, label: 'IPv4 → Binary', desc: 'Full IP address to binary' },
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generatePracticeQuestion(): void {
  showAnswer.value = false
  practiceFeedback.value = null
  practiceInput.value = ''

  if (practiceMode.value === 'ipv4-full') {
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

  const dec = randomInt(0, 255)
  const decimalStr = dec.toString()

  if (practiceMode.value === 'binary-standalone' || practiceMode.value === 'binary-octet') {
    practiceQuestion.value = {
      value: decimalStr,
      answer: decimalToBinary(dec, 8),
    }
  } else {
    const hex = decimalToHex(dec).toUpperCase().padStart(2, '0')
    practiceQuestion.value = { value: decimalStr, answer: hex }
  }
}

function normalizeAnswer(input: string, mode: PracticeMode): string {
  const trimmed = input.trim().toLowerCase()
  if (mode === 'ipv4-full') {
    return trimmed
  }
  if (mode === 'hex-standalone' || mode === 'hex-octet') {
    const cleaned = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed
    return cleaned.toUpperCase().padStart(2, '0')
  }
  return trimmed
}

function checkPracticeAnswer(): void {
  if (!practiceQuestion.value) return
  const expected = practiceQuestion.value.answer.toLowerCase()
  const got = normalizeAnswer(practiceInput.value, practiceMode.value)

  practiceTotal.value++

  const isCorrect =
    practiceMode.value === 'ipv4-full'
      ? got === expected
      : got.toLowerCase() === expected.toLowerCase()

  if (isCorrect) {
    practiceCorrect.value++
    practiceStreak.value++
    practiceFeedback.value = 'correct'
  } else {
    practiceStreak.value = 0
    practiceFeedback.value = 'incorrect'
  }
}

function nextQuestion(): void {
  generatePracticeQuestion()
}

function revealAnswer(): void {
  showAnswer.value = true
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* ignore */
  }
}

const goBack = () => router.push('/developer-tools')

onMounted(() => {
  gsap.fromTo('.page-header', { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: premiumEase })
  gsap.fromTo('.tool-card', { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, delay: 0.1, ease: premiumEase })
  generatePracticeQuestion()
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
          'focus:outline-none focus:ring-2 focus:ring-mint/50 rounded-lg px-2 py-1 -ml-2',
        )"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Developer Tools
      </button>

      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Conversion Trainer
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Practice mental binary and hex conversion with calculator, reference table, and quiz games.
        </p>
      </div>

      <!-- Tabs -->
      <div class="flex flex-wrap gap-2 mb-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          @click="activeTab = tab.id"
          :class="cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            activeTab === tab.id
              ? 'bg-mint/20 text-mint ring-1 ring-mint/30'
              : 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
          )"
        >
          <component :is="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- Calculator Tab -->
      <div v-show="activeTab === 'calculator'" class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <CalculatorIcon class="w-5 h-5 text-mint" />
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
      <div v-show="activeTab === 'table'" class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <TableCellsIcon class="w-5 h-5 text-mint" />
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
      <div v-show="activeTab === 'learn'" class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <BookOpenIcon class="w-5 h-5 text-mint" />
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

      <!-- Practice Tab -->
      <div v-show="activeTab === 'practice'" class="tool-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
        <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <PlayIcon class="w-5 h-5 text-mint" />
          Practice
        </h2>
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mode</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="mode in practiceModes"
                :key="mode.id"
                type="button"
                @click="practiceMode = mode.id; generatePracticeQuestion()"
                :class="cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  practiceMode === mode.id
                    ? 'bg-mint/20 text-mint ring-1 ring-mint/30'
                    : 'bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-gray-500/50',
                )"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>

          <!-- Power table & Calculator for practice -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Power of 2 (8-bit)</h3>
              <div class="overflow-x-auto">
                <table class="w-full font-mono text-sm">
                  <thead>
                    <tr class="text-gray-500 dark:text-gray-400 text-xs">
                      <th v-for="(_, i) in powerTable" :key="i" class="px-2 py-1 text-center">bit {{ 7 - i }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="text-gray-800 dark:text-gray-200 font-medium">
                      <td v-for="(val, i) in powerTable" :key="i" class="px-2 py-1.5 text-center border border-gray-200/50 dark:border-gray-600/50">
                        {{ val }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="p-4 rounded-lg bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50">
              <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Calculator</h3>
              <div v-if="calcExpression" class="font-mono text-right text-sm text-gray-500 dark:text-gray-400 mb-1 min-h-[20px] break-all">
                {{ calcExpression }}
              </div>
              <div class="font-mono text-right text-xl text-gray-800 dark:text-gray-200 mb-3 min-h-[28px] break-all">
                {{ calcDisplay }}
              </div>
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  v-for="key in ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+']"
                  :key="key"
                  type="button"
                  @click="key === '=' ? calcEquals() : ['+','-','*','/'].includes(key) ? calcInputOp(key as '+'|'-'|'*'|'/') : key === '.' ? calcInputDecimal() : calcInputDigit(key)"
                  :class="cn(
                    'py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-mint/50',
                    ['+','-','*','/'].includes(key)
                      ? 'bg-mint/20 text-mint hover:bg-mint/30'
                      : key === '='
                        ? 'bg-mint/30 text-gray-800 dark:text-white hover:bg-mint/40'
                        : 'bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                  )"
                >
                  {{ key }}
                </button>
                <button
                  type="button"
                  @click="calcClear()"
                  :class="cn(
                    'py-2 rounded-lg text-sm font-medium col-span-2 transition-all duration-200',
                    'bg-gray-200/80 dark:bg-gray-600/80 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-mint/50',
                  )"
                >
                  C
                </button>
              </div>
            </div>
          </div>

          <div v-if="practiceQuestion" class="p-6 rounded-lg bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50">
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm text-gray-500 dark:text-gray-400">
                Streak: {{ practiceStreak }} · Score: {{ practiceCorrect }}/{{ practiceTotal }}
              </span>
            </div>
            <p class="text-lg font-medium text-gray-800 dark:text-white mb-2">
              {{ practiceMode === 'ipv4-full' ? 'Convert to binary (8 bits per octet, dot-separated):' : 'Convert to ' + (practiceMode.includes('hex') ? 'hex' : 'binary') + ':' }}
            </p>
            <p class="text-3xl font-mono font-light text-mint mb-4">{{ practiceQuestion.value }}</p>
            <div class="flex gap-2 flex-wrap">
              <input
                v-model="practiceInput"
                type="text"
                :placeholder="practiceMode === 'ipv4-full' ? '11000000.10101000.00000001.00000001' : practiceMode.includes('hex') ? 'FF' : '11111111'"
                :class="cn(
                  'flex-1 min-w-[200px] px-4 py-3 rounded-lg border font-mono text-sm',
                  'bg-white dark:bg-gray-800 border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-mint/50',
                  practiceFeedback === 'incorrect' && 'border-red-500 ring-1 ring-red-500/50',
                  practiceFeedback === 'correct' && 'border-green-500 dark:border-green-500',
                )"
                @keydown.enter="practiceFeedback ? nextQuestion() : checkPracticeAnswer()"
              />
              <button
                v-if="!practiceFeedback"
                type="button"
                @click="checkPracticeAnswer()"
                :class="cn(
                  'px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200',
                  'bg-mint/30 text-gray-800 dark:text-white hover:bg-mint/40',
                  'focus:outline-none focus:ring-2 focus:ring-mint/50',
                  'transform hover:scale-105 active:scale-95',
                )"
              >
                Check
              </button>
              <button
                v-else
                type="button"
                @click="nextQuestion()"
                :class="cn(
                  'px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200',
                  'bg-mint/30 text-gray-800 dark:text-white hover:bg-mint/40',
                  'focus:outline-none focus:ring-2 focus:ring-mint/50',
                  'transform hover:scale-105 active:scale-95',
                )"
              >
                Next
              </button>
              <button
                v-if="!practiceFeedback"
                type="button"
                @click="revealAnswer()"
                :class="cn(
                  'px-4 py-3 rounded-lg text-sm text-gray-600 dark:text-gray-400',
                  'hover:text-gray-800 dark:hover:text-white transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-mint/50',
                )"
              >
                Show answer
              </button>
            </div>
            <div v-if="practiceFeedback" class="mt-4 flex items-center gap-2">
              <CheckIcon v-if="practiceFeedback === 'correct'" class="w-5 h-5 text-green-600 dark:text-green-400" />
              <XMarkIcon v-else class="w-5 h-5 text-red-600 dark:text-red-400" />
              <span
                :class="practiceFeedback === 'correct'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'"
              >
                {{ practiceFeedback === 'correct' ? 'Correct!' : 'Incorrect. Answer: ' + practiceQuestion.answer }}
              </span>
            </div>
            <div v-if="showAnswer && !practiceFeedback" class="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Answer: <span class="font-mono text-mint">{{ practiceQuestion.answer }}</span>
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
