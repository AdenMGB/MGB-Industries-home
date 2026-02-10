import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../plugins/auth.js'
import type { UserWithoutPassword } from '../types/index.js'
import { getDatabase } from '../plugins/database.js'
import { hashPassword } from '../utils/password.js'
import { randomBytes } from 'node:crypto'

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['user', 'admin']).optional(),
})

export async function userRoutes(fastify: FastifyInstance) {
  // Get database from global instance
  const db = getDatabase()

  // Get contact messages (admin only)
  fastify.get('/api/admin/contact-messages', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const messages = db
        .prepare(
          'SELECT id, name, email, message, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 100',
        )
        .all() as Array<{
        id: number
        name: string
        email: string
        message: string
        created_at: string
      }>
      return reply.send({ messages })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to fetch contact messages' })
    }
  })

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

  // Update user (admin only)
  fastify.patch('/api/users/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = updateUserSchema.parse(request.body)

      // Check if user exists
      const existingUser = db
        .prepare('SELECT id, email FROM users WHERE id = ?')
        .get(id) as { id: string; email: string } | undefined

      if (!existingUser) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Check if email is being changed and if it's already taken
      if (body.email && body.email !== existingUser.email) {
        const emailExists = db
          .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
          .get(body.email, id) as { id: string } | undefined

        if (emailExists) {
          return reply.code(400).send({ error: 'Email already registered' })
        }
      }

      // Build update query dynamically
      const updates: string[] = []
      const values: any[] = []

      if (body.email) {
        updates.push('email = ?')
        values.push(body.email)
      }
      if (body.name) {
        updates.push('name = ?')
        values.push(body.name)
      }
      if (body.role) {
        updates.push('role = ?')
        values.push(body.role)
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' })
      }

      updates.push('updated_at = datetime(\'now\')')
      values.push(id)

      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      db.prepare(sql).run(...values)

      // Get updated user
      const updatedUser = db
        .prepare('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?')
        .get(id) as UserWithoutPassword

      return reply.send({ user: updatedUser })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Reset password to temporary password (admin only)
  fastify.post('/api/users/:id/reset-password', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      // Check if user exists
      const existingUser = db
        .prepare('SELECT id FROM users WHERE id = ?')
        .get(id) as { id: string } | undefined

      if (!existingUser) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Generate temporary password (12 characters, alphanumeric)
      const tempPassword = randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12)
      const passwordHash = await hashPassword(tempPassword)

      // Update password
      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(passwordHash, id)

      return reply.send({ 
        message: 'Password reset successfully',
        temporaryPassword: tempPassword,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Generate password reset link (admin only)
  fastify.post('/api/users/:id/reset-link', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      // Check if user exists
      const existingUser = db
        .prepare('SELECT id, email FROM users WHERE id = ?')
        .get(id) as { id: string; email: string } | undefined

      if (!existingUser) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Generate reset token
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours expiry

      // Store token in database
      db.prepare(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `).run(id, token, expiresAt.toISOString())

      // Generate reset link
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      const resetLink = `${baseUrl}/reset-password?token=${token}`

      return reply.send({ 
        message: 'Reset link generated successfully',
        resetLink,
        token,
        expiresAt: expiresAt.toISOString(),
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Delete user (admin only)
  fastify.delete('/api/users/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { user: currentUser } = request as { user: { userId: string } }

      // Prevent self-deletion
      if (id === currentUser.userId) {
        return reply.code(400).send({ error: 'Cannot delete your own account' })
      }

      // Check if user exists
      const existingUser = db
        .prepare('SELECT id FROM users WHERE id = ?')
        .get(id) as { id: string } | undefined

      if (!existingUser) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Delete user (cascade will delete reset tokens)
      db.prepare('DELETE FROM users WHERE id = ?').run(id)

      return reply.send({ message: 'User deleted successfully' })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
