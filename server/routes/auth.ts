import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { hashPassword, verifyPassword } from '../utils/password.js'
import type { UserWithoutPassword } from '../types/index.js'
import { getDatabase } from '../plugins/database.js'
import { signJWT, verifyJWT } from '../utils/jwt.js'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

const updateOwnAccountSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function authRoutes(fastify: FastifyInstance) {
  // Get database from global instance (more reliable than Fastify decorations in plugin scope)
  const db = getDatabase()

  // Signup
  fastify.post('/api/auth/signup', async (request, reply) => {
    try {
      const body = signupSchema.parse(request.body)

      // Check if user already exists
      const existingUser = db
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(body.email) as { id: string } | undefined

      if (existingUser) {
        return reply.code(400).send({ error: 'Email already registered' })
      }

      // Check if this is the first user (make them admin)
      const userCountResult = db
        .prepare('SELECT COUNT(*) as count FROM users')
        .get() as { count: number } | undefined
      const userCount = userCountResult?.count || 0

      const role = userCount === 0 ? 'admin' : 'user'

      // Hash password
      const passwordHash = await hashPassword(body.password)

      // Generate UUID for user
      const userId = randomUUID()

      // Insert user
      db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)')
        .run(userId, body.email, passwordHash, body.name, role)

      // Generate JWT
      const token = await signJWT({
        userId,
        email: body.email,
        role: role as 'user' | 'admin',
      })

      // Get user without password
      const user: UserWithoutPassword = {
        id: userId,
        email: body.email,
        name: body.name,
        role: role as 'user' | 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return reply.send({ token, user })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Login
  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body)

      // Find user
      const user = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(body.email) as {
        id: string
        email: string
        password_hash: string
        name: string
        role: string
        created_at: string
        updated_at: string
      } | undefined

      if (!user) {
        return reply.code(401).send({ error: 'Invalid email or password' })
      }

      // Verify password
      const isValid = await verifyPassword(body.password, user.password_hash)

      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid email or password' })
      }

      // Generate JWT
      const token = await signJWT({
        userId: user.id,
        email: user.email,
        role: user.role as 'user' | 'admin',
      })

      // Return user without password
      const userWithoutPassword: UserWithoutPassword = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'user' | 'admin',
        created_at: user.created_at,
        updated_at: user.updated_at,
      }

      return reply.send({ token, user: userWithoutPassword })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get current user (protected)
  fastify.get('/api/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const token = authHeader.substring(7)

    try {
      const payload = await verifyJWT(token)

      // Get user from database
      const user = db
        .prepare('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?')
        .get(payload.userId) as {
        id: number
        email: string
        name: string
        role: string
        created_at: string
        updated_at: string
      } | undefined

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      const userWithoutPassword: UserWithoutPassword = {
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role as 'user' | 'admin',
        created_at: user.created_at,
        updated_at: user.updated_at,
      }

      return reply.send({ user: userWithoutPassword })
    } catch (error) {
      return reply.code(401).send({ error: 'Invalid token' })
    }
  })

  // Verify reset token (public endpoint)
  fastify.get('/api/auth/verify-reset-token', async (request, reply) => {
    try {
      const { token } = request.query as { token?: string }

      if (!token) {
        return reply.code(400).send({ error: 'Token is required' })
      }

      // Find token in database
      const resetToken = db
        .prepare(`
          SELECT prt.*, u.email, u.name
          FROM password_reset_tokens prt
          JOIN users u ON prt.user_id = u.id
          WHERE prt.token = ? AND prt.used = 0
        `)
        .get(token) as {
        user_id: string
        token: string
        expires_at: string
        used: number
        email: string
        name: string
      } | undefined

      if (!resetToken) {
        return reply.code(404).send({ error: 'Invalid or expired reset token' })
      }

      // Check if token is expired
      const expiresAt = new Date(resetToken.expires_at)
      if (expiresAt < new Date()) {
        return reply.code(400).send({ error: 'Reset token has expired' })
      }

      return reply.send({
        valid: true,
        email: resetToken.email,
        name: resetToken.name,
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Reset password with token (public endpoint)
  fastify.post('/api/auth/reset-password', async (request, reply) => {
    try {
      const body = resetPasswordSchema.parse(request.body)

      // Find token in database
      const resetToken = db
        .prepare(`
          SELECT prt.*, u.email
          FROM password_reset_tokens prt
          JOIN users u ON prt.user_id = u.id
          WHERE prt.token = ? AND prt.used = 0
        `)
        .get(body.token) as {
        user_id: string
        token: string
        expires_at: string
        used: number
        email: string
      } | undefined

      if (!resetToken) {
        return reply.code(404).send({ error: 'Invalid or expired reset token' })
      }

      // Check if token is expired
      const expiresAt = new Date(resetToken.expires_at)
      if (expiresAt < new Date()) {
        return reply.code(400).send({ error: 'Reset token has expired' })
      }

      // Hash new password
      const passwordHash = await hashPassword(body.password)

      // Update user password
      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(passwordHash, resetToken.user_id)

      // Mark token as used
      db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?')
        .run(body.token)

      return reply.send({ message: 'Password reset successfully' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Update own account (authenticated users only, can only update themselves)
  fastify.patch('/api/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const token = authHeader.substring(7)

    try {
      const payload = await verifyJWT(token)
      const body = updateOwnAccountSchema.parse(request.body)

      // Check if email is being changed and if it's already taken
      if (body.email) {
        const emailExists = db
          .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
          .get(body.email, payload.userId) as { id: string } | undefined

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

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' })
      }

      updates.push('updated_at = datetime(\'now\')')
      values.push(payload.userId)

      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      db.prepare(sql).run(...values)

      // Get updated user
      const updatedUser = db
        .prepare('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?')
        .get(payload.userId) as UserWithoutPassword

      return reply.send({ user: updatedUser })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      if (error instanceof Error && error.message === 'Invalid token') {
        return reply.code(401).send({ error: 'Invalid token' })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Change own password (authenticated users only)
  fastify.post('/api/auth/change-password', async (request, reply) => {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const token = authHeader.substring(7)

    try {
      const payload = await verifyJWT(token)
      const body = changePasswordSchema.parse(request.body)

      // Get user with password hash
      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(payload.userId) as {
        id: number
        email: string
        password_hash: string
        name: string
        role: string
        created_at: string
        updated_at: string
      } | undefined

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Verify current password
      const isValid = await verifyPassword(body.currentPassword, user.password_hash)

      if (!isValid) {
        return reply.code(401).send({ error: 'Current password is incorrect' })
      }

      // Hash new password
      const passwordHash = await hashPassword(body.newPassword)

      // Update password
      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(passwordHash, payload.userId)

      return reply.send({ message: 'Password changed successfully' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }
      if (error instanceof Error && error.message === 'Invalid token') {
        return reply.code(401).send({ error: 'Invalid token' })
      }
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
