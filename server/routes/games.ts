import type { FastifyInstance } from 'fastify'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'

const GAMES_BASE =
  process.env.GAMES_BASE || join(process.cwd(), 'data', 'games')

export async function gameListRoutes(fastify: FastifyInstance) {
  fastify.get('/api/games/offline-list', async (request, reply) => {
    try {
      const offlineDir = join(
        GAMES_BASE,
        'Offline-HTML-Games-Pack-master',
        'offline',
      )
      if (!existsSync(offlineDir)) {
        return { games: [] }
      }

      const files = await readdir(offlineDir)
      const htmlFiles = files
        .filter((f) => f.endsWith('.html') || f.endsWith('.htm'))
        .filter(
          (f) =>
            !f.includes('epicviewer') &&
            !f.includes('single-file') &&
            !f.includes('compressed'),
        )
        .sort()

      const games = htmlFiles.map((file) => {
        const name = file.replace(/\.(html|htm)$/i, '')
        const readableName = name
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .replace(/\d+\./g, '')
          .replace(/\b\w/g, (l) => l.toUpperCase())
          .replace(/_/g, ' ')
          .trim()

        return {
          name: readableName || name,
          href: `Offline-HTML-Games-Pack-master/offline/${file}`,
        }
      })

      return { games }
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to list offline games' })
    }
  })

  // API endpoint to list all files in a directory recursively
  fastify.get('/api/games/list-files', async (request, reply) => {
    try {
      const { path: dirPath } = request.query as { path?: string }
      const targetDir = dirPath ? join(GAMES_BASE, dirPath) : GAMES_BASE

      const gamesBaseResolved = resolve(GAMES_BASE).replace(/\\/g, '/')
      const targetResolved = resolve(targetDir).replace(/\\/g, '/')
      if (
        !targetResolved.startsWith(gamesBaseResolved + '/') &&
        targetResolved !== gamesBaseResolved
      ) {
        return reply.code(403).send({ error: 'Access denied' })
      }

      if (!existsSync(targetDir)) {
        return reply.code(404).send({ error: 'Directory not found' })
      }

      const files: Array<{
        name: string
        path: string
        isDirectory: boolean
        size?: number
      }> = []

      async function scanDirectory(dir: string, relativePath = '') {
        const entries = await readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = join(dir, entry.name)
          const relPath = relativePath ? join(relativePath, entry.name) : entry.name

          if (entry.isDirectory()) {
            files.push({
              name: entry.name,
              path: relPath,
              isDirectory: true,
            })
            await scanDirectory(fullPath, relPath)
          } else {
            const stats = await stat(fullPath)
            files.push({
              name: entry.name,
              path: relPath,
              isDirectory: false,
              size: stats.size,
            })
          }
        }
      }

      await scanDirectory(targetDir)
      return { files }
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to list files' })
    }
  })

  // Fallback: HTML with base tag injection for games that need it
  fastify.get<{ Params: { '*': string } }>('/api/games/html/*', async (request, reply) => {
    try {
      const pathParam = request.params['*']
      if (!pathParam) {
        return reply.code(400).send({ error: 'Path required' })
      }

      const filePath = join(GAMES_BASE, pathParam)
      const gamesBaseResolved = resolve(GAMES_BASE).replace(/\\/g, '/')
      const filePathResolved = resolve(filePath).replace(/\\/g, '/')

      if (
        !filePathResolved.startsWith(gamesBaseResolved + '/') &&
        filePathResolved !== gamesBaseResolved
      ) {
        return reply.code(403).send({ error: 'Access denied' })
      }

      if (!existsSync(filePath)) {
        return reply.code(404).send({ error: 'File not found' })
      }

      const stats = await stat(filePath)
      if (stats.isDirectory()) {
        return reply.code(400).send({ error: 'Path is a directory' })
      }

      if (!pathParam.endsWith('.html') && !pathParam.endsWith('.htm')) {
        return reply.code(400).send({ error: 'Only HTML files supported' })
      }

      const content = await readFile(filePath, 'utf-8')
      const baseHref = `/games/${pathParam.replace(/\/[^/]+$/, '/')}`
      const injected = content.replace(
        /<head[^>]*>/i,
        (match) => `${match}<base href="${baseHref}">`,
      )

      return reply.type('text/html; charset=utf-8').send(injected)
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to read file' })
    }
  })
}
