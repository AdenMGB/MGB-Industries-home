import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
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
        .get(body.email) as { id: number } | undefined

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

      // Insert user
      const result = db
        .prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
        .run(body.email, passwordHash, body.name, role)

      const userId = Number(result.lastInsertRowid)

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
        id: number
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
        id: user.id,
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
}
