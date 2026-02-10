import type { FastifyInstance } from 'fastify'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

const SITE_URL = process.env.SITE_URL || 'https://adenmgb.com'

const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/projects', changefreq: 'weekly', priority: 0.9 },
  { path: '/about', changefreq: 'monthly', priority: 0.8 },
  { path: '/contact', changefreq: 'monthly', priority: 0.8 },
  { path: '/games', changefreq: 'weekly', priority: 0.9 },
]

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlToXml(url: string, changefreq: string, priority: number): string {
  return `  <url>
    <loc>${escapeXml(url)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`
}

export async function seoRoutes(fastify: FastifyInstance) {
  fastify.get('/sitemap.xml', async (request, reply) => {
    try {
      const urls: string[] = []

      for (const page of STATIC_PAGES) {
        urls.push(urlToXml(`${SITE_URL}${page.path}`, page.changefreq, page.priority))
      }

      // Add game pages if offline games exist
      const gamesBase = process.env.GAMES_BASE || join(process.cwd(), 'data', 'games')
      const offlineDir = join(gamesBase, 'Offline-HTML-Games-Pack-master', 'offline')

      if (existsSync(offlineDir)) {
        try {
          const files = await readdir(offlineDir)
          const htmlFiles = files
            .filter((f) => f.endsWith('.html') || f.endsWith('.htm'))
            .filter(
              (f) =>
                !f.includes('epicviewer') &&
                !f.includes('single-file') &&
                !f.includes('compressed'),
            )

          for (const file of htmlFiles) {
            const name = file.replace(/\.(html|htm)$/i, '')
            const gameId = name
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '')
            urls.push(urlToXml(`${SITE_URL}/games/${gameId}`, 'monthly', 0.6))
          }
        } catch (err) {
          fastify.log.warn(err, 'Failed to list games for sitemap')
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

      reply.header('Content-Type', 'application/xml; charset=utf-8')
      return reply.send(xml)
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to generate sitemap' })
    }
  })

  fastify.get('/robots.txt', async (request, reply) => {
    const content = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${SITE_URL}/sitemap.xml
`
    reply.header('Content-Type', 'text/plain; charset=utf-8')
    return reply.send(content)
  })
}
