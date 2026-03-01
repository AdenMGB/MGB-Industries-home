<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'

export type ConversionType =
  | 'binary-standalone'
  | 'binary-octet'
  | 'hex-standalone'
  | 'hex-octet'
  | 'ipv4-full'
  | 'ipv6-hextet'

export type GameMode =
  | 'classic'
  | 'speed-round'
  | 'survival'
  | 'streak-challenge'
  | 'nibble-sprint'

const props = withDefaults(
  defineProps<{
    conv: ConversionType
    mode: GameMode
    showPowerTable: boolean
    feedback?: 'correct' | 'incorrect' | null
    shake?: boolean
    submitLabel?: string
    showNextButton?: boolean
    showRevealButton?: boolean
    disabled?: boolean
  }>(),
  {
    feedback: null,
    shake: false,
    submitLabel: 'Check',
    showNextButton: false,
    showRevealButton: false,
    disabled: false,
  }
)

const emit = defineEmits<{
  submit: [payload: { answer: string }]
  reveal: []
}>()

const powerTable = [128, 64, 32, 16, 8, 4, 2, 1]
const animEase = 'back.out(1.4)'
const animEaseBounce = 'elastic.out(1, 0.5)'

const boxValues = ref<string[]>(Array(8).fill(''))
const practiceInput = ref('')
const overflowError = ref(false)
const internalShake = ref(false)
const boxRefs = ref<(HTMLInputElement | null)[]>(Array(8).fill(null))
const boxContainerRef = ref<HTMLElement | null>(null)
const practiceInputRef = ref<HTMLInputElement | null>(null)

const boxCount = computed(() => {
  if (props.mode === 'nibble-sprint') return 4
  if (props.conv === 'ipv6-hextet') return 4
  if (props.conv.includes('hex')) return 2
  return 8
})

const useSegmentedBoxes = computed(() => props.conv !== 'ipv4-full')

const powerOf2ForBoxes = computed(() => powerTable.slice(-boxCount.value))

const placeholder = computed(() => {
  if (props.conv === 'ipv4-full') return '11000000.10101000...'
  if (props.conv === 'ipv6-hextet') return '0ABC'
  if (props.conv.includes('hex')) return 'FF'
  return '11111111'
})

function clearOverflowError() {
  overflowError.value = false
}

function triggerOverflowError() {
  overflowError.value = true
  emit('submit', { answer: '' })
}

function handleBoxInput(index: number, raw: string) {
  if (overflowError.value) clearOverflowError()
  const isHex = props.conv.includes('hex') || props.conv === 'ipv6-hextet'
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
  const overflow = valid.length > boxCount.value
  const arr = [...boxValues.value]
  for (let i = 0; i < boxCount.value; i++) {
    arr[i] = chars[i] ?? ''
  }
  boxValues.value = arr
  if (overflow) {
    overflowError.value = true
    internalShake.value = true
    setTimeout(() => { internalShake.value = false }, 500)
  }
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
  if (e.key === 'Enter') {
    e.preventDefault()
    if (!overflowError.value) emit('submit', { answer: getAnswer() })
    return
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault()
    const isHex = props.conv.includes('hex') || props.conv === 'ipv6-hextet'
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

function getAnswer(): string {
  return useSegmentedBoxes.value
    ? boxValues.value.slice(0, boxCount.value).join('')
    : practiceInput.value
}

function clear() {
  boxValues.value = Array(8).fill('')
  practiceInput.value = ''
  overflowError.value = false
}

function focusInput() {
  nextTick(() => {
    nextTick(() => {
      if (useSegmentedBoxes.value) boxRefs.value[0]?.focus()
      else practiceInputRef.value?.focus()
    })
  })
}

function handleSubmit() {
  if (overflowError.value) return
  emit('submit', { answer: getAnswer() })
}

function handleReveal() {
  emit('reveal')
}

watch(
  () => props.feedback,
  (fb) => {
    if (fb === 'correct') animateCorrect()
    else if (fb === 'incorrect') animateIncorrect()
  }
)

defineExpose({
  getAnswer,
  clear,
  focus: focusInput,
})
</script>

<template>
  <div class="flex gap-3 flex-wrap items-center">
    <div v-if="useSegmentedBoxes" class="flex flex-col items-center gap-2">
      <div
        ref="boxContainerRef"
        :class="cn(
          'flex gap-1.5',
          (shake || internalShake) && 'animate-shake',
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
          :disabled="disabled"
          :class="cn(
            'box-input w-12 h-14 rounded-xl border-2 font-mono text-xl text-center',
            'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600',
            'text-slate-800 dark:text-slate-200 placeholder-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2',
            feedback === 'incorrect' && 'border-coral ring-2 ring-coral/30',
            feedback === 'correct' && 'border-emerald-400 dark:border-emerald-500',
            overflowError && 'border-coral ring-2 ring-coral/30',
          )"
          @input="handleBoxInput(i, ($event.target as HTMLInputElement).value)"
          @keydown="handleBoxKeydown(i, $event)"
        />
      </div>
      <div v-if="showPowerTable && conv.includes('binary')" class="flex gap-1.5">
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
    <input
      v-else
      ref="practiceInputRef"
      v-model="practiceInput"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="cn(
        'box-input flex-1 min-w-[280px] px-6 py-4 rounded-2xl border-2 font-mono text-xl',
        'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600',
        'text-slate-800 dark:text-slate-200 placeholder-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2',
        feedback === 'incorrect' && 'border-coral ring-2 ring-coral/30',
        feedback === 'correct' && 'border-emerald-400 dark:border-emerald-500',
      )"
      @keydown.enter="handleSubmit"
    />
    <button
      v-if="!showNextButton"
      type="button"
      :disabled="disabled"
      @click="handleSubmit"
      class="px-8 py-4 rounded-2xl font-semibold text-lg bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2"
    >
      {{ submitLabel }}
    </button>
    <button
      v-else
      type="button"
      :disabled="disabled"
      @click="handleSubmit"
      class="px-8 py-4 rounded-2xl font-semibold text-lg bg-mint/60 text-emerald-800 dark:text-emerald-200 hover:bg-mint/80 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2"
    >
      Next
    </button>
    <button
      v-if="showRevealButton"
      type="button"
      :disabled="disabled"
      @click="handleReveal"
      class="px-4 py-4 rounded-2xl text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2"
    >
      Show answer
    </button>
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
.animate-shake {
  animation: shake 0.5s ease-in-out;
}
.box-input {
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
</style>
