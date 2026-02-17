import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../plugins/auth.js'
import { getDatabase } from '../plugins/database.js'

const submitScoreSchema = z.object({
  mode: z.string().min(1),
  score: z.number().int().min(0),
  metadata: z.record(z.any()).optional(),
})

const updateProgressSchema = z.object({
  xpEarned: z.number().int().min(0).optional(),
  bestStreak: z.number().int().min(0).optional(),
  bestSpeedRound: z.number().int().min(0).optional(),
  bestSurvival: z.number().int().min(0).optional(),
  bestNibbleSprint: z.number().int().min(0).optional(),
})

const unlockAchievementSchema = z.object({
  achievementId: z.string().min(1),
})

const XP_PER_LEVEL = 100

function xpToLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1
}

export async function conversionTrainerRoutes(fastify: FastifyInstance) {
  const db = getDatabase()

  // Submit score (authenticated)
  fastify.post('/api/conversion-trainer/scores', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const body = submitScoreSchema.parse(request.body)
      const { user } = request as { user: { userId: string } }

      db.prepare(`
        INSERT INTO conversion_trainer_scores (user_id, mode, score, metadata)
        VALUES (?, ?, ?, ?)
      `).run(user.userId, body.mode, body.score, body.metadata ? JSON.stringify(body.metadata) : null)

      return reply.send({ message: 'Score submitted' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get leaderboard (public)
  fastify.get('/api/conversion-trainer/leaderboard', async (request, reply) => {
    try {
      const { mode, limit } = request.query as { mode?: string; limit?: string }
      const modeVal = mode || 'speed-round'
      const limitVal = Math.min(parseInt(limit || '20', 10) || 20, 100)

      const rows = db
        .prepare(`
          SELECT s.id, s.user_id, s.mode, s.score, s.metadata, s.created_at, u.name as user_name
          FROM conversion_trainer_scores s
          JOIN users u ON u.id = s.user_id
          WHERE s.mode = ?
          ORDER BY s.score DESC
          LIMIT ?
        `)
        .all(modeVal, limitVal) as Array<{
        id: number
        user_id: string
        mode: string
        score: number
        metadata: string | null
        created_at: string
        user_name: string
      }>

      const leaderboard = rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        mode: r.mode,
        score: r.score,
        metadata: r.metadata ? JSON.parse(r.metadata) : null,
        createdAt: r.created_at,
        userName: r.user_name,
      }))

      return reply.send({ leaderboard })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get my scores (authenticated)
  fastify.get('/api/conversion-trainer/my-scores', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { user } = request as { user: { userId: string } }

      const rows = db
        .prepare(`
          SELECT mode, MAX(score) as best_score
          FROM conversion_trainer_scores
          WHERE user_id = ?
          GROUP BY mode
        `)
        .all(user.userId) as Array<{ mode: string; best_score: number }>

      const scores: Record<string, number> = {}
      for (const r of rows) {
        scores[r.mode] = r.best_score
      }

      return reply.send({ scores })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get progress (authenticated)
  fastify.get('/api/conversion-trainer/progress', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { user } = request as { user: { userId: string } }

      const row = db
        .prepare('SELECT * FROM conversion_trainer_progress WHERE user_id = ?')
        .get(user.userId) as {
        user_id: string
        total_xp: number
        level: number
        best_streak: number
        best_speed_round: number
        best_survival: number
        best_nibble_sprint: number
        updated_at: string
      } | undefined

      if (!row) {
        return reply.send({
          totalXp: 0,
          level: 1,
          bestStreak: 0,
          bestSpeedRound: 0,
          bestSurvival: 0,
          bestNibbleSprint: 0,
        })
      }

      return reply.send({
        totalXp: row.total_xp,
        level: xpToLevel(row.total_xp),
        bestStreak: row.best_streak,
        bestSpeedRound: row.best_speed_round,
        bestSurvival: row.best_survival,
        bestNibbleSprint: row.best_nibble_sprint,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Update progress (authenticated)
  fastify.post('/api/conversion-trainer/progress', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const body = updateProgressSchema.parse(request.body)
      const { user } = request as { user: { userId: string } }

      const existing = db
        .prepare('SELECT * FROM conversion_trainer_progress WHERE user_id = ?')
        .get(user.userId) as {
        total_xp: number
        best_streak: number
        best_speed_round: number
        best_survival: number
        best_nibble_sprint: number
      } | undefined

      const totalXp = (existing?.total_xp ?? 0) + (body.xpEarned ?? 0)
      const bestStreak = Math.max(existing?.best_streak ?? 0, body.bestStreak ?? 0)
      const bestSpeedRound = Math.max(existing?.best_speed_round ?? 0, body.bestSpeedRound ?? 0)
      const bestSurvival = Math.max(existing?.best_survival ?? 0, body.bestSurvival ?? 0)
      const bestNibbleSprint = Math.max(existing?.best_nibble_sprint ?? 0, body.bestNibbleSprint ?? 0)

      const level = xpToLevel(totalXp)
      db.prepare(`
        INSERT INTO conversion_trainer_progress (user_id, total_xp, level, best_streak, best_speed_round, best_survival, best_nibble_sprint, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          total_xp = excluded.total_xp,
          level = excluded.level,
          best_streak = excluded.best_streak,
          best_speed_round = excluded.best_speed_round,
          best_survival = excluded.best_survival,
          best_nibble_sprint = excluded.best_nibble_sprint,
          updated_at = datetime('now')
      `).run(user.userId, totalXp, level, bestStreak, bestSpeedRound, bestSurvival, bestNibbleSprint)

      return reply.send({
        totalXp,
        level: xpToLevel(totalXp),
        bestStreak,
        bestSpeedRound,
        bestSurvival,
        bestNibbleSprint,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get achievements (authenticated)
  fastify.get('/api/conversion-trainer/achievements', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { user } = request as { user: { userId: string } }

      const rows = db
        .prepare('SELECT achievement_id, unlocked_at FROM conversion_trainer_achievements WHERE user_id = ?')
        .all(user.userId) as Array<{ achievement_id: string; unlocked_at: string }>

      return reply.send({
        achievements: rows.map((r) => ({ id: r.achievement_id, unlockedAt: r.unlocked_at })),
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Unlock achievement (authenticated)
  fastify.post('/api/conversion-trainer/achievements/unlock', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const body = unlockAchievementSchema.parse(request.body)
      const { user } = request as { user: { userId: string } }

      db.prepare(`
        INSERT OR IGNORE INTO conversion_trainer_achievements (user_id, achievement_id)
        VALUES (?, ?)
      `).run(user.userId, body.achievementId)

      return reply.send({ message: 'Achievement unlocked' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
