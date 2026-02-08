import type { FastifyInstance } from 'fastify'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export async function gameListRoutes(fastify: FastifyInstance) {
  fastify.get('/api/games/offline-list', async (request, reply) => {
    try {
      const offlineDir = join(process.cwd(), 'public', 'Offline-HTML-Games-Pack-master', 'offline')
      const files = await readdir(offlineDir)
      
      const htmlFiles = files
        .filter(f => f.endsWith('.html') || f.endsWith('.htm'))
        .filter(f => !f.includes('epicviewer') && !f.includes('single-file') && !f.includes('compressed'))
        .sort()
      
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
          href: `Offline-HTML-Games-Pack-master/offline/${file}`,
        }
      })
      
      return { games }
    } catch (error: any) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to list offline games' })
    }
  })
}
