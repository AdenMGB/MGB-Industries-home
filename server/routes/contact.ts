import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDatabase } from '../plugins/database.js'

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
})

export async function contactRoutes(fastify: FastifyInstance) {
  fastify.post('/api/contact', async (request, reply) => {
    try {
      const body = contactSchema.parse(request.body)
      const db = getDatabase()

      db.prepare(
        'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      ).run(body.name, body.email, body.message)

      return { message: 'Message sent successfully' }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Invalid input',
          details: err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to send message' })
    }
  })
}
