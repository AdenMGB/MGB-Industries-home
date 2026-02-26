/**
 * Runs automatic sync (3 rounds) for tournament brackets and starts the game.
 */
import type { DatabaseSync } from 'node:sqlite'
import type { BracketState } from './tournamentManager.js'
import {
  bracketStore,
  SYNC_ROUNDS,
  getBracketNextQuestion,
  getBracketLeaderboard,
} from './tournamentManager.js'
import { broadcastToRoom, sendToParticipant } from './connectionManager.js'

const CONTROL_ROOM_PREFIX = 'TC'

const SYNC_ROUND_DELAY_MS = 800

function bracketRoomId(tournamentId: string, bracketIndex: number): string {
  return `T${tournamentId.toUpperCase()}B${bracketIndex}`
}

function buildBracketStatePayload(bracket: BracketState) {
  return {
    tournamentId: bracket.tournamentId,
    bracketIndex: bracket.bracketIndex,
    status: bracket.status,
    config: bracket.config,
    participants: Array.from(bracket.participants.values())
      .filter((p) => !p.leftAt)
      .map((p) => ({ id: p.id, displayName: p.displayName, score: p.score })),
    syncRound: bracket.syncRound,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runTournamentBracketSync(
  db: DatabaseSync,
  tournamentId: string,
  bracketIndex: number
): Promise<void> {
  const key = `${tournamentId.toUpperCase()}:${bracketIndex}`
  const bracket = bracketStore.get(key)
  if (!bracket || bracket.status !== 'syncing') return

  const roomId = bracketRoomId(tournamentId, bracketIndex)
  const payload = buildBracketStatePayload(bracket)
  broadcastToRoom(roomId, { type: 'room_state', payload })

  const controlRoomId = `${CONTROL_ROOM_PREFIX}${tournamentId.toUpperCase()}`
  broadcastToRoom(controlRoomId, { type: 'bracket_update', payload: { bracketIndex, status: 'syncing', syncRound: 1 } })

  for (let round = 1; round <= SYNC_ROUNDS; round++) {
    await delay(SYNC_ROUND_DELAY_MS)
    const b = bracketStore.get(key)
    if (!b || b.status !== 'syncing') return

    b.syncRound = round
    broadcastToRoom(roomId, { type: 'sync_round_complete', payload: { round, allReady: round === SYNC_ROUNDS } })
    broadcastToRoom(controlRoomId, { type: 'bracket_update', payload: { bracketIndex, status: 'syncing', syncRound: round } })
  }

  await delay(300)

  const b = bracketStore.get(key)
  if (!b || b.status !== 'syncing') return

  b.status = 'playing'
  b.startedAt = new Date().toISOString()

  db.prepare(`
    UPDATE tournament_brackets SET status = 'playing', started_at = ?
    WHERE tournament_id = ? AND bracket_index = ?
  `).run(b.startedAt, tournamentId.toUpperCase(), bracketIndex)

  for (const p of b.participants.values()) {
    if (!p.leftAt) {
      const q = getBracketNextQuestion(b, p.id)
      if (q) {
        sendToParticipant(roomId, p.id, { type: 'game_started', payload: {} })
        sendToParticipant(roomId, p.id, { type: 'question', payload: { value: q.value, index: p.currentQuestionIndex } })
      }
    }
  }

  broadcastToRoom(roomId, { type: 'leaderboard', payload: getBracketLeaderboard(b) })

  broadcastToRoom(controlRoomId, {
    type: 'bracket_update',
    payload: { bracketIndex, status: 'playing', syncRound: SYNC_ROUNDS },
  })
}
