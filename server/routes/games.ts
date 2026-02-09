import type { FastifyInstance } from 'fastify'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export async function gameListRoutes(fastify: FastifyInstance) {
  fastify.get('/api/games/offline-list', async (request, reply) => {
    try {
      // Check both possible locations for offline games
      const possibleDirs = [
        join('/app', 'data', 'games', 'Offline-HTML-Games-Pack-master', 'offline'),
        join('/app', 'data', 'games', 'offline'),
        join(process.cwd(), 'data', 'games', 'Offline-HTML-Games-Pack-master', 'offline'),
        join(process.cwd(), 'data', 'games', 'offline'),
        join('/data', 'games', 'Offline-HTML-Games-Pack-master', 'offline'),
        join('/data', 'games', 'offline'),
      ]
      
      let offlineDir: string | null = null
      for (const dir of possibleDirs) {
        try {
          await readdir(dir)
          offlineDir = dir
          break
        } catch {
          // Try next directory
        }
      }
      
      if (!offlineDir) {
        return { games: [] }
      }
      
      const files = await readdir(offlineDir)
      
      const htmlFiles = files
        .filter(f => f.endsWith('.html') || f.endsWith('.htm'))
        .filter(f => !f.includes('epicviewer') && !f.includes('single-file') && !f.includes('compressed'))
        .sort()
      
      // Determine the relative path for href
      let relativePath: string
      if (offlineDir.includes('/app/data/games')) {
        relativePath = offlineDir.includes('Offline-HTML-Games-Pack-master')
          ? 'data/games/Offline-HTML-Games-Pack-master/offline'
          : 'data/games/offline'
      } else if (offlineDir.includes(process.cwd())) {
        relativePath = offlineDir.includes('Offline-HTML-Games-Pack-master')
          ? 'data/games/Offline-HTML-Games-Pack-master/offline'
          : 'data/games/offline'
      } else {
        relativePath = offlineDir.includes('Offline-HTML-Games-Pack-master')
          ? 'data/games/Offline-HTML-Games-Pack-master/offline'
          : 'data/games/offline'
      }
      
      const games = htmlFiles.map(file => {
        const name = file.replace(/\.(html|htm)$/i, '')
        // Convert filename to readable name
        const readableName = name
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .replace(/\d+\./g, '')
          .replace(/\b\w/g, l => l.toUpperCase())
          .replace(/_/g, ' ')
          .trim()
        
        return {
          name: readableName || name,
          href: `${relativePath}/${file}`,
        }
      })
      
      return { games }
    } catch (error: any) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to list offline games' })
    }
  })
}
