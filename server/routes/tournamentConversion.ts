import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDatabase } from '../plugins/database.js'
import { requireAdmin, optionalAuthenticate } from '../plugins/auth.js'
import {
  createTournament,
  getTournament,
  joinTournament,
  getTournamentBrackets,
  getBracketParticipants,
  startTournament,
} from '../websocket/tournamentManager.js'
import { runTournamentBracketSync } from '../websocket/tournamentSyncRunner.js'

const VALID_MODES = ['classic', 'speed-round', 'survival', 'streak-challenge', 'nibble-sprint'] as const
const VALID_CONV = ['binary-standalone', 'binary-octet', 'hex-standalone', 'hex-octet', 'ipv4-full', 'ipv6-hextet'] as const
const VALID_GOAL_TYPES = ['first_to', 'most_in_time', 'survival', 'streak', 'timed'] as const

const createTournamentSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.enum(VALID_MODES),
  conv: z.enum(VALID_CONV).default('binary-standalone'),
  goalType: z.enum(VALID_GOAL_TYPES),
  goalValue: z.object({
    firstTo: z.number().int().min(1).max(100).optional(),
    timeSeconds: z.number().int().min(10).max(600).optional(),
    lives: z.number().int().min(1).max(10).optional(),
    streak: z.boolean().optional(),
  }),
  bracketSize: z.number().int().min(2).max(256),
  maxPlayers: z.number().int().min(2).max(10000),
})

const joinTournamentSchema = z.object({
  tournamentId: z.string().min(6).max(12),
  displayName: z.string().min(1).max(50),
})

export async function tournamentConversionRoutes(fastify: FastifyInstance) {
  const db = getDatabase()

  // Create tournament (admin only)
  fastify.post('/api/conversion-trainer/tournament/create', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const body = createTournamentSchema.parse(request.body)
      const user = (request as { user?: { userId: string } }).user
      if (!user?.userId) return reply.code(401).send({ error: 'Unauthorized' })

      const goalValue: Record<string, unknown> = {}
      if (body.goalValue.firstTo) goalValue.firstTo = body.goalValue.firstTo
      if (body.goalValue.timeSeconds) goalValue.timeSeconds = body.goalValue.timeSeconds
      if (body.goalValue.lives) goalValue.lives = body.goalValue.lives
      if (body.goalValue.streak !== undefined) goalValue.streak = body.goalValue.streak

      const { tournamentId, joinLink } = createTournament(
        db,
        user.userId,
        body.name,
        {
          mode: body.mode,
          conv: body.conv,
          goalType: body.goalType,
          goalValue,
        },
        body.bracketSize,
        body.maxPlayers
      )

      return reply.send({
        tournamentId,
        joinLink,
        message: 'Tournament created. Share the link to invite players.',
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: err.errors[0]?.message ?? 'Invalid input' })
      }
      throw err
    }
  })

  // Get tournament info (for join page - no auth required)
  fastify.get('/api/conversion-trainer/tournament/:tournamentId', {
    preHandler: [optionalAuthenticate],
  }, async (request, reply) => {
    const params = request.params as { tournamentId: string }
    const t = getTournament(db, params.tournamentId)
    if (!t) return reply.code(404).send({ error: 'Tournament not found' })
    const user = (request as { user?: { userId: string; role: string } }).user
    const row = db.prepare('SELECT created_by_admin_id FROM tournaments WHERE id = ?').get(params.tournamentId.toUpperCase()) as { created_by_admin_id: string } | undefined
    const canStart = !!user?.userId && user.role === 'admin' && row?.created_by_admin_id === user.userId && t.status === 'lobby'
    return reply.send({
      id: t.id,
      name: t.name,
      config: t.config,
      bracketSize: t.bracketSize,
      maxPlayers: t.maxPlayers,
      status: t.status,
      participantCount: t.participantCount,
      canStart,
    })
  })

  // Join tournament (anyone with link)
  fastify.post('/api/conversion-trainer/tournament/join', {
    preHandler: [optionalAuthenticate],
  }, async (request, reply) => {
    try {
      const body = joinTournamentSchema.parse(request.body)
      const user = (request as { user?: { userId: string } }).user
      const userId = user?.userId ?? null
      const guestId = user ? null : crypto.randomUUID()
      const displayName = body.displayName.trim() || (userId ? 'Player' : 'Guest')

      const result = joinTournament(db, body.tournamentId, userId, guestId, displayName)
      if (!result) return reply.code(400).send({ error: 'Could not join tournament' })
      if (result.error) return reply.code(400).send({ error: result.error })

      return reply.send({
        tournamentId: body.tournamentId,
        participantId: result.participantId,
        bracketIndex: result.bracketIndex,
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: err.errors[0]?.message ?? 'Invalid input' })
      }
      throw err
    }
  })

  // Get tournament brackets (creator only - for control panel)
  fastify.get('/api/conversion-trainer/tournament/:tournamentId/brackets', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const params = request.params as { tournamentId: string }
    const user = (request as { user?: { userId: string } }).user
    if (!user?.userId) return reply.code(401).send({ error: 'Unauthorized' })
    const row = db.prepare('SELECT created_by_admin_id FROM tournaments WHERE id = ?').get(params.tournamentId.toUpperCase()) as { created_by_admin_id: string } | undefined
    if (!row || row.created_by_admin_id !== user.userId) return reply.code(403).send({ error: 'Not the tournament creator' })
    const brackets = getTournamentBrackets(db, params.tournamentId)
    return reply.send({ brackets })
  })

  // Start tournament (admin who created it only)
  fastify.post('/api/conversion-trainer/tournament/:tournamentId/start', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const params = request.params as { tournamentId: string }
    const user = (request as { user?: { userId: string } }).user
    if (!user?.userId) return reply.code(401).send({ error: 'Unauthorized' })

    const result = startTournament(db, params.tournamentId, user.userId)
    if (!result.ok) return reply.code(400).send({ error: result.error ?? 'Failed to start' })

    const t = getTournament(db, params.tournamentId)
    if (t?.status === 'syncing') {
      const brackets = db.prepare(`
        SELECT bracket_index FROM tournament_brackets
        WHERE tournament_id = ? AND status = 'syncing'
      `).all(params.tournamentId.toUpperCase()) as Array<{ bracket_index: number }>
      for (const b of brackets) {
        runTournamentBracketSync(db, params.tournamentId, b.bracket_index).catch(() => {})
      }
    }

    return reply.send({ message: 'Tournament started' })
  })

  // Get bracket participants (for lobby)
  fastify.get('/api/conversion-trainer/tournament/:tournamentId/bracket/:bracketIndex/participants', async (request, reply) => {
    const params = request.params as { tournamentId: string; bracketIndex: string }
    const bracketIndex = parseInt(params.bracketIndex, 10)
    if (isNaN(bracketIndex) || bracketIndex < 0) {
      return reply.code(400).send({ error: 'Invalid bracket index' })
    }
    const participants = getBracketParticipants(db, params.tournamentId, bracketIndex)
    return reply.send({ participants })
  })
}
