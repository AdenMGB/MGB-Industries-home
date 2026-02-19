import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { fetchCommit } from '../utils/fetch-commit.js'

const SITE_URL = process.env.SITE_URL || 'https://adenmgb.com'
const SITE_NAME = 'AdenMGB'

interface PageMeta {
  title: string
  description: string
  image?: string
}

const STATIC_ROUTE_META: Record<string, PageMeta> = {
  '/': {
    title: 'AdenMGB',
    description: 'Open source developer & creative technologist. Portfolio of projects, games, and contact.',
  },
  '/projects': {
    title: 'Projects',
    description: 'Open source projects and creative technology work by AdenMGB.',
  },
  '/about': {
    title: 'About',
    description: 'About AdenMGB - Open source developer, creative technologist. Timeline and background.',
  },
  '/contact': {
    title: 'Contact',
    description: 'Get in touch with AdenMGB. Send a message or reach out via email.',
  },
  '/developer-tools': {
    title: 'Developer Tools',
    description: 'Developer utilities: Base64, JSON, URL, UUID, timestamps, and more.',
  },
  '/developer-tools/ipv4-to-binary': {
    title: 'IPv4 ↔ Binary',
    description: 'Convert between IPv4 addresses and binary notation.',
  },
  '/developer-tools/ipv6-to-hex': {
    title: 'IPv6 ↔ Hexadecimal',
    description: 'Convert between IPv6 addresses and hexadecimal notation.',
  },
  '/developer-tools/number-to-binary': {
    title: 'Number to Binary',
    description: 'Convert numbers to binary notation.',
  },
  '/developer-tools/conversion-trainer': {
    title: 'Conversion Trainer',
    description: 'Practice binary and hexadecimal conversion with calculator, reference table, and quiz games.',
  },
  '/developer-tools/number-to-hex': {
    title: 'Number to Hex & Decimal',
    description: 'Convert numbers between decimal and hexadecimal notation.',
  },
  '/developer-tools/base64': {
    title: 'Base64 Encode/Decode',
    description: 'Encode and decode text to and from Base64.',
  },
  '/developer-tools/json-formatter': {
    title: 'JSON Formatter',
    description: 'Pretty print, minify, and validate JSON.',
  },
  '/developer-tools/color-converter': {
    title: 'Color Converter',
    description: 'Convert colors between hex, RGB, and HSL.',
  },
  '/developer-tools/diff-checker': {
    title: 'Diff Checker',
    description: 'Compare two texts and see the differences.',
  },
  '/developer-tools/case-converter': {
    title: 'Case Converter',
    description: 'Convert text between camelCase, snake_case, kebab-case, and more.',
  },
  '/developer-tools/html-encode': {
    title: 'HTML Encode/Decode',
    description: 'Escape and unescape HTML entities.',
  },
  '/developer-tools/url-encode': {
    title: 'URL Encode/Decode',
    description: 'Encode and decode URL parameters.',
  },
  '/developer-tools/uuid-generator': {
    title: 'UUID Generator',
    description: 'Generate random UUIDs (v4).',
  },
  '/developer-tools/unix-timestamp': {
    title: 'Unix Timestamp',
    description: 'Convert between Unix timestamp and human-readable date.',
  },
  '/developer-tools/regex-tester': {
    title: 'Regex Tester',
    description: 'Test regular expressions with sample text.',
  },
  '/developer-tools/jwt-decoder': {
    title: 'JWT Decoder',
    description: 'Decode and inspect JWT tokens.',
  },
  '/developer-tools/hash-generator': {
    title: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes.',
  },
  '/developer-tools/git-history': {
    title: 'Git History Visualizer',
    description: 'View commit history with timeline and links to commits.',
  },
  '/developer-tools/git-commit': {
    title: 'Git Commit',
    description: 'View commit details and file diff.',
  },
  '/developer-tools/git-stats': {
    title: 'Git Commit Stats',
    description: 'Total commits and per-author breakdown.',
  },
  '/developer-tools/git-search': {
    title: 'Git Commit Search',
    description: 'Search commits by author and date range.',
  },
  '/developer-tools/git-file-history': {
    title: 'Git File History',
    description: 'View commits that modified a specific file.',
  },
  '/developer-tools/git-compare': {
    title: 'Git Branch Compare',
    description: 'Compare branches and view commits ahead.',
  },
  '/games': {
    title: 'Games',
    description: 'Play browser games and offline HTML games. Save progress and favorite games.',
  },
  '/login': {
    title: 'Login',
    description: 'Log in to your AdenMGB account.',
  },
  '/signup': {
    title: 'Sign Up',
    description: 'Create an AdenMGB account.',
  },
  '/account': {
    title: 'Account',
    description: 'Manage your account settings.',
  },
  '/admin': {
    title: 'Admin',
    description: 'Admin dashboard.',
  },
  '/reset-password': {
    title: 'Reset Password',
    description: 'Reset your password.',
  },
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function injectMeta(html: string, meta: PageMeta, canonical: string): string {
  const title = meta.title.includes(' | ') ? meta.title : `${meta.title} | ${SITE_NAME}`
  const description = escapeHtml(meta.description)
  const image = meta.image?.startsWith('http')
    ? meta.image
    : `${SITE_URL}${meta.image?.startsWith('/') ? '' : '/'}${meta.image || '/og-image.png'}`

  let result = html

  result = result.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
  result = result.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}">`)

  const ogTags = [
    ['og:title', escapeHtml(title)],
    ['og:description', description],
    ['og:image', escapeHtml(image)],
    ['og:url', escapeHtml(canonical)],
  ] as const

  for (const [prop, content] of ogTags) {
    const re = new RegExp(`<meta\\s+property="${prop}"\\s+content="[^"]*"\\s*\\/?>`, 'i')
    if (re.test(result)) {
      result = result.replace(re, `<meta property="${prop}" content="${content}">`)
    } else {
      result = result.replace('</head>', `  <meta property="${prop}" content="${content}">\n</head>`)
    }
  }

  const twitterTags = [
    ['twitter:title', escapeHtml(title)],
    ['twitter:description', description],
    ['twitter:image', escapeHtml(image)],
  ] as const

  for (const [name, content] of twitterTags) {
    const re = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*\\/?>`, 'i')
    if (re.test(result)) {
      result = result.replace(re, `<meta name="${name}" content="${content}">`)
    } else {
      result = result.replace('</head>', `  <meta name="${name}" content="${content}">\n</head>`)
    }
  }

  const canonicalRe = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/
  if (canonicalRe.test(result)) {
    result = result.replace(canonicalRe, `<link rel="canonical" href="${escapeHtml(canonical)}">`)
  } else {
    result = result.replace('</head>', `  <link rel="canonical" href="${escapeHtml(canonical)}">\n</head>`)
  }

  return result
}

const CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|Discordbot|Slackbot|LinkedInBot|WhatsApp|TelegramBot|Pinterest|Googlebot|bingbot/i

function isCrawler(userAgent: string | undefined): boolean {
  return !!(userAgent && CRAWLER_UA.test(userAgent))
}

async function getIndexHtmlPath(): Promise<string> {
  const distPath = join(process.cwd(), 'dist', 'index.html')
  const rootPath = join(process.cwd(), 'index.html')
  if (existsSync(distPath)) return distPath
  if (existsSync(rootPath)) return rootPath
  return distPath
}

async function metaHandler(
  request: FastifyRequest<{ Querystring: Record<string, string> }>,
  reply: FastifyReply,
  fastify: FastifyInstance,
) {
  if (!isCrawler(request.headers['user-agent'])) {
    return reply.code(404).send()
  }

  const path = request.url.split('?')[0] || '/'
  if (path.startsWith('/api') || path.startsWith('/og-image') || path === '/sitemap.xml' || path === '/robots.txt') {
    return reply.code(404).send()
  }

  const pathOnly = path.replace(/\/$/, '') || '/'
  const query = request.query as Record<string, string>

  let meta: PageMeta

  if (pathOnly === '/developer-tools/git-commit' && query.url && query.sha) {
    const commit = await fetchCommit(query.url, query.sha)
    if (commit) {
      const commitObj = commit.commit as Record<string, unknown> | undefined
      const msg = (commitObj?.message as string) || ''
      const firstLine = msg.split('\n')[0]?.trim() || 'Commit'
      const author = (commitObj?.author as Record<string, unknown>)?.name as string
      const authorLogin = (commit.author as Record<string, unknown>)?.login as string
      const authorName = author || authorLogin || 'Unknown'
      const shortSha = ((commit.sha as string) || '').slice(0, 7)
      const files = (commit.files as Record<string, unknown>[]) || []
      const totalAdd = (commit.stats as Record<string, number>)?.additions ?? files.reduce((s, f) => s + ((f.additions as number) || 0), 0)
      const totalDel = (commit.stats as Record<string, number>)?.deletions ?? files.reduce((s, f) => s + ((f.deletions as number) || 0), 0)
      const fileNames = files.map((f) => (f.filename as string) || (f.new_path as string) || 'unknown').slice(0, 5)
      const fileList = fileNames.join(', ')
      const desc = `${authorName} · ${shortSha} · +${totalAdd} −${totalDel} · ${files.length} file${files.length !== 1 ? 's' : ''}`
      meta = {
        title: `Commit ${shortSha}`,
        description: `${firstLine} — ${desc}${fileList ? ` — ${fileList}` : ''}`,
        image: `${SITE_URL}/og-image/commit?url=${encodeURIComponent(query.url)}&sha=${encodeURIComponent(query.sha)}`,
      }
    } else {
      meta = STATIC_ROUTE_META['/developer-tools/git-commit'] ?? {
        title: 'Git Commit',
        description: 'View commit details and file diff.',
      }
    }
  } else if (pathOnly.startsWith('/games/') && pathOnly !== '/games') {
    const gameId = pathOnly.replace('/games/', '')
    const gameName = gameId
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    meta = {
      title: `${gameName} - Game`,
      description: `Play ${gameName} in your browser. Save progress and favorite.`,
    }
  } else {
    meta = STATIC_ROUTE_META[pathOnly] ?? {
      title: SITE_NAME,
      description: 'Open source developer & creative technologist. Portfolio of projects, games, and contact.',
    }
  }

  const canonical = `${SITE_URL}${pathOnly}${request.url.includes('?') ? '?' + request.url.split('?')[1] : ''}`

  try {
    const indexPath = await getIndexHtmlPath()
    let html = await readFile(indexPath, 'utf-8')
    html = injectMeta(html, meta, canonical)

    reply.header('Content-Type', 'text/html; charset=utf-8')
    return reply.send(html)
  } catch (err) {
    fastify.log.error(err, 'Failed to read index.html for meta injection')
    return reply.code(500).send('Internal Server Error')
  }
}

export async function metaRoutes(fastify: FastifyInstance) {
  const handler = async (
    request: FastifyRequest<{ Querystring: Record<string, string> }>,
    reply: FastifyReply,
  ) => metaHandler(request, reply, fastify)

  fastify.get('/', handler)
  fastify.get('/*', handler)
}
