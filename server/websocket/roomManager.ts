import type { DatabaseSync } from 'node:sqlite'
import type { Question } from './questionGenerator.js'
import { generateQuestionSequence } from './questionGenerator.js'
import type { GameMode, ConversionType } from './questionGenerator.js'
import bcrypt from 'bcryptjs'

const SYNC_ROUNDS = 3
const DEAD_ROOM_MINUTES = 5
const CHAT_RATE_LIMIT_MS = 2000
const CHAT_RATE_LIMIT_COUNT = 5

export type Visibility = 'public' | 'private' | 'public_password'
export type RoomStatus = 'lobby' | 'syncing' | 'playing' | 'ended'
export type ParticipantRole = 'player' | 'spectator'

export interface GoalConfig {
  firstTo?: number
  timeSeconds?: number
  lives?: number
  streak?: boolean
}

export interface RoomConfig {
  mode: GameMode
  conv: ConversionType
  goalType: 'first_to' | 'most_in_time' | 'survival' | 'streak' | 'timed'
  goalValue: GoalConfig
}

export interface Participant {
  id: string
  userId: string | null
  guestId: string | null
  displayName: string
  role: ParticipantRole
  score: number
  currentQuestionIndex: number
  lives: number
  streak: number
  joinedAt: string
  leftAt: string | null
  wsId: string
}

export interface RoomState {
  roomId: string
  hostUserId: string | null
  hostGuestId: string | null
  config: RoomConfig
  visibility: Visibility
  maxPlayers: number
  showLeaderboard: boolean
  status: RoomStatus
  participants: Map<string, Participant>
  questions: Question[]
  syncRound: number
  syncReady: Set<string>
  startedAt: string | null
  endedAt: string | null
  lastActivityAt: string
}

export interface RoomStore {
  get(roomId: string): RoomState | undefined
  set(roomId: string, state: RoomState): void
  delete(roomId: string): boolean
  keys(): string[]
}

class InMemoryRoomStore implements RoomStore {
  private roomStates = new Map<string, RoomState>()

  get(roomId: string): RoomState | undefined {
    return this.roomStates.get(roomId)
  }

  set(roomId: string, state: RoomState): void {
    this.roomStates.set(roomId, state)
  }

  delete(roomId: string): boolean {
    return this.roomStates.delete(roomId)
  }

  keys(): string[] {
    return Array.from(this.roomStates.keys())
  }
}

export const roomStore: RoomStore = new InMemoryRoomStore()

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function now(): string {
  return new Date().toISOString()
}

export function createRoom(
  db: DatabaseSync,
  hostUserId: string | null,
  hostGuestId: string | null,
  hostDisplayName: string,
  config: RoomConfig,
  visibility: Visibility,
  password: string | null,
  maxPlayers: number,
  showLeaderboard: boolean
): { roomId: string; room: RoomState } {
  let roomId = generateRoomCode()
  while (roomStore.get(roomId)) {
    roomId = generateRoomCode()
  }

  const passwordHash = password ? bcrypt.hashSync(password, 10) : null
  const goalValue = JSON.stringify(config.goalValue)

  db.prepare(`
    INSERT INTO multiplayer_rooms (id, host_user_id, mode, conv, goal_type, goal_value, visibility, password_hash, max_players, show_leaderboard, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lobby')
  `).run(
    roomId,
    hostUserId,
    config.mode,
    config.conv,
    config.goalType,
    goalValue,
    visibility,
    passwordHash,
    maxPlayers,
    showLeaderboard ? 1 : 0
  )

  const participantId = crypto.randomUUID()
  db.prepare(`
    INSERT INTO multiplayer_room_participants (room_id, user_id, guest_id, guest_display_name, role)
    VALUES (?, ?, ?, ?, 'player')
  `).run(
    roomId,
    hostUserId,
    hostGuestId,
    hostUserId ? null : hostDisplayName
  )

  const participant: Participant = {
    id: participantId,
    userId: hostUserId,
    guestId: hostGuestId,
    displayName: hostDisplayName,
    role: 'player',
    score: 0,
    currentQuestionIndex: 0,
    lives: 3,
    streak: 0,
    joinedAt: now(),
    leftAt: null,
    wsId: '',
  }

  const room: RoomState = {
    roomId,
    hostUserId,
    hostGuestId,
    config,
    visibility,
    maxPlayers,
    showLeaderboard,
    status: 'lobby',
    participants: new Map([[participantId, participant]]),
    questions: [],
    syncRound: 0,
    syncReady: new Set(),
    startedAt: null,
    endedAt: null,
    lastActivityAt: now(),
  }

  roomStore.set(roomId, room)
  return { roomId, room }
}

export function getRoomForJoin(
  db: DatabaseSync,
  roomId: string,
  password?: string
): { room: RoomState; error?: string } | null {
  const row = db.prepare(`
    SELECT id, host_user_id, mode, conv, goal_type, goal_value, visibility, password_hash, max_players, show_leaderboard, status
    FROM multiplayer_rooms WHERE id = ? AND status IN ('lobby', 'syncing')
  `).get(roomId) as {
    id: string
    host_user_id: string | null
    mode: string
    conv: string
    goal_type: string
    goal_value: string
    visibility: string
    password_hash: string | null
    max_players: number
    show_leaderboard: number
    status: string
  } | undefined

  if (!row) return null

  if (row.visibility === 'public_password' && row.password_hash) {
    if (!password || !bcrypt.compareSync(password, row.password_hash)) {
      return { room: null as any, error: 'Invalid password' }
    }
  }

  const room = roomStore.get(roomId)
  if (!room) {
    const goalValue = JSON.parse(row.goal_value) as GoalConfig
    const roomState: RoomState = {
      roomId: row.id,
      hostUserId: row.host_user_id,
      hostGuestId: null,
      config: {
        mode: row.mode as GameMode,
        conv: row.conv as ConversionType,
        goalType: row.goal_type as RoomConfig['goalType'],
        goalValue,
      },
      visibility: row.visibility as Visibility,
      maxPlayers: row.max_players,
      showLeaderboard: row.show_leaderboard === 1,
      status: row.status as RoomStatus,
      participants: new Map(),
      questions: [],
      syncRound: 0,
      syncReady: new Set(),
      startedAt: null,
      endedAt: null,
      lastActivityAt: now(),
    }
    roomStore.set(roomId, roomState)
    return { room: roomState }
  }

  return { room }
}

export function addParticipant(
  room: RoomState,
  userId: string | null,
  guestId: string | null,
  displayName: string,
  role: ParticipantRole,
  wsId: string
): { participantId: string; error?: string } {
  const playerCount = Array.from(room.participants.values()).filter(
    (p) => p.role === 'player' && !p.leftAt
  ).length
  if (role === 'player' && playerCount >= room.maxPlayers) {
    return { participantId: '', error: 'Room is full' }
  }

  const participantId = crypto.randomUUID()
  const participant: Participant = {
    id: participantId,
    userId,
    guestId,
    displayName,
    role,
    score: 0,
    currentQuestionIndex: 0,
    lives: 3,
    streak: 0,
    joinedAt: now(),
    leftAt: null,
    wsId,
  }
  room.participants.set(participantId, participant)
  room.lastActivityAt = now()
  return { participantId }
}

export function removeParticipant(room: RoomState, participantId: string): void {
  const p = room.participants.get(participantId)
  if (p) {
    p.leftAt = now()
    p.wsId = ''
  }
  room.lastActivityAt = now()
}

export function updateParticipantWsId(room: RoomState, participantId: string, wsId: string): void {
  const p = room.participants.get(participantId)
  if (p) p.wsId = wsId
}

export function getParticipantByWsId(room: RoomState, wsId: string): Participant | undefined {
  return Array.from(room.participants.values()).find((p) => p.wsId === wsId && !p.leftAt)
}

export function getParticipantById(room: RoomState, participantId: string): Participant | undefined {
  return room.participants.get(participantId)
}

export function startSync(room: RoomState): void {
  room.status = 'syncing'
  room.syncRound = 1
  room.syncReady.clear()
  room.lastActivityAt = now()
}

export function markSyncReady(room: RoomState, participantId: string): boolean {
  room.syncReady.add(participantId)
  const players = Array.from(room.participants.values()).filter(
    (p) => (p.role === 'player' || p.role === 'spectator') && !p.leftAt && p.wsId
  )
  return room.syncReady.size >= players.length
}

export function advanceSyncRound(room: RoomState): boolean {
  const players = Array.from(room.participants.values()).filter(
    (p) => (p.role === 'player' || p.role === 'spectator') && !p.leftAt && p.wsId
  )
  if (room.syncReady.size < players.length) return false

  room.syncRound++
  room.syncReady.clear()

  if (room.syncRound > SYNC_ROUNDS) {
    return true
  }
  return false
}

export function startGame(room: RoomState, db: DatabaseSync): void {
  const questionCount = 500
  room.questions = generateQuestionSequence(
    room.config.conv,
    room.config.mode,
    questionCount
  )
  room.status = 'playing'
  room.startedAt = now()
  room.lastActivityAt = now()

  db.prepare(`
    UPDATE multiplayer_rooms SET status = 'playing', started_at = ?
    WHERE id = ?
  `).run(room.startedAt, room.roomId)

  for (const [i, q] of room.questions.entries()) {
    db.prepare(`
      INSERT INTO multiplayer_room_questions (room_id, question_index, value, answer)
      VALUES (?, ?, ?, ?)
    `).run(room.roomId, i, q.value, q.answer)
  }
}

export function getNextQuestion(room: RoomState, participantId: string): Question | null {
  const p = room.participants.get(participantId)
  if (!p || p.role !== 'player') return null
  if (p.currentQuestionIndex >= room.questions.length) return null
  return room.questions[p.currentQuestionIndex]
}

export function validateAnswer(
  room: RoomState,
  participantId: string,
  answer: string
): { correct: boolean; nextQuestion: Question | null } {
  const p = room.participants.get(participantId)
  if (!p || p.role !== 'player') {
    return { correct: false, nextQuestion: null }
  }

  const q = room.questions[p.currentQuestionIndex]
  if (!q) return { correct: false, nextQuestion: null }

  const bits = room.config.mode === 'nibble-sprint' ? 4 : 8
  const normalized = normalizeAnswer(answer, room.config.conv, bits)
  const correct = normalized === q.answer.toLowerCase()

  if (correct) {
    p.score++
    p.streak++
    p.currentQuestionIndex++
    room.lastActivityAt = now()
  } else {
    p.streak = 0
    if (room.config.goalValue.lives !== undefined) {
      p.lives--
    }
  }

  const nextQuestion = p.currentQuestionIndex < room.questions.length
    ? room.questions[p.currentQuestionIndex]
    : null

  return { correct, nextQuestion }
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

export function checkGameEnd(room: RoomState): { ended: boolean; reason?: string } {
  if (room.status !== 'playing') return { ended: false }

  const players = Array.from(room.participants.values()).filter(
    (p) => p.role === 'player' && !p.leftAt
  )

  if (room.config.goalType === 'first_to' && room.config.goalValue.firstTo) {
    const winner = players.find((p) => p.score >= room.config.goalValue.firstTo!)
    if (winner) return { ended: true, reason: 'first_to' }
  }

  if (room.config.goalType === 'most_in_time' || room.config.goalType === 'timed') {
    const timeSeconds = room.config.goalValue.timeSeconds ?? 60
    const elapsed = room.startedAt
      ? (Date.now() - new Date(room.startedAt).getTime()) / 1000
      : 0
    if (elapsed >= timeSeconds) return { ended: true, reason: 'time_up' }
  }

  if (room.config.goalType === 'survival' && room.config.goalValue.lives !== undefined) {
    const alive = players.filter((p) => p.lives > 0)
    if (alive.length <= 1) return { ended: true, reason: 'survival' }
  }

  return { ended: false }
}

export function endGame(room: RoomState, db: DatabaseSync): void {
  room.status = 'ended'
  room.endedAt = now()
  room.lastActivityAt = now()

  db.prepare(`
    UPDATE multiplayer_rooms SET status = 'ended', ended_at = ?
    WHERE id = ?
  `).run(room.endedAt, room.roomId)
}

export function getLeaderboard(room: RoomState): Array<{ rank: number; displayName: string; score: number; isGuest: boolean }> {
  const players = Array.from(room.participants.values())
    .filter((p) => p.role === 'player' && !p.leftAt)
    .sort((a, b) => b.score - a.score)
  return players.map((p, i) => ({
    rank: i + 1,
    displayName: p.displayName,
    score: p.score,
    isGuest: !!p.guestId,
  }))
}

export function canChat(participantId: string, chatTimestamps: Map<string, number[]>): boolean {
  const now = Date.now()
  const timestamps = chatTimestamps.get(participantId) ?? []
  const recent = timestamps.filter((t) => now - t < 10000)
  if (recent.length >= CHAT_RATE_LIMIT_COUNT) return false
  recent.push(now)
  chatTimestamps.set(participantId, recent)
  return true
}

export function getConnectedPlayers(room: RoomState): number {
  return Array.from(room.participants.values()).filter(
    (p) => !p.leftAt && p.wsId
  ).length
}

export function runDeadRoomCleanup(db: DatabaseSync, store: RoomStore): void {
  const cutoff = new Date(Date.now() - DEAD_ROOM_MINUTES * 60 * 1000).toISOString()
  const rows = db.prepare(`
    SELECT id FROM multiplayer_rooms
    WHERE status IN ('lobby', 'playing', 'syncing')
    AND last_activity_at < ?
  `).all(cutoff) as Array<{ id: string }>

  for (const row of rows) {
    const room = store.get(row.id)
    const connected = room ? getConnectedPlayers(room) : 0
    if (connected === 0) {
      db.prepare(`
        UPDATE multiplayer_rooms SET status = 'ended', ended_at = datetime('now')
        WHERE id = ?
      `).run(row.id)
      store.delete(row.id)
    }
  }
}
