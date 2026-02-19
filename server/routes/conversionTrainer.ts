import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { authenticate, requireAdmin } from '../plugins/auth.js'
import { getDatabase } from '../plugins/database.js'

const VALID_MODES = ['speed-round', 'survival', 'streak-challenge', 'nibble-sprint'] as const
const VALID_CONV = ['binary-standalone', 'binary-octet', 'hex-standalone', 'hex-octet', 'ipv4-full', 'ipv6-hextet'] as const

// Reasonable max scores (anti-cheat caps) - survival and streak-challenge have no caps
const SCORE_CAPS: Record<string, number> = {
  'speed-round': 200,   // ~3.3/sec for 60s
  'nibble-sprint': 150, // ~5/sec for 30s
}

const startSessionSchema = z.object({
  mode: z.enum(VALID_MODES),
  conv: z.enum(VALID_CONV).optional(),
})

const submitScoreSchema = z.object({
  sessionId: z.string().uuid(),
  mode: z.enum(VALID_MODES),
  score: z.number().int().min(0),
  conv: z.enum(VALID_CONV).optional(),
  metadata: z.object({
    correct: z.number().int().min(0).optional(),
    total: z.number().int().min(0).optional(),
    timeSeconds: z.number().int().min(0).max(120).optional(),
    streak: z.number().int().min(0).optional(),
  }).optional(),
})

const updateProgressSchema = z.object({
  xpEarned: z.number().int().min(0).optional(),
  bestStreak: z.number().int().min(0).optional(),
  bestClassicStreak: z.number().int().min(0).optional(),
  bestSpeedRound: z.number().int().min(0).optional(),
  bestSurvival: z.number().int().min(0).optional(),
  bestNibbleSprint: z.number().int().min(0).optional(),
  recordPlayed: z.boolean().optional(),
})

const unlockAchievementSchema = z.object({
  achievementId: z.string().min(1),
})

const XP_PER_LEVEL = 100

function xpToLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1
}

function validateScoreSubmission(
  mode: string,
  score: number,
  metadata: { correct?: number; total?: number; timeSeconds?: number; streak?: number } | undefined
): string | null {
  const cap = SCORE_CAPS[mode]
  if (cap != null && score > cap) {
    return `Score exceeds maximum allowed for ${mode} (${cap})`
  }
  if (metadata) {
    if (mode === 'speed-round' && metadata.timeSeconds != null) {
      if (metadata.timeSeconds < 55 || metadata.timeSeconds > 65) return 'Invalid time for speed-round'
      if (metadata.correct != null && metadata.correct !== score) return 'Score must match correct count'
    }
    if (mode === 'nibble-sprint' && metadata.timeSeconds != null) {
      if (metadata.timeSeconds < 25 || metadata.timeSeconds > 35) return 'Invalid time for nibble-sprint'
      if (metadata.correct != null && metadata.correct !== score) return 'Score must match correct count'
    }
    if (mode === 'streak-challenge' && metadata.streak != null && metadata.streak !== score) {
      return 'Score must match streak'
    }
    if (mode === 'survival' && metadata.correct != null && metadata.correct !== score) {
      return 'Score must match correct count'
    }
  }
  return null
}

export async function conversionTrainerRoutes(fastify: FastifyInstance) {
  const db = getDatabase()

  // Start game session (authenticated) - returns sessionId for score submission
  fastify.post('/api/conversion-trainer/start-session', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const body = startSessionSchema.parse(request.body)
      const { user } = request as { user: { userId: string } }

      const convVal = body.conv || 'binary-standalone'
      const sessionId = randomUUID()
      const now = new Date()
      const expiresMinutes = body.mode === 'streak-challenge' ? 120 : 5
      const expiresAt = new Date(now.getTime() + expiresMinutes * 60 * 1000).toISOString()

      db.prepare(`
        INSERT INTO conversion_trainer_sessions (id, user_id, mode, conv, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(sessionId, user.userId, body.mode, convVal, expiresAt)

      return reply.send({ sessionId, expiresAt })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Submit score (authenticated) - requires valid session, validates metadata
  fastify.post('/api/conversion-trainer/scores', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const body = submitScoreSchema.parse(request.body)
      const { user } = request as { user: { userId: string } }

      const session = db
        .prepare(
          `SELECT id, user_id, mode, conv, expires_at, used_at FROM conversion_trainer_sessions WHERE id = ?`
        )
        .get(body.sessionId) as {
        id: string
        user_id: string
        mode: string
        conv: string
        expires_at: string
        used_at: string | null
      } | undefined

      if (!session) {
        return reply.code(400).send({ error: 'Invalid or expired session' })
      }
      if (session.user_id !== user.userId) {
        return reply.code(403).send({ error: 'Session does not belong to user' })
      }
      if (session.used_at) {
        return reply.code(400).send({ error: 'Session already used' })
      }
      if (new Date(session.expires_at) < new Date()) {
        return reply.code(400).send({ error: 'Session expired' })
      }
      if (session.mode !== body.mode) {
        return reply.code(400).send({ error: 'Mode mismatch' })
      }

      const convVal = body.conv || session.conv || 'binary-standalone'
      const validationError = validateScoreSubmission(body.mode, body.score, body.metadata)
      if (validationError) {
        return reply.code(400).send({ error: validationError })
      }

      const existing = db
        .prepare(
          `SELECT MAX(score) as best_score FROM conversion_trainer_scores WHERE user_id = ? AND mode = ? AND COALESCE(conv, 'binary-standalone') = ?`
        )
        .get(user.userId, body.mode, convVal) as { best_score: number | null } | undefined

      const currentBest = existing?.best_score ?? -1
      if (body.score <= currentBest) {
        db.prepare(`UPDATE conversion_trainer_sessions SET used_at = datetime('now') WHERE id = ?`).run(body.sessionId)
        return reply.send({ message: 'Score not improved (not saved)' })
      }

      db.prepare(
        `DELETE FROM conversion_trainer_scores WHERE user_id = ? AND mode = ? AND COALESCE(conv, 'binary-standalone') = ?`
      ).run(user.userId, body.mode, convVal)

      db.prepare(`
        INSERT INTO conversion_trainer_scores (user_id, mode, conv, score, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(user.userId, body.mode, convVal, body.score, body.metadata ? JSON.stringify(body.metadata) : null)

      db.prepare(`UPDATE conversion_trainer_sessions SET used_at = datetime('now') WHERE id = ?`).run(body.sessionId)

      return reply.send({ message: 'Score submitted' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get XP leaderboard (public) - users ranked by total XP
  fastify.get('/api/conversion-trainer/leaderboard/xp', async (request, reply) => {
    try {
      const { limit } = request.query as { limit?: string }
      const limitVal = Math.min(parseInt(limit || '20', 10) || 20, 100)

      const rows = db
        .prepare(`
          SELECT p.user_id, p.total_xp, p.level, u.name as user_name
          FROM conversion_trainer_progress p
          JOIN users u ON u.id = p.user_id
          WHERE p.total_xp > 0
          ORDER BY p.total_xp DESC
          LIMIT ?
        `)
        .all(limitVal) as Array<{ user_id: string; total_xp: number; level: number; user_name: string }>

      const leaderboard = rows.map((r, i) => ({
        rank: i + 1,
        userId: r.user_id,
        userName: r.user_name,
        totalXp: r.total_xp,
        level: r.level,
      }))

      return reply.send({ leaderboard })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get leaderboard (public)
  fastify.get('/api/conversion-trainer/leaderboard', async (request, reply) => {
    try {
      const { mode, conv, limit } = request.query as { mode?: string; conv?: string; limit?: string }
      const modeVal = mode || 'speed-round'
      const convVal = conv || 'binary-standalone'
      const limitVal = Math.min(parseInt(limit || '20', 10) || 20, 100)

      // Daily streak leaderboard: from progress table
      if (modeVal === 'daily-streak') {
        const rows = db
          .prepare(`
            SELECT p.user_id, p.daily_streak as score, u.name as user_name
            FROM conversion_trainer_progress p
            JOIN users u ON u.id = p.user_id
            WHERE p.daily_streak > 0
            ORDER BY p.daily_streak DESC
            LIMIT ?
          `)
          .all(limitVal) as Array<{ user_id: string; score: number; user_name: string }>

        const leaderboard = rows.map((r, i) => ({
          id: i + 1,
          userId: r.user_id,
          mode: 'daily-streak',
          score: r.score,
          metadata: null,
          createdAt: '',
          userName: r.user_name,
        }))
        return reply.send({ leaderboard })
      }

      const rows = db
        .prepare(`
          SELECT s.id, s.user_id, s.mode, s.score, s.metadata, s.created_at, u.name as user_name
          FROM conversion_trainer_scores s
          JOIN users u ON u.id = s.user_id
          WHERE s.mode = ? AND COALESCE(s.conv, 'binary-standalone') = ?
          ORDER BY s.score DESC
          LIMIT ?
        `)
        .all(modeVal, convVal, limitVal) as Array<{
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
        .get(user.userId) as Record<string, unknown> | undefined

      if (!row) {
        return reply.send({
          totalXp: 0,
          level: 1,
          bestStreak: 0,
          bestClassicStreak: 0,
          dailyStreak: 0,
          bestSpeedRound: 0,
          bestSurvival: 0,
          bestNibbleSprint: 0,
        })
      }

      return reply.send({
        totalXp: (row.total_xp as number) ?? 0,
        level: xpToLevel((row.total_xp as number) ?? 0),
        bestStreak: (row.best_streak as number) ?? 0,
        bestClassicStreak: (row.best_classic_streak as number) ?? 0,
        dailyStreak: (row.daily_streak as number) ?? 0,
        bestSpeedRound: (row.best_speed_round as number) ?? 0,
        bestSurvival: (row.best_survival as number) ?? 0,
        bestNibbleSprint: (row.best_nibble_sprint as number) ?? 0,
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
        .get(user.userId) as Record<string, unknown> | undefined

      const totalXp = ((existing?.total_xp as number) ?? 0) + (body.xpEarned ?? 0)
      const bestStreak = Math.max((existing?.best_streak as number) ?? 0, body.bestStreak ?? 0)
      const bestClassicStreak = Math.max((existing?.best_classic_streak as number) ?? 0, body.bestClassicStreak ?? 0)
      const bestSpeedRound = Math.max((existing?.best_speed_round as number) ?? 0, body.bestSpeedRound ?? 0)
      const bestSurvival = Math.max((existing?.best_survival as number) ?? 0, body.bestSurvival ?? 0)
      const bestNibbleSprint = Math.max((existing?.best_nibble_sprint as number) ?? 0, body.bestNibbleSprint ?? 0)

      let dailyStreak = (existing?.daily_streak as number) ?? 0
      const lastPlayed = (existing?.last_played_date as string) ?? null
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

      if (body.recordPlayed) {
        if (lastPlayed === today) {
          // Already played today, no change
        } else if (lastPlayed) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
          if (lastPlayed === yesterday) {
            dailyStreak += 1
          } else {
            dailyStreak = 1
          }
        } else {
          dailyStreak = 1
        }
      }

      const level = xpToLevel(totalXp)
      const lastPlayedDate = body.recordPlayed ? today : (lastPlayed ?? null)
      db.prepare(`
        INSERT INTO conversion_trainer_progress (user_id, total_xp, level, best_streak, best_classic_streak, best_speed_round, best_survival, best_nibble_sprint, daily_streak, last_played_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          total_xp = excluded.total_xp,
          level = excluded.level,
          best_streak = excluded.best_streak,
          best_classic_streak = excluded.best_classic_streak,
          best_speed_round = excluded.best_speed_round,
          best_survival = excluded.best_survival,
          best_nibble_sprint = excluded.best_nibble_sprint,
          daily_streak = excluded.daily_streak,
          last_played_date = excluded.last_played_date,
          updated_at = datetime('now')
      `).run(user.userId, totalXp, level, bestStreak, bestClassicStreak, bestSpeedRound, bestSurvival, bestNibbleSprint, dailyStreak, lastPlayedDate)

      return reply.send({
        totalXp,
        level: xpToLevel(totalXp),
        bestStreak,
        bestClassicStreak,
        dailyStreak,
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

  // --- Admin: Conversion Trainer Scores ---

  const adminScoreSchema = z.object({
    mode: z.string().optional(),
    conv: z.string().optional(),
    limit: z.string().optional(),
  })

  const adminEditScoreSchema = z.object({
    score: z.number().int().min(0),
  })

  // List all scores (admin only)
  fastify.get('/api/admin/conversion-trainer/scores', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { mode, conv, limit } = adminScoreSchema.parse(request.query)
      const limitVal = Math.min(parseInt(limit || '100', 10) || 100, 500)

      let query = `
        SELECT s.id, s.user_id, s.mode, s.conv, s.score, s.metadata, s.created_at, u.name as user_name, u.email as user_email
        FROM conversion_trainer_scores s
        JOIN users u ON u.id = s.user_id
      `
      const params: (string | number)[] = []
      const conditions: string[] = []
      if (mode) {
        conditions.push('s.mode = ?')
        params.push(mode)
      }
      if (conv) {
        conditions.push("COALESCE(s.conv, 'binary-standalone') = ?")
        params.push(conv)
      }
      if (conditions.length) query += ' WHERE ' + conditions.join(' AND ')
      query += ' ORDER BY s.created_at DESC LIMIT ?'
      params.push(limitVal)

      const rows = db.prepare(query).all(...params) as Array<{
        id: number
        user_id: string
        mode: string
        conv: string | null
        score: number
        metadata: string | null
        created_at: string
        user_name: string
        user_email: string
      }>

      return reply.send({
        scores: rows.map((r) => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          userEmail: r.user_email,
          mode: r.mode,
          conv: r.conv || 'binary-standalone',
          score: r.score,
          metadata: r.metadata ? JSON.parse(r.metadata) : null,
          createdAt: r.created_at,
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

  // Edit score (admin only)
  fastify.patch('/api/admin/conversion-trainer/scores/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = adminEditScoreSchema.parse(request.body)
      const scoreId = parseInt(id, 10)
      if (isNaN(scoreId)) {
        return reply.code(400).send({ error: 'Invalid score ID' })
      }

      const existing = db.prepare('SELECT id FROM conversion_trainer_scores WHERE id = ?').get(scoreId) as { id: number } | undefined
      if (!existing) {
        return reply.code(404).send({ error: 'Score not found' })
      }

      db.prepare('UPDATE conversion_trainer_scores SET score = ? WHERE id = ?').run(body.score, scoreId)
      return reply.send({ message: 'Score updated' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Delete score (admin only)
  fastify.delete('/api/admin/conversion-trainer/scores/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const scoreId = parseInt(id, 10)
      if (isNaN(scoreId)) {
        return reply.code(400).send({ error: 'Invalid score ID' })
      }

      const result = db.prepare('DELETE FROM conversion_trainer_scores WHERE id = ?').run(scoreId)
      if (result.changes === 0) {
        return reply.code(404).send({ error: 'Score not found' })
      }
      return reply.send({ message: 'Score deleted' })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
