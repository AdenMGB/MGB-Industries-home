import type { FastifyInstance } from 'fastify'
import {
  roomStore,
  getParticipantById,
  getNextQuestion,
  validateAnswer,
  checkGameEnd,
  endGame,
  getLeaderboard,
  canChat,
  getConnectedPlayers,
  removeParticipant,
} from './roomManager.js'
import { addConnection, removeConnection, broadcastToRoom, sendToParticipant } from './connectionManager.js'
import { getDatabase } from '../plugins/database.js'

const chatTimestamps = new Map<string, Map<string, number[]>>()

function getChatTimestamps(roomId: string): Map<string, number[]> {
  let m = chatTimestamps.get(roomId)
  if (!m) {
    m = new Map()
    chatTimestamps.set(roomId, m)
  }
  return m
}

export interface WsMessage {
  type: string
  payload?: unknown
}

function send(socket: { send(data: string): void }, msg: WsMessage): void {
  try {
    socket.send(JSON.stringify(msg))
  } catch {
    /* ignore */
  }
}

export function registerMultiplayerWebSocket(fastify: FastifyInstance): void {
  const db = getDatabase()

  fastify.get('/ws/multiplayer/:roomId', { websocket: true }, (socket, request) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    const params = request.params as { roomId?: string }
    const roomId = (params?.roomId ?? '').toUpperCase()
    const participantId = url.searchParams.get('participantId')

    if (!roomId || !participantId) {
      socket.close(4000, 'Missing roomId or participantId')
      return
    }

    const room = roomStore.get(roomId)
    if (!room) {
      socket.close(4001, 'Room not found')
      return
    }

    const participant = getParticipantById(room, participantId)
    if (!participant) {
      socket.close(4002, 'Invalid participant')
      return
    }

    participant.wsId = participantId
    addConnection(roomId, participantId, socket)

    const roomStatePayload = {
      roomId,
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

    send(socket, { type: 'room_state', payload: roomStatePayload })
    broadcastToRoom(roomId, { type: 'room_state', payload: roomStatePayload }, participantId)

    if (room.status === 'playing') {
      const next = getNextQuestion(room, participantId)
      if (next && participant.role === 'player') {
        send(socket, { type: 'question', payload: { value: next.value, index: participant.currentQuestionIndex } })
      }
      if (room.showLeaderboard) {
        send(socket, { type: 'leaderboard', payload: getLeaderboard(room) })
      }
    }

    socket.on('message', (raw: Buffer | string) => {
      const r = roomStore.get(roomId)
      if (!r) return
      try {
        const data = JSON.parse(raw.toString()) as WsMessage
        const { type, payload } = data

        switch (type) {
          case 'answer_submit': {
            if (r.status !== 'playing') return
            const { answer } = (payload as { answer: string }) || {}
            if (!answer || typeof answer !== 'string') return
            const part = getParticipantById(r, participantId)
            const { correct, nextQuestion } = validateAnswer(r, participantId, answer)
            sendToParticipant(roomId, participantId, { type: 'answer_result', payload: { correct } })
            if (correct) {
              if (r.showLeaderboard) {
                broadcastToRoom(roomId, { type: 'leaderboard', payload: getLeaderboard(r) })
              }
              if (nextQuestion && part) {
                sendToParticipant(roomId, participantId, {
                  type: 'question',
                  payload: {
                    value: nextQuestion.value,
                    index: part.currentQuestionIndex,
                  },
                })
              }
            }
            const end = checkGameEnd(r)
            if (end.ended) {
              endGame(r, db)
              broadcastToRoom(roomId, { type: 'game_ended', payload: { leaderboard: getLeaderboard(r), reason: end.reason } })
            }
            break
          }

          case 'chat': {
            const { message } = (payload as { message: string }) || {}
            if (!message || typeof message !== 'string' || message.length > 500) return
            const timestamps = getChatTimestamps(roomId)
            if (!canChat(participantId, timestamps)) return
            const part = getParticipantById(r, participantId)
            const msg = {
              type: 'chat_message',
              payload: {
                participantId,
                displayName: part?.displayName ?? 'Unknown',
                message: message.slice(0, 500),
                timestamp: new Date().toISOString(),
              },
            }
            broadcastToRoom(roomId, msg)
            break
          }

          case 'end_game_request': {
            const part = getParticipantById(r, participantId)
            const isHost = part && (part.userId === r.hostUserId || part.guestId === r.hostGuestId)
            if (!isHost) return
            endGame(r, db)
            broadcastToRoom(roomId, { type: 'game_ended', payload: { leaderboard: getLeaderboard(r), reason: 'host_ended' } })
            break
          }

          default:
            break
        }
      } catch {
        /* ignore parse errors */
      }
    })

    socket.on('close', () => {
      removeConnection(roomId, participantId)
      const r = roomStore.get(roomId)
      if (r) {
        removeParticipant(r, participantId)
        const p = getParticipantById(r, participantId)
        if (p) p.wsId = ''
        const connected = getConnectedPlayers(r)
        if (connected === 0) {
          r.lastActivityAt = new Date().toISOString()
        }
      }
    })
  })
}
