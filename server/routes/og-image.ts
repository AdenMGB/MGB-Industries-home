import type { FastifyInstance } from 'fastify'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import { fetchCommit } from '../utils/fetch-commit.js'
import { parseGitUrl } from '../utils/git-url.js'

const SITE_NAME = 'AdenMGB'
const OG_WIDTH = 1200
const OG_HEIGHT = 630

// Resvg requires TTF (WOFF not supported for SVG text). Fetch Inter TTF from CDN.
const FONT_URLS = [
  'https://cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/Inter-Regular.ttf',
  'https://cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/Inter-SemiBold.ttf',
]

// Website pastel palette (from tailwind.config.js)
const COLORS = {
  cream: '#FFF8E7',
  peach: '#FFB5A7',
  coral: '#FF8C94',
  lavender: '#C8A8E9',
  mint: '#A8E6CF',
  softYellow: '#FFD3A5',
  warmPink: '#FFB6C1',
  softBlue: '#B5E5E8',
  textDark: '#1a1a2e',
  textMuted: '#4a4a6a',
  addGreen: '#0d9488',
  delRed: '#dc2626',
}

const MAX_FILES_SHOWN = 6

// Page-specific OG config: path pattern -> { title, chips (for horizontal icon strip) }
const PAGE_OG: Record<string, { title: string; chips: { label: string; color: string }[] }> = {
  '/': { title: 'AdenMGB', chips: [] },
  '/projects': { title: 'Projects', chips: [{ label: 'Code', color: COLORS.peach }, { label: 'Open Source', color: COLORS.lavender }, { label: 'Creative Tech', color: COLORS.mint }] },
  '/about': { title: 'About', chips: [{ label: 'Timeline', color: COLORS.softBlue }, { label: 'Background', color: COLORS.peach }] },
  '/contact': { title: 'Contact', chips: [{ label: 'Message', color: COLORS.mint }, { label: 'Email', color: COLORS.lavender }] },
  '/developer-tools': {
    title: 'Developer Tools',
    chips: [
      { label: '{}', color: COLORS.softBlue },
      { label: '</>', color: COLORS.peach },
      { label: '0x', color: COLORS.lavender },
      { label: '#', color: COLORS.warmPink },
      { label: 'JSON', color: COLORS.softYellow },
      { label: 'Git', color: COLORS.mint },
      { label: '⏱', color: COLORS.coral },
      { label: 'Regex', color: COLORS.lavender },
    ],
  },
  '/developer-tools/ipv4-to-binary': { title: 'IPv4 ↔ Binary', chips: [{ label: 'IPv4', color: COLORS.peach }, { label: 'Binary', color: COLORS.mint }] },
  '/developer-tools/ipv6-to-hex': { title: 'IPv6 ↔ Hex', chips: [{ label: 'IPv6', color: COLORS.lavender }, { label: 'Hex', color: COLORS.mint }] },
  '/developer-tools/number-to-binary': { title: 'Number ↔ Binary', chips: [{ label: 'Decimal', color: COLORS.peach }, { label: 'Binary', color: COLORS.mint }] },
  '/developer-tools/conversion-trainer': { title: 'Conversion Trainer', chips: [{ label: 'Practice', color: COLORS.mint }, { label: 'Quiz', color: COLORS.peach }, { label: 'XP', color: COLORS.softYellow }] },
  '/developer-tools/number-to-hex': { title: 'Number ↔ Hex', chips: [{ label: 'Decimal', color: COLORS.lavender }, { label: 'Hex', color: COLORS.mint }] },
  '/developer-tools/base64': { title: 'Base64', chips: [{ label: 'Encode', color: COLORS.mint }, { label: 'Decode', color: COLORS.peach }] },
  '/developer-tools/json-formatter': { title: 'JSON Formatter', chips: [{ label: 'JSON', color: COLORS.softYellow }, { label: 'Pretty', color: COLORS.mint }] },
  '/developer-tools/color-converter': { title: 'Color Converter', chips: [{ label: 'Hex', color: COLORS.coral }, { label: 'RGB', color: COLORS.mint }, { label: 'HSL', color: COLORS.lavender }] },
  '/developer-tools/diff-checker': { title: 'Diff Checker', chips: [{ label: 'Compare', color: COLORS.mint }, { label: 'Diff', color: COLORS.peach }] },
  '/developer-tools/case-converter': { title: 'Case Converter', chips: [{ label: 'camelCase', color: COLORS.warmPink }, { label: 'snake_case', color: COLORS.lavender }] },
  '/developer-tools/html-encode': { title: 'HTML Encode', chips: [{ label: 'HTML', color: COLORS.softBlue }, { label: 'Entities', color: COLORS.peach }] },
  '/developer-tools/url-encode': { title: 'URL Encode', chips: [{ label: 'URL', color: COLORS.softBlue }, { label: 'Encode', color: COLORS.mint }] },
  '/developer-tools/uuid-generator': { title: 'UUID Generator', chips: [{ label: 'UUID', color: COLORS.warmPink }, { label: 'v4', color: COLORS.lavender }] },
  '/developer-tools/unix-timestamp': { title: 'Unix Timestamp', chips: [{ label: 'Timestamp', color: COLORS.peach }, { label: 'Date', color: COLORS.softBlue }] },
  '/developer-tools/regex-tester': { title: 'Regex Tester', chips: [{ label: 'Regex', color: COLORS.lavender }, { label: 'Test', color: COLORS.mint }] },
  '/developer-tools/jwt-decoder': { title: 'JWT Decoder', chips: [{ label: 'JWT', color: COLORS.softYellow }, { label: 'Decode', color: COLORS.peach }] },
  '/developer-tools/hash-generator': { title: 'Hash Generator', chips: [{ label: 'MD5', color: COLORS.coral }, { label: 'SHA', color: COLORS.mint }] },
  '/developer-tools/git-history': { title: 'Git History', chips: [{ label: 'Commits', color: COLORS.softBlue }, { label: 'Timeline', color: COLORS.lavender }] },
  '/developer-tools/git-commit': { title: 'Git Commit', chips: [{ label: 'Commit', color: COLORS.softBlue }, { label: 'Diff', color: COLORS.peach }] },
  '/developer-tools/git-stats': { title: 'Git Stats', chips: [{ label: 'Stats', color: COLORS.softBlue }, { label: 'Authors', color: COLORS.lavender }] },
  '/developer-tools/git-search': { title: 'Git Search', chips: [{ label: 'Search', color: COLORS.softBlue }, { label: 'Commits', color: COLORS.mint }] },
  '/developer-tools/git-file-history': { title: 'File History', chips: [{ label: 'File', color: COLORS.softBlue }, { label: 'History', color: COLORS.peach }] },
  '/developer-tools/git-compare': { title: 'Branch Compare', chips: [{ label: 'Branches', color: COLORS.softBlue }, { label: 'Compare', color: COLORS.lavender }] },
  '/games': { title: 'Games', chips: [{ label: 'Play', color: COLORS.mint }, { label: 'Browser', color: COLORS.peach }, { label: 'Offline', color: COLORS.lavender }] },
  '/login': { title: 'Login', chips: [{ label: 'Sign in', color: COLORS.mint }] },
  '/signup': { title: 'Sign Up', chips: [{ label: 'Create account', color: COLORS.lavender }] },
  '/account': { title: 'Account', chips: [{ label: 'Settings', color: COLORS.softBlue }] },
  '/admin': { title: 'Admin', chips: [{ label: 'Dashboard', color: COLORS.coral }] },
  '/reset-password': { title: 'Reset Password', chips: [{ label: 'Password', color: COLORS.peach }] },
}

let fontPathsPromise: Promise<string[]> | null = null

async function getFontPaths(): Promise<string[]> {
  if (fontPathsPromise) return fontPathsPromise
  fontPathsPromise = (async () => {
    const fontDir = join(process.cwd(), 'tmp', 'fonts')
    const paths = [
      join(fontDir, 'Inter-Regular.ttf'),
      join(fontDir, 'Inter-SemiBold.ttf'),
    ]
    if (existsSync(paths[0]!)) return paths
    await mkdir(fontDir, { recursive: true })
    for (let i = 0; i < FONT_URLS.length; i++) {
      const res = await fetch(FONT_URLS[i]!)
      if (!res.ok) throw new Error(`Failed to fetch font: ${res.status}`)
      await writeFile(paths[i]!, Buffer.from(await res.arrayBuffer()))
    }
    return paths
  })()
  return fontPathsPromise
}

function escapeSvg(str: string): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncatePath(path: string, maxLen = 55): string {
  if (!path || path.length <= maxLen) return path || ''
  return path.slice(0, maxLen - 3) + '...'
}

async function svgToPng(svg: string): Promise<Buffer> {
  const fontPaths = await getFontPaths()
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_WIDTH },
    background: COLORS.cream,
    font: {
      fontFiles: fontPaths,
      loadSystemFonts: true,
      defaultFontFamily: 'Inter',
      sansSerifFamily: 'Inter',
      serifFamily: 'Inter',
      monospaceFamily: 'Inter',
    },
  })
  const pngData = resvg.render()
  return Buffer.from(pngData.asPng())
}

function buildDefaultSvg(): string {
  return buildPageSvg('/', 'AdenMGB', [])
}

function buildPageSvg(path: string, title: string, chips: { label: string; color: string }[]): string {
  const chipH = 52
  const chipGap = 10
  const chipStartY = 390
  const chipFontSize = 13
  const chipPadding = 14
  const maxChips = 10
  const shownChips = chips.slice(0, maxChips)

  let chipX = 60
  const chipElements = shownChips.map((c) => {
    const labelTrunc = c.label.length > 10 ? c.label.slice(0, 8) + '…' : c.label
    const w = Math.max(60, Math.min(110, labelTrunc.length * 9 + chipPadding * 2))
    const el = `<g transform="translate(${chipX}, ${chipStartY})">
      <rect x="0" y="0" width="${w}" height="${chipH}" rx="10" fill="${c.color}" fill-opacity="0.65" stroke="${c.color}" stroke-width="1.5"/>
      <text x="${w / 2}" y="${chipH / 2 + 4}" font-family="Inter" font-size="${chipFontSize}" font-weight="600" fill="${COLORS.textDark}" text-anchor="middle">${escapeSvg(labelTrunc)}</text>
    </g>`
    chipX += w + chipGap
    return el
  }).join('\n  ')

  const subtitle = path === '/' ? 'Open Source Developer &amp; Creative Technologist' : escapeSvg(SITE_NAME)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.cream}"/>
      <stop offset="50%" stop-color="${COLORS.peach}"/>
      <stop offset="100%" stop-color="${COLORS.softYellow}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.08"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="${OG_WIDTH / 2}" y="280" font-family="Inter" font-size="56" font-weight="600" fill="${COLORS.textDark}" text-anchor="middle">${escapeSvg(title)}</text>
  <text x="${OG_WIDTH / 2}" y="340" font-family="Inter" font-size="24" fill="${COLORS.textMuted}" text-anchor="middle">${subtitle}</text>
  ${chips.length > 0 ? `<g filter="url(#shadow)">${chipElements}</g>` : ''}
</svg>`
}

function getPageOgConfig(path: string): { title: string; chips: { label: string; color: string }[] } {
  const pathNorm = path.replace(/\/$/, '') || '/'
  const exact = PAGE_OG[pathNorm]
  if (exact) return exact

  if (pathNorm.startsWith('/games/') && pathNorm !== '/games') {
    const gameId = pathNorm.replace('/games/', '')
    const gameName = gameId.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    return { title: `${gameName} - Game`, chips: [{ label: 'Play', color: COLORS.mint }, { label: gameName, color: COLORS.peach }] }
  }

  const devToolsMatch = pathNorm.match(/^\/developer-tools\/(.+)$/)
  if (devToolsMatch) {
    const slug = devToolsMatch[1]
    const title = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    return { title: `${title} | Dev Tools`, chips: [{ label: 'Developer Tools', color: COLORS.softBlue }] }
  }

  return { title: SITE_NAME, chips: [] }
}

function buildCommitSvg(data: {
  shortSha: string
  owner: string
  repo: string
  authorName: string
  dateStr: string
  firstLine: string
  fileList: string[]
  totalAdd: number
  totalDel: number
  fileCount: number
}): string {
  const { shortSha, owner, repo, authorName, dateStr, firstLine, fileList, totalAdd, totalDel, fileCount } = data
  const shownFiles = fileList.slice(0, MAX_FILES_SHOWN)
  const moreFiles = fileList.length - MAX_FILES_SHOWN
  const fileBoxH = Math.max(80, 40 + shownFiles.length * 24 + (moreFiles > 0 ? 24 : 0))
  const fileLineY = (i: number) => 40 + i * 24

  const fileLines = shownFiles
    .map(
      (f, i) =>
        `<text x="16" y="${fileLineY(i)}" font-family="Inter" font-size="14" fill="${COLORS.textMuted}">${escapeSvg(truncatePath(f))}</text>`,
    )
    .join('\n  ')
  const moreFilesLine =
    moreFiles > 0
      ? `<text x="16" y="${fileLineY(shownFiles.length)}" font-family="Inter" font-size="14" fill="${COLORS.textMuted}">+${escapeSvg(String(moreFiles))} more</text>`
      : ''

  const firstLineTrunc = firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.cream}"/>
      <stop offset="50%" stop-color="${COLORS.peach}"/>
      <stop offset="100%" stop-color="${COLORS.softYellow}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.1"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="60" y="100" font-family="Inter" font-size="40" font-weight="600" fill="${COLORS.textDark}">Commit ${escapeSvg(shortSha)}</text>
  <text x="60" y="145" font-family="Inter" font-size="26" fill="${COLORS.textMuted}">${escapeSvg(owner)}/${escapeSvg(repo)}</text>
  <text x="1140" y="122" font-family="Inter" font-size="16" fill="${COLORS.textMuted}" text-anchor="end">${escapeSvg(dateStr)}</text>
  <text x="60" y="195" font-family="Inter" font-size="20" fill="${COLORS.textDark}">${escapeSvg(authorName)}</text>
  <text x="60" y="235" font-family="Inter" font-size="28" font-weight="600" fill="${COLORS.textDark}">${escapeSvg(firstLineTrunc)}</text>
  <g transform="translate(60, 280)">
    <rect x="0" y="0" width="520" height="${fileBoxH}" rx="10" fill="rgba(255,255,255,0.6)" filter="url(#shadow)"/>
    <rect x="0" y="0" width="4" height="${fileBoxH}" rx="2" fill="${COLORS.peach}"/>
    ${fileLines}
    ${moreFilesLine}
  </g>
  <g transform="translate(900, 280)">
    <rect x="0" y="0" width="120" height="55" rx="10" fill="rgba(13,148,136,0.2)" filter="url(#shadow)"/>
    <text x="60" y="36" font-family="Inter" font-size="18" font-weight="600" fill="${COLORS.addGreen}" text-anchor="middle">+${escapeSvg(String(totalAdd))}</text>
  </g>
  <g transform="translate(900, 345)">
    <rect x="0" y="0" width="120" height="55" rx="10" fill="rgba(220,38,38,0.2)" filter="url(#shadow)"/>
    <text x="60" y="36" font-family="Inter" font-size="18" font-weight="600" fill="${COLORS.delRed}" text-anchor="middle">−${escapeSvg(String(totalDel))}</text>
  </g>
  <text x="60" y="580" font-family="Inter" font-size="16" fill="${COLORS.textMuted}">${fileCount} file${fileCount !== 1 ? 's' : ''} · ${escapeSvg(SITE_NAME)}</text>
</svg>`
}

export async function ogImageRoutes(fastify: FastifyInstance) {
  fastify.get('/og-image/default', async (_request, reply) => {
    try {
      const svg = buildDefaultSvg()
      const buffer = await svgToPng(svg)
      reply.header('Content-Type', 'image/png')
      reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400')
      return reply.send(buffer)
    } catch (err) {
      fastify.log.error(err, 'Failed to generate default OG image')
      return reply.code(500).send({ error: 'Failed to generate image' })
    }
  })

  fastify.get('/og-image.png', async (_request, reply) => {
    try {
      const svg = buildDefaultSvg()
      const buffer = await svgToPng(svg)
      reply.header('Content-Type', 'image/png')
      reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400')
      return reply.send(buffer)
    } catch (err) {
      fastify.log.error(err, 'Failed to generate default OG image')
      return reply.code(500).send({ error: 'Failed to generate image' })
    }
  })

  fastify.get<{ Querystring: { path?: string } }>('/og-image/page', async (request, reply) => {
    const path = (request.query.path || '/').replace(/\/$/, '') || '/'
    try {
      const config = getPageOgConfig(path)
      const svg = buildPageSvg(path, config.title, config.chips)
      const buffer = await svgToPng(svg)
      reply.header('Content-Type', 'image/png')
      reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400')
      return reply.send(buffer)
    } catch (err) {
      fastify.log.error(err, 'Failed to generate page OG image')
      return reply.code(500).send({ error: 'Failed to generate image' })
    }
  })

  fastify.get<{
    Querystring: { url: string; sha: string }
  }>('/og-image/commit', async (request, reply) => {
    const { url, sha } = request.query
    if (!url || !sha) {
      return reply.code(400).send({ error: 'Missing url or sha' })
    }

    const commit = await fetchCommit(url, sha)
    if (!commit) {
      return reply.code(404).send({ error: 'Commit not found' })
    }

    const parsed = parseGitUrl(url)
    const owner = parsed?.owner ?? 'repo'
    const repo = parsed?.repo ?? 'unknown'

    const commitObj = commit.commit as Record<string, unknown> | undefined
    const msg = (commitObj?.message as string) || ''
    const firstLine = msg.split('\n')[0]?.trim() || 'Commit'
    const author = (commitObj?.author as Record<string, unknown>)?.name as string
    const authorLogin = (commit.author as Record<string, unknown>)?.login as string
    const authorName = author || authorLogin || 'Unknown'
    const shortSha = ((commit.sha as string) || '').slice(0, 7)
    const files = (commit.files as Record<string, unknown>[]) || []
    const totalAdd =
      (commit.stats as Record<string, number>)?.additions ??
      files.reduce((s, f) => s + ((f.additions as number) || 0), 0)
    const totalDel =
      (commit.stats as Record<string, number>)?.deletions ??
      files.reduce((s, f) => s + ((f.deletions as number) || 0), 0)
    const fileNames = files.map((f) => (f.filename as string) || (f.new_path as string) || 'unknown')
    const authorDate = (commitObj?.author as Record<string, unknown> | undefined)?.date
    const dateStr = authorDate ? new Date(authorDate as string).toLocaleDateString() : ''

    try {
      const svg = buildCommitSvg({
        shortSha,
        owner,
        repo,
        authorName,
        dateStr,
        firstLine,
        fileList: fileNames,
        totalAdd,
        totalDel,
        fileCount: files.length,
      })
      const buffer = await svgToPng(svg)
      reply.header('Content-Type', 'image/png')
      reply.header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      return reply.send(buffer)
    } catch (err) {
      fastify.log.error(err, 'Failed to generate OG image')
      return reply.code(500).send({ error: 'Failed to generate image' })
    }
  })
}
