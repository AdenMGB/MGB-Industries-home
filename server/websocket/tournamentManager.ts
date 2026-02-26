import type { DatabaseSync } from 'node:sqlite'
import type { Question } from './questionGenerator.js'
import {
  generateQuestionSequenceWithSeed,
  type GameMode,
  type ConversionType,
} from './questionGenerator.js'
import type { GoalConfig } from './roomManager.js'

const SYNC_ROUNDS = 3
const QUESTION_COUNT = 500

export type TournamentStatus = 'lobby' | 'syncing' | 'playing' | 'ended'
export type BracketStatus = 'lobby' | 'syncing' | 'playing' | 'ended'

export interface TournamentConfig {
  mode: GameMode
  conv: ConversionType
  goalType: 'first_to' | 'most_in_time' | 'survival' | 'streak' | 'timed'
  goalValue: GoalConfig
}

export interface TournamentParticipant {
  id: string
  userId: string | null
  guestId: string | null
  displayName: string
  score: number
  currentQuestionIndex: number
  lives: number
  streak: number
  joinedAt: string
  leftAt: string | null
  wsId: string
}

export interface BracketState {
  tournamentId: string
  bracketIndex: number
  config: TournamentConfig
  status: BracketStatus
  participants: Map<string, TournamentParticipant>
  questions: Question[]
  syncRound: number
  syncReady: Set<string>
  startedAt: string | null
  endedAt: string | null
}

const bracketStore = new Map<string, BracketState>()

function bracketKey(tournamentId: string, bracketIndex: number): string {
  return `${tournamentId}:${bracketIndex}`
}

function generateTournamentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function now(): string {
  return new Date().toISOString()
}

export function createTournament(
  db: DatabaseSync,
  adminUserId: string,
  name: string,
  config: TournamentConfig,
  bracketSize: number,
  maxPlayers: number
): { tournamentId: string; joinLink: string } {
  let tournamentId = generateTournamentCode()
  while (db.prepare('SELECT id FROM tournaments WHERE id = ?').get(tournamentId)) {
    tournamentId = generateTournamentCode()
  }

  db.prepare(`
    INSERT INTO tournaments (id, name, config, bracket_size, max_players, status, created_by_admin_id)
    VALUES (?, ?, ?, ?, ?, 'lobby', ?)
  `).run(tournamentId, name, JSON.stringify(config), bracketSize, maxPlayers, adminUserId)

  const origin = process.env.SITE_URL || 'http://localhost:5173'
  const joinLink = `${origin}/developer-tools/conversion-trainer/tournament/${tournamentId}`

  return { tournamentId, joinLink }
}

export function getTournament(
  db: DatabaseSync,
  tournamentId: string
): {
  id: string
  name: string
  config: TournamentConfig
  bracketSize: number
  maxPlayers: number
  status: TournamentStatus
  participantCount: number
} | null {
  const row = db.prepare(`
    SELECT t.id, t.name, t.config, t.bracket_size, t.max_players, t.status,
           (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id AND tp.left_at IS NULL) as participant_count
    FROM tournaments t
    WHERE t.id = ?
  `).get(tournamentId.toUpperCase()) as {
    id: string
    name: string
    config: string
    bracket_size: number
    max_players: number
    status: string
    participant_count: number
  } | undefined

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    config: JSON.parse(row.config) as TournamentConfig,
    bracketSize: row.bracket_size,
    maxPlayers: row.max_players,
    status: row.status as TournamentStatus,
    participantCount: row.participant_count,
  }
}

export function joinTournament(
  db: DatabaseSync,
  tournamentId: string,
  userId: string | null,
  guestId: string | null,
  displayName: string
): { participantId: string; bracketIndex: number; error?: string } | null {
  const t = getTournament(db, tournamentId)
  if (!t) return null
  if (t.status !== 'lobby') return null

  const count = t.participantCount
  if (count >= t.maxPlayers) return null

  const bracketIndex = Math.floor(count / t.bracketSize)
  let bracketRow = db.prepare(`
    SELECT id FROM tournament_brackets
    WHERE tournament_id = ? AND bracket_index = ?
  `).get(tournamentId.toUpperCase(), bracketIndex) as { id: number } | undefined

  if (!bracketRow) {
    db.prepare(`
      INSERT INTO tournament_brackets (tournament_id, bracket_index, status)
      VALUES (?, ?, 'lobby')
    `).run(tournamentId.toUpperCase(), bracketIndex)
    bracketRow = db.prepare(`
      SELECT id FROM tournament_brackets
      WHERE tournament_id = ? AND bracket_index = ?
    `).get(tournamentId.toUpperCase(), bracketIndex) as { id: number }
  }

  const participantUuid = crypto.randomUUID()
  db.prepare(`
    INSERT INTO tournament_participants (tournament_id, bracket_id, participant_uuid, user_id, guest_id, guest_display_name, display_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    tournamentId.toUpperCase(),
    bracketRow.id,
    participantUuid,
    userId,
    guestId,
    userId ? null : displayName,
    displayName
  )

  return { participantId: participantUuid, bracketIndex }
}

export function getParticipant(
  db: DatabaseSync,
  tournamentId: string,
  participantId: string
): {
  participantUuid: string
  bracketId: number
  bracketIndex: number
  displayName: string
  userId: string | null
  guestId: string | null
} | null {
  const row = db.prepare(`
    SELECT tp.participant_uuid, tp.bracket_id, tp.user_id, tp.guest_id, tp.guest_display_name, tp.display_name, tb.bracket_index
    FROM tournament_participants tp
    JOIN tournament_brackets tb ON tp.bracket_id = tb.id
    WHERE tp.tournament_id = ? AND tp.participant_uuid = ? AND tp.left_at IS NULL
  `).get(tournamentId.toUpperCase(), participantId) as {
    participant_uuid: string
    bracket_id: number
    user_id: string | null
    guest_id: string | null
    guest_display_name: string | null
    display_name: string
    bracket_index: number
  } | undefined

  if (!row) return null

  return {
    participantUuid: row.participant_uuid,
    bracketId: row.bracket_id,
    bracketIndex: row.bracket_index,
    displayName: row.display_name || row.guest_display_name || 'Player',
    userId: row.user_id,
    guestId: row.guest_id,
  }
}

export function getTournamentBrackets(
  db: DatabaseSync,
  tournamentId: string
): Array<{ bracketIndex: number; status: string; participantCount: number }> {
  const rows = db.prepare(`
    SELECT tb.bracket_index, tb.status,
           (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.bracket_id = tb.id AND tp.left_at IS NULL) as participant_count
    FROM tournament_brackets tb
    WHERE tb.tournament_id = ?
    ORDER BY tb.bracket_index
  `).all(tournamentId.toUpperCase()) as Array<{
    bracket_index: number
    status: string
    participant_count: number
  }>
  return rows.map((r) => ({
    bracketIndex: r.bracket_index,
    status: r.status,
    participantCount: r.participant_count,
  }))
}

export function getBracketParticipants(
  db: DatabaseSync,
  tournamentId: string,
  bracketIndex: number
): Array<{ participantUuid: string; displayName: string; score: number }> {
  const rows = db.prepare(`
    SELECT tp.participant_uuid, COALESCE(tp.display_name, tp.guest_display_name, 'Player') as display_name, tp.score
    FROM tournament_participants tp
    JOIN tournament_brackets tb ON tp.bracket_id = tb.id
    WHERE tp.tournament_id = ? AND tb.bracket_index = ? AND tp.left_at IS NULL
    ORDER BY tp.score DESC, tp.joined_at ASC
  `).all(tournamentId.toUpperCase(), bracketIndex) as Array<{
    participant_uuid: string
    display_name: string
    score: number
  }>

  return rows.map((r) => ({
    participantUuid: r.participant_uuid,
    displayName: r.display_name,
    score: r.score,
  }))
}

export function startTournament(db: DatabaseSync, tournamentId: string, adminUserId: string): { ok: boolean; error?: string } {
  const row = db.prepare(`
    SELECT id, created_by_admin_id, status, bracket_size, config
    FROM tournaments WHERE id = ?
  `).get(tournamentId.toUpperCase()) as {
    id: string
    created_by_admin_id: string
    status: string
    bracket_size: number
    config: string
  } | undefined

  if (!row) return { ok: false, error: 'Tournament not found' }
  if (row.created_by_admin_id !== adminUserId) return { ok: false, error: 'Not the tournament creator' }
  if (row.status !== 'lobby') return { ok: false, error: 'Tournament already started or ended' }

  const config = JSON.parse(row.config) as TournamentConfig

  const brackets = db.prepare(`
    SELECT id, bracket_index FROM tournament_brackets
    WHERE tournament_id = ?
    ORDER BY bracket_index
  `).all(tournamentId.toUpperCase()) as Array<{ id: number; bracket_index: number }>

  for (const b of brackets) {
    const participants = db.prepare(`
      SELECT participant_uuid, user_id, guest_id, COALESCE(display_name, guest_display_name, 'Player') as display_name
      FROM tournament_participants
      WHERE bracket_id = ? AND left_at IS NULL
    `).all(b.id) as Array<{
      participant_uuid: string
      user_id: string | null
      guest_id: string | null
      display_name: string
    }>

    if (participants.length === 0) continue

    const questions = generateQuestionSequenceWithSeed(
      config.conv,
      config.mode,
      QUESTION_COUNT,
      b.bracket_index * 1000 + tournamentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    )

    const participantMap = new Map<string, TournamentParticipant>()
    for (const p of participants) {
      participantMap.set(p.participant_uuid, {
        id: p.participant_uuid,
        userId: p.user_id,
        guestId: p.guest_id,
        displayName: p.display_name,
        score: 0,
        currentQuestionIndex: 0,
        lives: config.goalValue.lives ?? 3,
        streak: 0,
        joinedAt: now(),
        leftAt: null,
        wsId: '',
      })
    }

    const state: BracketState = {
      tournamentId: row.id,
      bracketIndex: b.bracket_index,
      config,
      status: 'syncing',
      participants: participantMap,
      questions,
      syncRound: 1,
      syncReady: new Set(),
      startedAt: null,
      endedAt: null,
    }

    bracketStore.set(bracketKey(row.id, b.bracket_index), state)

    db.prepare(`
      UPDATE tournament_brackets SET status = 'syncing' WHERE id = ?
    `).run(b.id)
  }

  db.prepare(`
    UPDATE tournaments SET status = 'syncing' WHERE id = ?
  `).run(tournamentId.toUpperCase())

  return { ok: true }
}

export function getBracketState(tournamentId: string, bracketIndex: number): BracketState | undefined {
  return bracketStore.get(bracketKey(tournamentId.toUpperCase(), bracketIndex))
}

export function getBracketStateByParticipant(
  db: DatabaseSync,
  tournamentId: string,
  participantId: string
): BracketState | undefined {
  const p = getParticipant(db, tournamentId, participantId)
  if (!p) return undefined
  return getBracketState(tournamentId, p.bracketIndex)
}

function normalizeAnswer(input: string, conv: string, bits = 8): string {
  let trimmed = input.trim().toLowerCase()
  if (trimmed === '2') trimmed = '0'
  if (conv === 'ipv4-full') return trimmed
  if (conv === 'hex-standalone' || conv === 'hex-octet') {
    const cleaned = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed
    return cleaned.toUpperCase().padStart(2, '0')
  }
  if (conv === 'ipv6-hextet') {
    const cleaned = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed
    return cleaned.toUpperCase().padStart(4, '0')
  }
  if (conv === 'binary-standalone' || conv === 'binary-octet') {
    const binaryOnly = trimmed.replace(/[^01]/g, '')
    if (binaryOnly.length === 0) {
      // Accept decimal input (e.g. "4" -> "00000100", "0" -> "00000000")
      const num = parseInt(trimmed, 10)
      const max = bits === 4 ? 15 : 255
      if (!Number.isNaN(num) && num >= 0 && num <= max) {
        return num.toString(2).padStart(bits, '0')
      }
      return trimmed
    }
    return binaryOnly.padStart(bits, '0').slice(-bits)
  }
  return trimmed
}

export function getBracketNextQuestion(bracket: BracketState, participantId: string): Question | null {
  const p = bracket.participants.get(participantId)
  if (!p) return null
  if (p.currentQuestionIndex >= bracket.questions.length) return null
  return bracket.questions[p.currentQuestionIndex]
}

export function validateBracketAnswer(
  bracket: BracketState,
  participantId: string,
  answer: string
): { correct: boolean; nextQuestion: Question | null } {
  const p = bracket.participants.get(participantId)
  if (!p) return { correct: false, nextQuestion: null }

  const q = bracket.questions[p.currentQuestionIndex]
  if (!q) return { correct: false, nextQuestion: null }

  const bits = bracket.config.mode === 'nibble-sprint' ? 4 : 8
  const normalized = normalizeAnswer(answer, bracket.config.conv, bits)
  const correct = normalized === q.answer.toLowerCase()

  if (correct) {
    p.score++
    p.streak++
    p.currentQuestionIndex++
  } else {
    p.streak = 0
    if (bracket.config.goalValue.lives !== undefined) {
      p.lives--
    }
  }

  const nextQuestion = p.currentQuestionIndex < bracket.questions.length
    ? bracket.questions[p.currentQuestionIndex]
    : null

  return { correct, nextQuestion }
}

export function checkBracketGameEnd(bracket: BracketState): { ended: boolean; reason?: string } {
  if (bracket.status !== 'playing') return { ended: false }

  const players = Array.from(bracket.participants.values()).filter((p) => !p.leftAt)

  if (bracket.config.goalType === 'first_to' && bracket.config.goalValue.firstTo) {
    const winner = players.find((p) => p.score >= bracket.config.goalValue.firstTo!)
    if (winner) return { ended: true, reason: 'first_to' }
  }

  if (bracket.config.goalType === 'most_in_time' || bracket.config.goalType === 'timed') {
    const timeSeconds = bracket.config.goalValue.timeSeconds ?? 60
    const elapsed = bracket.startedAt
      ? (Date.now() - new Date(bracket.startedAt).getTime()) / 1000
      : 0
    if (elapsed >= timeSeconds) return { ended: true, reason: 'time_up' }
  }

  if (bracket.config.goalType === 'survival' && bracket.config.goalValue.lives !== undefined) {
    const alive = players.filter((p) => p.lives > 0)
    if (alive.length <= 1) return { ended: true, reason: 'survival' }
  }

  return { ended: false }
}

export function getBracketLeaderboard(bracket: BracketState): Array<{ rank: number; displayName: string; score: number; isGuest: boolean }> {
  const players = Array.from(bracket.participants.values())
    .filter((p) => !p.leftAt)
    .sort((a, b) => b.score - a.score)
  return players.map((p, i) => ({
    rank: i + 1,
    displayName: p.displayName,
    score: p.score,
    isGuest: !!p.guestId,
  }))
}

export function removeBracketParticipant(bracket: BracketState, participantId: string): void {
  const p = bracket.participants.get(participantId)
  if (p) p.wsId = ''
}

export {
  bracketStore,
  SYNC_ROUNDS,
}
