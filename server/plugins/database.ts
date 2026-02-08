import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { runMigrations } from '../utils/migration-runner.js'
import type { FastifyInstance } from 'fastify'

const DATABASE_PATH =
  process.env.DATABASE_PATH || join(process.cwd(), 'data', 'database.db')

let dbInstance: DatabaseSync | null = null

export async function databasePlugin(fastify: FastifyInstance) {
  // Ensure data directory exists
  const dataDir = join(process.cwd(), 'data')
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true })
  }

  // Create database connection (DatabaseSync is synchronous but we're in async context)
  const db = new DatabaseSync(DATABASE_PATH)
  fastify.log.info(`Connected to database at ${DATABASE_PATH}`)

  dbInstance = db

  // Run migrations
  try {
    await runMigrations(db)
    fastify.log.info('Migrations completed successfully')
  } catch (error) {
    fastify.log.error(error, 'Migration failed')
    throw error
  }

  // Decorate Fastify instance with database
  // Use decorate with dependencies to ensure it's available to child plugins
  fastify.decorate('db', db)
  
  // Also add it to the parent if this is a nested plugin
  if ((fastify as any).parent) {
    (fastify as any).parent.db = db
  }
  
  fastify.log.info('Database decorated on Fastify instance')

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    db.close()
    fastify.log.info('Database connection closed')
  })
}

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    throw new Error('Database not initialized')
  }
  return dbInstance
}

declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseSync
  }
}
