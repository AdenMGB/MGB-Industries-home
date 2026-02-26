import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDatabase } from '../plugins/database.js'
import { optionalAuthenticate } from '../plugins/auth.js'
import {
  roomStore,
  createRoom,
  getRoomForJoin,
  addParticipant,
  startSync,
  runDeadRoomCleanup,
} from '../websocket/roomManager.js'
import { broadcastToRoom } from '../websocket/connectionManager.js'
import { runAutomaticSync } from '../websocket/syncRunner.js'

const VALID_MODES = ['classic', 'speed-round', 'survival', 'streak-challenge', 'nibble-sprint'] as const
const VALID_CONV = ['binary-standalone', 'binary-octet', 'hex-standalone', 'hex-octet', 'ipv4-full', 'ipv6-hextet'] as const
const VALID_VISIBILITY = ['public', 'private', 'public_password'] as const
const VALID_GOAL_TYPES = ['first_to', 'most_in_time', 'survival', 'streak', 'timed'] as const

const createRoomSchema = z.object({
  mode: z.enum(VALID_MODES),
  conv: z.enum(VALID_CONV).default('binary-standalone'),
  goalType: z.enum(VALID_GOAL_TYPES),
  goalValue: z.object({
    firstTo: z.number().int().min(1).max(100).optional(),
    timeSeconds: z.number().int().min(10).max(600).optional(),
    lives: z.number().int().min(1).max(10).optional(),
    streak: z.boolean().optional(),
    showPowerTable: z.boolean().optional(),
  }),
  visibility: z.enum(VALID_VISIBILITY).default('private'),
  password: z.string().max(100).optional(),
  maxPlayers: z.number().int().min(2).max(32).default(32),
  showLeaderboard: z.boolean().default(true),
  showPowerTable: z.boolean().default(true),
  displayName: z.string().min(1).max(50),
})

const joinRoomSchema = z.object({
  roomCode: z.string().length(6),
  password: z.string().optional(),
  displayName: z.string().min(1).max(50),
  asSpectator: z.boolean().default(false),
})

export async function multiplayerConversionRoutes(fastify: FastifyInstance) {
  const db = getDatabase()

  // Dead room cleanup - run every minute
  setInterval(() => {
    runDeadRoomCleanup(db, roomStore)
  }, 60 * 1000)

  // Create room (auth optional - can create as guest)
  fastify.post('/api/conversion-trainer/multiplayer/create', {
    preHandler: [optionalAuthenticate],
  }, async (request, reply) => {
    try {
      const body = createRoomSchema.parse(request.body)
      const user = (request as { user?: { userId: string } }).user
      const hostUserId = user?.userId ?? null
      const hostGuestId = user ? null : crypto.randomUUID()
      const hostDisplayName = body.displayName

      const goalValue: Record<string, unknown> = {}
      if (body.goalValue.firstTo) goalValue.firstTo = body.goalValue.firstTo
      if (body.goalValue.timeSeconds) goalValue.timeSeconds = body.goalValue.timeSeconds
      if (body.goalValue.lives) goalValue.lives = body.goalValue.lives
      if (body.goalValue.streak !== undefined) goalValue.streak = body.goalValue.streak
      goalValue.showPowerTable = body.goalValue.showPowerTable ?? body.showPowerTable ?? true

      const { roomId, room } = createRoom(
        db,
        hostUserId,
        hostGuestId,
        hostDisplayName,
        {
          mode: body.mode,
          conv: body.conv,
          goalType: body.goalType,
          goalValue,
        },
        body.visibility,
        body.password ?? null,
        body.maxPlayers,
        body.showLeaderboard
      )

      const hostParticipant = Array.from(room.participants.values()).find(
        (p) => !p.leftAt && (p.userId === hostUserId || p.guestId === hostGuestId)
      )

      return reply.send({
        roomId,
        roomCode: roomId,
        participantId: hostParticipant?.id,
        config: room.config,
        visibility: room.visibility,
        maxPlayers: room.maxPlayers,
        showLeaderboard: room.showLeaderboard,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get room info (for pre-join validation)
  fastify.get('/api/conversion-trainer/multiplayer/room/:code', async (request, reply) => {
    try {
      const { code } = request.params as { code: string }
      const row = db.prepare(`
        SELECT id, mode, conv, goal_type, goal_value, visibility, max_players, show_leaderboard, status
        FROM multiplayer_rooms WHERE id = ?
      `).get(code.toUpperCase()) as {
        id: string
        mode: string
        conv: string
        goal_type: string
        goal_value: string
        visibility: string
        max_players: number
        show_leaderboard: number
        status: string
      } | undefined

      if (!row) {
        return reply.code(404).send({ error: 'Room not found' })
      }

      return reply.send({
        roomId: row.id,
        mode: row.mode,
        conv: row.conv,
        goalType: row.goal_type,
        goalValue: JSON.parse(row.goal_value),
        visibility: row.visibility,
        hasPassword: row.visibility === 'public_password',
        maxPlayers: row.max_players,
        showLeaderboard: row.show_leaderboard === 1,
        status: row.status,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Join room
  fastify.post('/api/conversion-trainer/multiplayer/join', {
    preHandler: [optionalAuthenticate],
  }, async (request, reply) => {
    try {
      const body = joinRoomSchema.parse(request.body)
      const user = (request as { user?: { userId: string } }).user
      const userId = user?.userId ?? null
      const guestId = user ? null : crypto.randomUUID()

      const result = getRoomForJoin(db, body.roomCode.toUpperCase(), body.password)
      if (!result) {
        return reply.code(404).send({ error: 'Room not found' })
      }
      if (result.error) {
        return reply.code(400).send({ error: result.error })
      }

      const room = result.room
      const role = body.asSpectator ? 'spectator' : 'player'
      const { participantId, error } = addParticipant(
        room,
        userId,
        guestId,
        body.displayName,
        role,
        ''
      )

      if (error) {
        return reply.code(400).send({ error })
      }

      return reply.send({
        roomId: room.roomId,
        participantId,
        config: room.config,
        status: room.status,
        participants: Array.from(room.participants.values())
          .filter((p) => !p.leftAt)
          .map((p) => ({
            id: p.id,
            displayName: p.displayName,
            role: p.role,
            score: p.score,
          })),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // List public lobbies
  fastify.get('/api/conversion-trainer/multiplayer/lobbies', async (request, reply) => {
    try {
      const rows = db.prepare(`
        SELECT id, mode, conv, goal_type, goal_value, visibility, max_players, show_leaderboard, created_at,
          (SELECT COUNT(*) FROM multiplayer_room_participants WHERE room_id = multiplayer_rooms.id AND left_at IS NULL) as player_count
        FROM multiplayer_rooms
        WHERE status = 'lobby' AND visibility IN ('public', 'public_password')
        ORDER BY created_at DESC
        LIMIT 50
      `).all() as Array<{
        id: string
        mode: string
        conv: string
        goal_type: string
        goal_value: string
        visibility: string
        max_players: number
        show_leaderboard: number
        created_at: string
        player_count: number
      }>

      const lobbies = rows.map((r) => ({
        roomId: r.id,
        mode: r.mode,
        conv: r.conv,
        goalType: r.goal_type,
        goalValue: JSON.parse(r.goal_value),
        visibility: r.visibility,
        hasPassword: r.visibility === 'public_password',
        maxPlayers: r.max_players,
        playerCount: r.player_count,
        createdAt: r.created_at,
      }))

      return reply.send({ lobbies })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Start game (host only) - triggers sync phase
  fastify.post('/api/conversion-trainer/multiplayer/start', async (request, reply) => {
    try {
      const { roomCode, participantId } = (request.body as { roomCode: string; participantId: string }) || {}
      if (!roomCode || !participantId) {
        return reply.code(400).send({ error: 'Missing roomCode or participantId' })
      }

      const room = roomStore.get(roomCode.toUpperCase())
      if (!room) {
        return reply.code(404).send({ error: 'Room not found' })
      }

      const participant = room.participants.get(participantId)
      if (!participant) {
        return reply.code(403).send({ error: 'Not a participant' })
      }
      const isHost = participant.userId === room.hostUserId || participant.guestId === room.hostGuestId
      if (!isHost) {
        return reply.code(403).send({ error: 'Only host can start the game' })
      }

      startSync(room)
      db.prepare(`UPDATE multiplayer_rooms SET status = 'syncing' WHERE id = ?`).run(room.roomId)

      const roomStatePayload = {
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
      broadcastToRoom(room.roomId, { type: 'room_state', payload: roomStatePayload })

      runAutomaticSync(room.roomId, db).catch((err) => fastify.log.error(err, 'Sync runner failed'))

      return reply.send({ status: 'syncing', syncRound: 1 })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
