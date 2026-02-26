/**
 * Runs automatic sync (3 rounds) and starts the game. No user input required.
 * Called when host clicks Start - broadcasts to all WebSocket clients.
 */
import type { DatabaseSync } from 'node:sqlite'
import type { RoomState } from './roomManager.js'
import { roomStore, startGame, getNextQuestion, getLeaderboard } from './roomManager.js'
import { broadcastToRoom, sendToParticipant } from './connectionManager.js'

const SYNC_ROUND_DELAY_MS = 800

function buildRoomStatePayload(room: RoomState) {
  return {
    roomId: room.roomId,
    status: room.status,
    config: room.config,
    participants: Array.from(room.participants.values())
      .filter((p) => !p.leftAt)
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        role: p.role,
        score: p.score,
        isHost: p.userId === room.hostUserId || p.guestId === room.hostGuestId,
      })),
    showLeaderboard: room.showLeaderboard,
    syncRound: room.syncRound,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runAutomaticSync(roomId: string, db: DatabaseSync): Promise<void> {
  const room = roomStore.get(roomId)
  if (!room || room.status !== 'syncing') return

  const payload = buildRoomStatePayload(room)
  broadcastToRoom(roomId, { type: 'room_state', payload })

  for (let round = 1; round <= 3; round++) {
    await delay(SYNC_ROUND_DELAY_MS)
    const r = roomStore.get(roomId)
    if (!r || r.status !== 'syncing') return

    r.syncRound = round
    broadcastToRoom(roomId, { type: 'sync_round_complete', payload: { round, allReady: round === 3 } })
  }

  await delay(300)

  const r = roomStore.get(roomId)
  if (!r || r.status !== 'syncing') return

  startGame(r, db)

  for (const p of r.participants.values()) {
    if (p.role === 'player' && !p.leftAt && p.wsId) {
      const q = getNextQuestion(r, p.id)
      if (q) {
        sendToParticipant(roomId, p.id, { type: 'game_started', payload: {} })
        sendToParticipant(roomId, p.id, { type: 'question', payload: { value: q.value, index: 0 } })
      }
    }
  }

  if (r.showLeaderboard) {
    broadcastToRoom(roomId, { type: 'leaderboard', payload: getLeaderboard(r) })
  }
}
