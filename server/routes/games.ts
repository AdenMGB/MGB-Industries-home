import type { FastifyInstance } from 'fastify'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, extname, relative, resolve, normalize } from 'node:path'
import { existsSync } from 'node:fs'

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
          href: `${relativePath}/${file}`, // Keep original path for API endpoint
        }
      })
      
      return { games }
    } catch (error: any) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to list offline games' })
    }
  })

  // API endpoint to list all files in a directory recursively
  fastify.get('/api/games/list-files', async (request, reply) => {
    try {
      const { path: dirPath } = request.query as { path?: string }
      const baseDir = join('/app', 'data', 'games')
      const targetDir = dirPath ? join(baseDir, dirPath) : baseDir

      // Security: ensure the path is within baseDir
      if (!targetDir.startsWith(baseDir)) {
        return reply.code(403).send({ error: 'Access denied' })
      }

      if (!existsSync(targetDir)) {
        return reply.code(404).send({ error: 'Directory not found' })
      }

      const files: Array<{ name: string; path: string; isDirectory: boolean; size?: number }> = []

      async function scanDirectory(dir: string, relativePath: string = '') {
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
            // Recursively scan subdirectories
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
    } catch (error: any) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to list files' })
    }
  })

  // API endpoint to serve game files
  // Use catch-all route pattern
  fastify.get('/api/games/file/*', async (request, reply) => {
    try {
      // Fastify wildcard captures everything after the route
      const filePath = decodeURIComponent((request.url.split('/api/games/file/')[1] || '').split('?')[0])
      
      // Try both possible base directories (dev and production)
      const possibleBaseDirs = [
        '/app/data/games', // Docker production
        join(process.cwd(), 'data', 'games'), // Development
      ]
      
      fastify.log.info(`File request: ${filePath}`)
      
      // Normalize the file path - remove leading "data/games" if present
      let normalizedPath = filePath.replace(/^data\/games\//, '').replace(/^\/+/, '')
      
      // Try multiple possible paths (direct, Gams-main, etc.)
      // If path already starts with Gams-main or Offline-HTML-Games-Pack-master, use it directly
      const possiblePaths: string[] = []
      if (normalizedPath.startsWith('Gams-main/') || normalizedPath.startsWith('Offline-HTML-Games-Pack-master/')) {
        // Path already includes the subdirectory, use it as-is
        possiblePaths.push(normalizedPath)
      } else {
        // Try different locations
        possiblePaths.push(normalizedPath) // Direct path: g/stickmanhook.html
        possiblePaths.push(join('Gams-main', normalizedPath)) // In Gams-main: Gams-main/g/stickmanhook.html
        // For nested paths like g/Ruffle/swfs/file.js, also try Gams-main/g/Ruffle/swfs/file.js
        if (normalizedPath.startsWith('g/')) {
          possiblePaths.push(join('Gams-main', normalizedPath)) // Already added above, but keep for clarity
        }
        possiblePaths.push(join('Offline-HTML-Games-Pack-master', 'offline', normalizedPath.split('/').pop() || '')) // In offline pack
      }
      
      // Try each base directory to find the file
      let finalPath: string | null = null
      let baseDir: string | null = null
      
      for (const possibleBaseDir of possibleBaseDirs) {
        for (const pathToTry of possiblePaths) {
          // Use resolve to get absolute path, then normalize
          const resolvedBaseDir = resolve(possibleBaseDir)
          const testPath = resolve(resolvedBaseDir, pathToTry)
          const normalizedTestPath = normalize(testPath)
          const normalizedBaseDir = normalize(resolvedBaseDir)
          
          // Security: ensure the resolved path is within baseDir (prevents directory traversal)
          // Normalize both to forward slashes for comparison
          const testPathNormalized = normalizedTestPath.replace(/\\/g, '/')
          const baseDirNormalized = normalizedBaseDir.replace(/\\/g, '/')
          
          if (testPathNormalized.startsWith(baseDirNormalized + '/') || testPathNormalized === baseDirNormalized) {
            // Check if file exists using the actual resolved path
            if (existsSync(normalizedTestPath)) {
              finalPath = normalizedTestPath
              baseDir = normalizedBaseDir
              fastify.log.info(`Found file at: ${finalPath}`)
              break
            } else {
              fastify.log.debug(`File does not exist at: ${normalizedTestPath}`)
            }
          } else {
            fastify.log.debug(`Path security check failed: ${testPathNormalized} not within ${baseDirNormalized}`)
          }
        }
        if (finalPath) break
      }
      
      if (!finalPath || !baseDir) {
        // Log all attempted paths for debugging
        const allAttemptedPaths: string[] = []
        for (const possibleBaseDir of possibleBaseDirs) {
          for (const pathToTry of possiblePaths) {
            const resolvedBaseDir = resolve(possibleBaseDir)
            const testPath = resolve(resolvedBaseDir, pathToTry)
            allAttemptedPaths.push(normalize(testPath))
          }
        }
        fastify.log.warn(`File not found: ${filePath}, normalized: ${normalizedPath}, tried ${allAttemptedPaths.length} paths`)
        fastify.log.debug(`Attempted paths: ${allAttemptedPaths.slice(0, 10).join(', ')}${allAttemptedPaths.length > 10 ? '...' : ''}`)
        return reply.code(404).send({ error: 'File not found', path: filePath, normalized: normalizedPath })
      }

      const stats = await stat(finalPath)
      if (stats.isDirectory()) {
        return reply.code(400).send({ error: 'Path is a directory' })
      }

      // Read file content
      let content = await readFile(finalPath)
      
      // Determine content type based on file extension
      const ext = extname(finalPath).toLowerCase()
      const contentTypeMap: Record<string, string> = {
        '.html': 'text/html',
        '.htm': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
      }

      const contentType = contentTypeMap[ext] || 'application/octet-stream'

      // For HTML files, inject base tag to fix relative paths
      if (ext === '.html' || ext === '.htm') {
        const htmlContent = content.toString('utf-8')
        // Calculate the directory path relative to baseDir for the base tag
        // finalPath is the absolute path to the HTML file
        // We need to get the directory containing the HTML file, relative to baseDir
        const fileDir = join(finalPath, '..')
        const relativeDir = relative(baseDir!, fileDir).replace(/\\/g, '/')
        // Build the base path - this should be the directory containing the HTML file
        // relativeDir might be empty ('.'), 'Gams-main/g/g/drivemad', etc.
        let basePath: string
        if (relativeDir === '.' || relativeDir === '') {
          basePath = '/api/games/file/'
        } else {
          // Ensure we have the full path including any subdirectories
          basePath = `/api/games/file/${relativeDir}/`
        }
        
        fastify.log.info(`HTML file: ${finalPath}, baseDir: ${baseDir}, relativeDir: ${relativeDir}, basePath: ${basePath}`)
        
        // Inject base tag after <head> or at the beginning if no head tag
        // Use a more robust replacement that handles case-insensitive and whitespace
        let modifiedContent = htmlContent
        const headTagRegex = /<head[^>]*>/i
        const htmlTagRegex = /<html[^>]*>/i
        
        if (headTagRegex.test(htmlContent)) {
          modifiedContent = htmlContent.replace(
            headTagRegex,
            (match) => `${match}<base href="${basePath}">`
          )
        } else if (htmlTagRegex.test(htmlContent)) {
          modifiedContent = htmlContent.replace(
            htmlTagRegex,
            (match) => `${match}<head><base href="${basePath}"></head>`
          )
        } else {
          // No head or html tag, prepend base tag
          modifiedContent = `<head><base href="${basePath}"></head>${htmlContent}`
        }
        
        content = Buffer.from(modifiedContent, 'utf-8')
      }

      // Set appropriate headers
      reply.type(contentType)
      reply.header('Cache-Control', 'public, max-age=3600')
      
      // For HTML files, also set charset to avoid encoding warnings
      if (ext === '.html' || ext === '.htm') {
        reply.header('Content-Type', `${contentType}; charset=utf-8`)
      }
      
      return reply.send(content)
    } catch (error: any) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to read file' })
    }
  })
}
