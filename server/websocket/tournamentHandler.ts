import type { FastifyInstance } from 'fastify'
import { getDatabase } from '../plugins/database.js'
import { verifyJWT } from '../utils/jwt.js'
import {
  getParticipant,
  getTournament,
  getBracketState,
  getBracketStateByParticipant,
  getBracketParticipants,
  getBracketNextQuestion,
  validateBracketAnswer,
  checkBracketGameEnd,
  getBracketLeaderboard,
  removeBracketParticipant,
  bracketStore,
} from './tournamentManager.js'
import { addConnection, removeConnection, broadcastToRoom, sendToParticipant } from './connectionManager.js'
import { runTournamentBracketSync } from './tournamentSyncRunner.js'

function bracketRoomId(tournamentId: string, bracketIndex: number): string {
  return `T${tournamentId.toUpperCase()}B${bracketIndex}`
}

function send(socket: { send(data: string): void }, msg: object): void {
  try {
    socket.send(JSON.stringify(msg))
  } catch {
    /* ignore */
  }
}

const CONTROL_ROOM_PREFIX = 'TC'

export function registerTournamentWebSocket(fastify: FastifyInstance): void {
  const db = getDatabase()

  fastify.get('/ws/tournament/:tournamentId/control', { websocket: true }, async (socket, request) => {
    const params = request.params as { tournamentId?: string }
    const tournamentId = (params?.tournamentId ?? '').toUpperCase()
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    const token = url.searchParams.get('token')

    if (!tournamentId || !token) {
      socket.close(4000, 'Missing tournamentId or token')
      return
    }

    try {
      const payload = await verifyJWT(token)
      const row = db.prepare('SELECT created_by_admin_id FROM tournaments WHERE id = ?').get(tournamentId) as { created_by_admin_id: string } | undefined
      if (!row || row.created_by_admin_id !== payload.userId || payload.role !== 'admin') {
        socket.close(4003, 'Not the tournament creator')
        return
      }

      const controlRoomId = `${CONTROL_ROOM_PREFIX}${tournamentId}`
      const controlId = `control_${payload.userId}`
      addConnection(controlRoomId, controlId, socket)

      // Send initial state so control panel gets current brackets without refresh
      send(socket, { type: 'bracket_update', payload: { initial: true } })

      socket.on('close', () => {
        removeConnection(controlRoomId, controlId)
      })
    } catch {
      socket.close(4001, 'Invalid token')
    }
  })

  fastify.get('/ws/tournament/:tournamentId', { websocket: true }, (socket, request) => {
    const params = request.params as { tournamentId?: string }
    const tournamentId = (params?.tournamentId ?? '').toUpperCase()
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    const participantId = url.searchParams.get('participantId')

    if (!tournamentId || !participantId) {
      socket.close(4000, 'Missing tournamentId or participantId')
      return
    }

    const participant = getParticipant(db, tournamentId, participantId)
    if (!participant) {
      socket.close(4002, 'Invalid participant')
      return
    }

    const roomId = bracketRoomId(tournamentId, participant.bracketIndex)
    let bracket = getBracketState(tournamentId, participant.bracketIndex)

    if (bracket) {
      const p = bracket.participants.get(participantId)
      if (p) {
        p.wsId = participantId
      }
    }

    addConnection(roomId, participantId, socket)

    const t = getTournament(db, tournamentId)
    const participantsList = bracket
      ? Array.from(bracket.participants.values())
          .filter((p) => !p.leftAt)
          .map((p) => ({ id: p.id, displayName: p.displayName, score: p.score }))
      : getBracketParticipants(db, tournamentId, participant.bracketIndex).map((p) => ({
          id: p.participantUuid,
          displayName: p.displayName,
          score: p.score,
        }))

    const roomStatePayload = {
      tournamentId,
      bracketIndex: participant.bracketIndex,
      status: bracket?.status ?? 'lobby',
      config: bracket?.config ?? t?.config ?? null,
      participants: participantsList,
      syncRound: bracket?.syncRound ?? 0,
    }

    send(socket, { type: 'room_state', payload: roomStatePayload })
    broadcastToRoom(roomId, { type: 'room_state', payload: roomStatePayload }, participantId)

    if (bracket?.status === 'playing') {
      const next = getBracketNextQuestion(bracket, participantId)
      if (next) {
        const p = bracket.participants.get(participantId)
        send(socket, {
          type: 'question',
          payload: { value: next.value, index: p?.currentQuestionIndex ?? 0 },
        })
      }
      send(socket, { type: 'leaderboard', payload: getBracketLeaderboard(bracket) })
    }

    socket.on('message', (raw: Buffer | string) => {
      bracket = getBracketStateByParticipant(db, tournamentId, participantId)
      if (!bracket) return

      try {
        const data = JSON.parse(raw.toString()) as { type: string; payload?: unknown }
        const { type, payload } = data

        if (type === 'answer_submit') {
          if (bracket.status !== 'playing') return
          const { answer } = (payload as { answer?: string }) || {}
          if (!answer || typeof answer !== 'string') return

          const { correct, nextQuestion } = validateBracketAnswer(bracket, participantId, answer)
          const p = bracket.participants.get(participantId)
          sendToParticipant(roomId, participantId, { type: 'answer_result', payload: { correct } })

          if (correct) {
            broadcastToRoom(roomId, { type: 'leaderboard', payload: getBracketLeaderboard(bracket) })
            if (nextQuestion && p) {
              sendToParticipant(roomId, participantId, {
                type: 'question',
                payload: { value: nextQuestion.value, index: p.currentQuestionIndex },
              })
            }
          }

          const end = checkBracketGameEnd(bracket)
          if (end.ended) {
            bracket.status = 'ended'
            bracket.endedAt = new Date().toISOString()
            db.prepare(`
              UPDATE tournament_brackets SET status = 'ended', ended_at = ?
              WHERE tournament_id = ? AND bracket_index = ?
            `).run(bracket.endedAt, tournamentId, bracket.bracketIndex)

            const allBrackets = Array.from(bracketStore.keys())
              .filter((k) => k.startsWith(`${tournamentId}:`))
            const allEnded = allBrackets.every((k) => {
              const b = bracketStore.get(k)
              return b?.status === 'ended'
            })
            if (allEnded) {
              db.prepare(`
                UPDATE tournaments SET status = 'ended', ended_at = ?
                WHERE id = ?
              `).run(bracket.endedAt, tournamentId)
            }

            broadcastToRoom(roomId, {
              type: 'game_ended',
              payload: { leaderboard: getBracketLeaderboard(bracket), reason: end.reason },
            })
          }
        }
      } catch {
        /* ignore */
      }
    })

    socket.on('close', () => {
      removeConnection(roomId, participantId)
      bracket = getBracketStateByParticipant(db, tournamentId, participantId)
      if (bracket) {
        removeBracketParticipant(bracket, participantId)
      }
    })
  })
}
