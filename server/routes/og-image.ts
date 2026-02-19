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
  softYellow: '#FFD3A5',
  textDark: '#1a1a2e',
  textMuted: '#4a4a6a',
  addGreen: '#0d9488',
  delRed: '#dc2626',
}

const MAX_FILES_SHOWN = 6

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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.cream}"/>
      <stop offset="50%" stop-color="${COLORS.peach}"/>
      <stop offset="100%" stop-color="${COLORS.softYellow}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="${OG_WIDTH / 2}" y="280" font-family="Inter" font-size="56" font-weight="600" fill="${COLORS.textDark}" text-anchor="middle">${escapeSvg(SITE_NAME)}</text>
  <text x="${OG_WIDTH / 2}" y="340" font-family="Inter" font-size="24" fill="${COLORS.textMuted}" text-anchor="middle">Open Source Developer &amp; Creative Technologist</text>
</svg>`
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
    const dateStr = (commitObj?.author as Record<string, unknown>)?.date
      ? new Date((commitObj.author as Record<string, unknown>).date as string).toLocaleDateString()
      : ''

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
