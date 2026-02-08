import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../plugins/auth.js'
import { getDatabase } from '../plugins/database.js'

const saveGameSchema = z.object({
  gameId: z.string().min(1),
  saveData: z.record(z.any()),
})

const recordGameVisitSchema = z.object({
  gameId: z.string().min(1),
  gameName: z.string().min(1),
  gameHref: z.string().min(1),
})

export async function gameSaveRoutes(fastify: FastifyInstance) {
  const db = getDatabase()

  // Get all game saves for authenticated user
  fastify.get('/api/game-saves', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { user } = request as { user: { userId: string } }

      const saves = db
        .prepare('SELECT game_id, save_data, updated_at FROM game_saves WHERE user_id = ?')
        .all(user.userId) as Array<{
        game_id: string
        save_data: string
        updated_at: string
      }>

      const savesMap: Record<string, any> = {}
      for (const save of saves) {
        try {
          savesMap[save.game_id] = JSON.parse(save.save_data)
        } catch {
          // Skip invalid JSON
        }
      }

      return reply.send({ saves: savesMap })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get save for specific game
  fastify.get('/api/game-saves/:gameId', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { gameId } = request.params as { gameId: string }
      const { user } = request as { user: { userId: string } }

      const save = db
        .prepare('SELECT save_data FROM game_saves WHERE user_id = ? AND game_id = ?')
        .get(user.userId, gameId) as { save_data: string } | undefined

      if (!save) {
        return reply.code(404).send({ error: 'Save not found' })
      }

      try {
        const saveData = JSON.parse(save.save_data)
        return reply.send({ saveData })
      } catch {
        return reply.code(500).send({ error: 'Invalid save data' })
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Save game data
  fastify.post('/api/game-saves', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const body = saveGameSchema.parse(request.body)
      const { user } = request as { user: { userId: string } }

      const saveDataJson = JSON.stringify(body.saveData)

      // Insert or update save
      db.prepare(`
        INSERT INTO game_saves (user_id, game_id, save_data, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, game_id) DO UPDATE SET
          save_data = excluded.save_data,
          updated_at = datetime('now')
      `).run(user.userId, body.gameId, saveDataJson)

      return reply.send({ message: 'Game saved successfully' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Delete game save
  fastify.delete('/api/game-saves/:gameId', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { gameId } = request.params as { gameId: string }
      const { user } = request as { user: { userId: string } }

      db.prepare('DELETE FROM game_saves WHERE user_id = ? AND game_id = ?').run(user.userId, gameId)

      return reply.send({ message: 'Save deleted successfully' })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Record game visit
  fastify.post('/api/game-history/visit', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const body = recordGameVisitSchema.parse(request.body)
      const { user } = request as { user: { userId: string } }

      // Insert visit record
      db.prepare(`
        INSERT INTO game_history (user_id, game_id, game_name, game_href, visited_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(user.userId, body.gameId, body.gameName, body.gameHref)

      // Keep only the last 5 visits per user (delete older ones)
      const allVisits = db
        .prepare('SELECT id FROM game_history WHERE user_id = ? ORDER BY visited_at DESC')
        .all(user.userId) as Array<{ id: number }>

      if (allVisits.length > 5) {
        const idsToDelete = allVisits.slice(5).map(v => v.id)
        if (idsToDelete.length > 0) {
          const placeholders = idsToDelete.map(() => '?').join(',')
          db.prepare(`DELETE FROM game_history WHERE id IN (${placeholders})`).run(...idsToDelete)
        }
      }

      return reply.send({ message: 'Visit recorded successfully' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get game history (last 5 games)
  fastify.get('/api/game-history', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { user } = request as { user: { userId: string } }

      const history = db
        .prepare(`
          SELECT game_id, game_name, game_href, visited_at
          FROM game_history
          WHERE user_id = ?
          ORDER BY visited_at DESC
          LIMIT 5
        `)
        .all(user.userId) as Array<{
        game_id: string
        game_name: string
        game_href: string
        visited_at: string
      }>

      return reply.send({ history })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
