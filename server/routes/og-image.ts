import type { FastifyInstance } from 'fastify'
import satori from 'satori'
import { html } from 'satori-html'
import { Resvg } from '@resvg/resvg-js'
import { fetchCommit } from '../utils/fetch-commit.js'

const SITE_NAME = 'AdenMGB'

const OG_WIDTH = 1200

// Website pastel palette (from tailwind.config.js)
const COLORS = {
  cream: '#FFF8E7',
  softBlue: '#B5E5E8',
  lavender: '#C8A8E9',
  mint: '#A8E6CF',
  peach: '#FFB5A7',
  coral: '#FF8C94',
  warmPink: '#FFB6C1',
  softYellow: '#FFD3A5',
  // Dark text for contrast on pastels
  textDark: '#1a1a2e',
  textMuted: '#4a4a6a',
  addGreen: '#0d9488',
  delRed: '#dc2626',
}
const OG_HEIGHT = 630

let fontData: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.0/files/noto-sans-latin-400-normal.woff',
  )
  if (!res.ok) throw new Error('Failed to load font')
  fontData = await res.arrayBuffer()
  return fontData
}

async function renderOgToPng(htmlString: string): Promise<Buffer> {
  const font = await loadFont()
  const element = html(htmlString)
  const svg = await satori(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      {
        name: 'Noto Sans',
        data: font,
        weight: 400,
        style: 'normal',
      },
    ],
  })
  const resvg = new Resvg(svg)
  const pngData = resvg.render()
  return Buffer.from(pngData.asPng())
}

function createDefaultOgHtml(): string {
  return `
    <div style="
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      background: linear-gradient(135deg, ${COLORS.cream} 0%, ${COLORS.peach} 50%, ${COLORS.softYellow} 100%);
      font-family: 'Noto Sans', system-ui, sans-serif;
    ">
      <div style="font-size: 56px; font-weight: 600; color: ${COLORS.textDark}; margin-bottom: 20px;">${SITE_NAME}</div>
      <div style="font-size: 24px; color: ${COLORS.textMuted};">Open Source Developer &amp; Creative Technologist</div>
    </div>
  `
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function createCommitOgHtml(data: {
  shortSha: string
  authorName: string
  dateStr: string
  firstLine: string
  fileList: string
  totalAdd: number
  totalDel: number
  fileCount: number
}): string {
  const { shortSha, authorName, dateStr, firstLine, fileList, totalAdd, totalDel, fileCount } = data
  return `
    <div style="
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: space-between;
      padding: 56px;
      background: linear-gradient(135deg, ${COLORS.cream} 0%, ${COLORS.peach} 50%, ${COLORS.softYellow} 100%);
      font-family: 'Noto Sans', system-ui, sans-serif;
    ">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="font-size: 20px; font-weight: 600; color: ${COLORS.textDark}; letter-spacing: 0.08em;">Commit ${escapeHtml(shortSha)}</div>
        <div style="font-size: 20px; color: ${COLORS.textMuted};">${escapeHtml(authorName)}${dateStr ? ` · ${escapeHtml(dateStr)}` : ''}</div>
      </div>
      <div style="font-size: 36px; font-weight: 700; color: ${COLORS.textDark}; line-height: 1.25; max-width: 100%;">${escapeHtml(firstLine)}</div>
      <div style="display: flex; flex-direction: column; gap: 20px; width: 100%;">
        ${fileList ? `
        <div style="
          padding: 20px 24px;
          background: rgba(255,255,255,0.6);
          border-radius: 12px;
          font-size: 20px;
          color: ${COLORS.textDark};
          font-family: monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border: 1px solid rgba(255,181,167,0.5);
        ">${escapeHtml(fileList)}</div>
        ` : ''}
        <div style="
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: rgba(255,255,255,0.5);
          border-radius: 12px;
          font-size: 32px;
          font-weight: 700;
          border: 1px solid rgba(255,181,167,0.4);
        ">
          <span style="color: ${COLORS.addGreen};">+${totalAdd}</span>
          <span style="color: ${COLORS.delRed};">−${totalDel}</span>
          <span style="color: ${COLORS.textMuted}; font-size: 24px; font-weight: 500;">lines</span>
          <span style="color: ${COLORS.textMuted}; font-size: 24px; font-weight: 500;">·</span>
          <span style="color: ${COLORS.textDark}; font-size: 24px; font-weight: 600;">${fileCount} file${fileCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div style="font-size: 18px; font-weight: 600; color: ${COLORS.textMuted};">${SITE_NAME}</div>
    </div>
  `
}

export async function ogImageRoutes(fastify: FastifyInstance) {
  fastify.get('/og-image/default', async (_request, reply) => {
    try {
      const buffer = await renderOgToPng(createDefaultOgHtml())
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
      const buffer = await renderOgToPng(createDefaultOgHtml())
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

    const commitObj = commit.commit as Record<string, unknown> | undefined
    const msg = (commitObj?.message as string) || ''
    const firstLine = truncate(msg.split('\n')[0]?.trim() || 'Commit', 80)
    const author = (commitObj?.author as Record<string, unknown>)?.name as string
    const authorLogin = (commit.author as Record<string, unknown>)?.login as string
    const authorName = truncate(author || authorLogin || 'Unknown', 40)
    const shortSha = ((commit.sha as string) || '').slice(0, 7)
    const files = (commit.files as Record<string, unknown>[]) || []
    const totalAdd = (commit.stats as Record<string, number>)?.additions ?? files.reduce((s, f) => s + ((f.additions as number) || 0), 0)
    const totalDel = (commit.stats as Record<string, number>)?.deletions ?? files.reduce((s, f) => s + ((f.deletions as number) || 0), 0)
    const fileNames = files.map((f) => (f.filename as string) || (f.new_path as string) || 'unknown').slice(0, 6)
    const fileList = fileNames.join('  ·  ')
    const dateStr = (commitObj?.author as Record<string, unknown>)?.date
      ? new Date((commitObj.author as Record<string, unknown>).date as string).toLocaleDateString()
      : ''

    try {
      const htmlString = createCommitOgHtml({
        shortSha,
        authorName,
        dateStr,
        firstLine,
        fileList,
        totalAdd,
        totalDel,
        fileCount: files.length,
      })
      const buffer = await renderOgToPng(htmlString)
      reply.header('Content-Type', 'image/png')
      reply.header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      return reply.send(buffer)
    } catch (err) {
      fastify.log.error(err, 'Failed to generate OG image')
      return reply.code(500).send({ error: 'Failed to generate image' })
    }
  })
}
