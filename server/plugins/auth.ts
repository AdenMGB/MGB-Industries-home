import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { JWTPayload } from '../types/index.js'
import { signJWT, verifyJWT } from '../utils/jwt.js'

export async function authPlugin(fastify: FastifyInstance) {
  // Decorate Fastify with auth utilities (for compatibility, but routes use utils directly)
  fastify.decorate('signJWT', signJWT)
  fastify.decorate('verifyJWT', verifyJWT)
}

// Authentication middleware
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  const token = authHeader.substring(7)

  try {
    const payload = await verifyJWT(token)
    request.user = payload
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' })
  }
}

// Optional auth - sets user if valid token, does not fail if missing/invalid
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return
  const token = authHeader.substring(7)
  try {
    const payload = await verifyJWT(token)
    request.user = payload
  } catch {
    /* ignore */
  }
}

// Admin middleware
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await authenticate(request, reply)

  if (request.user?.role !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden: Admin access required' })
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    signJWT: (payload: JWTPayload) => Promise<string>
    verifyJWT: (token: string) => Promise<JWTPayload>
  }

  interface FastifyRequest {
    user?: JWTPayload
  }
}
