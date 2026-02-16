import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { databasePlugin } from './plugins/database.js'
import { authPlugin } from './plugins/auth.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { gameSaveRoutes } from './routes/gameSaves.js'
import { gameListRoutes } from './routes/games.js'
import { contactRoutes } from './routes/contact.js'
import { seoRoutes } from './routes/seo.js'
import { gitRoutes } from './routes/git.js'

export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  })

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  })

  // Register plugins (database must be first)
  await fastify.register(databasePlugin)
  await fastify.register(authPlugin)

  // Serve game files from data/games at /games/
  const gamesRoot = process.env.GAMES_BASE || join(process.cwd(), 'data', 'games')
  if (existsSync(gamesRoot)) {
    await fastify.register(fastifyStatic, {
      root: gamesRoot,
      prefix: '/games/',
      decorateReply: false,
    })
  }

  // Register routes (they will check for database availability themselves)
  await fastify.register(authRoutes)
  await fastify.register(userRoutes)
  await fastify.register(gameSaveRoutes)
  await fastify.register(gameListRoutes)
  await fastify.register(contactRoutes)
  await fastify.register(seoRoutes)
  await fastify.register(gitRoutes)

  return fastify
}

export async function startServer() {
  const server = await createServer()

  const port = Number(process.env.PORT) || 3001
  const host = process.env.HOST || '0.0.0.0'

  try {
    await server.listen({ port, host })
    console.log(`Server listening on http://${host}:${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }

  return server
}

// If running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
}
