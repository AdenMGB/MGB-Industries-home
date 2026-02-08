import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../plugins/auth.js'
import type { UserWithoutPassword } from '../types/index.js'
import { getDatabase } from '../plugins/database.js'

export async function userRoutes(fastify: FastifyInstance) {
  // Get database from global instance
  const db = getDatabase()

  // Get all users (admin only)
  fastify.get('/api/users', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const users = db
        .prepare('SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC')
        .all() as UserWithoutPassword[]

      return reply.send({ users })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get user by ID (admin only)
  fastify.get('/api/users/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const user = db
        .prepare('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?')
        .get(id) as UserWithoutPassword | undefined

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      return reply.send({ user })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
