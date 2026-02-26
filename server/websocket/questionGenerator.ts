import {
  decimalToBinary,
  decimalToHex,
  ipv4ToBinary,
  decimalToIpv6Hextet,
} from '../utils/numberConversion.js'

const VALID_MODES = ['classic', 'speed-round', 'survival', 'streak-challenge', 'nibble-sprint'] as const
const VALID_CONV = ['binary-standalone', 'binary-octet', 'hex-standalone', 'hex-octet', 'ipv4-full', 'ipv6-hextet'] as const

export type GameMode = (typeof VALID_MODES)[number]
export type ConversionType = (typeof VALID_CONV)[number]

export interface Question {
  value: string
  answer: string
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate a single question. Uses same logic as client for consistency.
 */
export function generateQuestion(
  conv: ConversionType,
  mode: GameMode
): Question {
  const isNibble = mode === 'nibble-sprint'
  const isIpv6Hextet = conv === 'ipv6-hextet'
  const maxVal = isIpv6Hextet ? 65535 : isNibble ? 15 : 255
  const minVal = 0

  if (conv === 'ipv4-full' && !isNibble) {
    const octets = [
      randomInt(1, 223),
      randomInt(0, 255),
      randomInt(0, 255),
      randomInt(1, 254),
    ]
    const ip = octets.join('.')
    const answer = ipv4ToBinary(ip)
    if (answer) {
      return { value: ip, answer }
    }
    return { value: '192.168.1.1', answer: ipv4ToBinary('192.168.1.1')! }
  }

  const dec = randomInt(minVal, maxVal)
  const decimalStr = dec.toString()

  if (conv === 'binary-standalone' || conv === 'binary-octet') {
    const bits = isNibble ? 4 : 8
    return {
      value: decimalStr,
      answer: decimalToBinary(dec, bits),
    }
  }
  if (isIpv6Hextet) {
    const hextetVal = randomInt(0, 65535)
    const answer = decimalToIpv6Hextet(hextetVal)
    if (answer) {
      return { value: hextetVal.toString(), answer }
    }
    return { value: '0', answer: '0000' }
  }
  const hex = decimalToHex(dec).toUpperCase().padStart(2, '0')
  return { value: decimalStr, answer: hex }
}

/**
 * Seeded random (mulberry32) for reproducible question sequences per bracket.
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generate a single question using a custom random function.
 */
export function generateQuestionWithRandom(
  conv: ConversionType,
  mode: GameMode,
  random: () => number
): Question {
  const randomInt = (min: number, max: number) =>
    Math.floor(random() * (max - min + 1)) + min

  const isNibble = mode === 'nibble-sprint'
  const isIpv6Hextet = conv === 'ipv6-hextet'
  const maxVal = isIpv6Hextet ? 65535 : isNibble ? 15 : 255
  const minVal = 0

  if (conv === 'ipv4-full' && !isNibble) {
    const octets = [
      randomInt(1, 223),
      randomInt(0, 255),
      randomInt(0, 255),
      randomInt(1, 254),
    ]
    const ip = octets.join('.')
    const answer = ipv4ToBinary(ip)
    if (answer) return { value: ip, answer }
    return { value: '192.168.1.1', answer: ipv4ToBinary('192.168.1.1')! }
  }

  const dec = randomInt(minVal, maxVal)
  const decimalStr = dec.toString()

  if (conv === 'binary-standalone' || conv === 'binary-octet') {
    const bits = isNibble ? 4 : 8
    return { value: decimalStr, answer: decimalToBinary(dec, bits) }
  }
  if (isIpv6Hextet) {
    const hextetVal = randomInt(0, 65535)
    const answer = decimalToIpv6Hextet(hextetVal)
    if (answer) return { value: hextetVal.toString(), answer }
    return { value: '0', answer: '0000' }
  }
  const hex = decimalToHex(dec).toUpperCase().padStart(2, '0')
  return { value: decimalStr, answer: hex }
}

/**
 * Generate a sequence of questions for a multiplayer game.
 * All players receive the same sequence (server-authoritative).
 */
export function generateQuestionSequence(
  conv: ConversionType,
  mode: GameMode,
  count: number
): Question[] {
  return generateQuestionSequenceWithSeed(conv, mode, count, 0)
}

/**
 * Generate a sequence with a seed - different seeds produce different questions.
 * Used for tournaments: each bracket gets a different seed.
 */
export function generateQuestionSequenceWithSeed(
  conv: ConversionType,
  mode: GameMode,
  count: number,
  seed: number
): Question[] {
  const random = mulberry32(seed)
  const questions: Question[] = []
  const seen = new Set<string>()
  let attempts = 0
  const maxAttempts = count * 2

  while (questions.length < count && attempts < maxAttempts) {
    attempts++
    const q = generateQuestionWithRandom(conv, mode, random)
    const key = `${q.value}:${q.answer}`
    if (!seen.has(key)) {
      seen.add(key)
      questions.push(q)
    }
  }

  return questions
}
