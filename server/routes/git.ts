import type { FastifyInstance } from 'fastify'
import { parseGitUrl } from '../utils/git-url.js'

const GITHUB_API = 'https://api.github.com'
const GITLAB_API = 'https://gitlab.com/api/v4'

function buildHeaders(provider: 'github' | 'gitlab'): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN
  if (provider === 'github' && token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const gitlabToken = process.env.GITLAB_TOKEN
  if (provider === 'gitlab' && gitlabToken) {
    headers['Authorization'] = `Bearer ${gitlabToken}`
  }
  return headers
}

export async function gitRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: { url: string }
  }>('/api/git/repo', async (request, reply) => {
    const { url } = request.query
    const parsed = parseGitUrl(url)
    if (!parsed) {
      return reply.code(400).send({ error: 'Invalid repo URL. Use github.com/owner/repo or gitlab.com/owner/repo' })
    }

    try {
      if (parsed.provider === 'github') {
        const res = await fetch(`${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}`, {
          headers: buildHeaders('github'),
        })
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: data.message || 'Repo not found' })
        }
        return reply.send(data)
      } else {
        const projectId = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
        const res = await fetch(`${GITLAB_API}/projects/${projectId}`, {
          headers: buildHeaders('gitlab'),
        })
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: data.message || 'Repo not found' })
        }
        return reply.send(data)
      }
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch repo' })
    }
  })

  fastify.get<{
    Querystring: { url: string; page?: string; per_page?: string; sha?: string; author?: string; path?: string; since?: string; until?: string }
  }>('/api/git/commits', async (request, reply) => {
    const { url, page = '1', per_page = '30', sha, author, path, since, until } = request.query
    const parsed = parseGitUrl(url)
    if (!parsed) {
      return reply.code(400).send({ error: 'Invalid repo URL' })
    }

    try {
      if (parsed.provider === 'github') {
        const params = new URLSearchParams({ page, per_page })
        if (sha) params.set('sha', sha)
        if (author) params.set('author', author)
        if (path) params.set('path', path)
        if (since) params.set('since', since)
        if (until) params.set('until', until)
        const res = await fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/commits?${params}`,
          { headers: buildHeaders('github') },
        )
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: Array.isArray(data) ? 'Failed' : (data.message || 'Failed to fetch commits') })
        }
        return reply.send(data)
      } else {
        const projectId = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
        const params = new URLSearchParams({ page, per_page: per_page || '30' })
        if (sha) params.set('ref_name', sha)
        if (author) params.set('author', author)
        if (path) params.set('path', path)
        if (since) params.set('since', since)
        if (until) params.set('until', until)
        const res = await fetch(
          `${GITLAB_API}/projects/${projectId}/repository/commits?${params}`,
          { headers: buildHeaders('gitlab') },
        )
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: Array.isArray(data) ? 'Failed' : (data.message || 'Failed to fetch commits') })
        }
        return reply.send(data)
      }
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch commits' })
    }
  })

  fastify.get<{
    Querystring: { url: string; sha: string }
  }>('/api/git/commit', async (request, reply) => {
    const { url, sha } = request.query
    const parsed = parseGitUrl(url)
    if (!parsed || !sha) {
      return reply.code(400).send({ error: 'Invalid repo URL or missing sha' })
    }

    try {
      if (parsed.provider === 'github') {
        const res = await fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/commits/${encodeURIComponent(sha)}`,
          { headers: buildHeaders('github') },
        )
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: data.message || 'Commit not found' })
        }
        return reply.send(data)
      } else {
        const projectId = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
        const [commitRes, diffRes] = await Promise.all([
          fetch(
            `${GITLAB_API}/projects/${projectId}/repository/commits/${encodeURIComponent(sha)}`,
            { headers: buildHeaders('gitlab') },
          ),
          fetch(
            `${GITLAB_API}/projects/${projectId}/repository/commits/${encodeURIComponent(sha)}/diff`,
            { headers: buildHeaders('gitlab') },
          ),
        ])
        const commitData = await commitRes.json()
        const diffData = await diffRes.json()
        if (!commitRes.ok) {
          return reply.code(commitRes.status).send({ error: commitData.message || 'Commit not found' })
        }
        const files = Array.isArray(diffData)
          ? diffData.map((d: Record<string, unknown>) => {
              const diff = (d.diff as string) || ''
              const additions = diff.split('\n').filter((l: string) => l.startsWith('+') && !l.startsWith('+++')).length
              const deletions = diff.split('\n').filter((l: string) => l.startsWith('-') && !l.startsWith('---')).length
              let status = 'modified'
              if (d.new_file) status = 'added'
              else if (d.deleted_file) status = 'removed'
              else if (d.renamed_file) status = 'renamed'
              return {
                filename: (d.new_path as string) || (d.old_path as string) || 'unknown',
                status,
                additions,
                deletions,
                patch: diff || undefined,
              }
            })
          : []
        return reply.send({ ...commitData, files })
      }
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch commit' })
    }
  })

  fastify.get<{
    Querystring: { url: string }
  }>('/api/git/contributors', async (request, reply) => {
    const { url } = request.query
    const parsed = parseGitUrl(url)
    if (!parsed) {
      return reply.code(400).send({ error: 'Invalid repo URL' })
    }

    try {
      if (parsed.provider === 'github') {
        const res = await fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/contributors?anon=1&per_page=100`,
          { headers: buildHeaders('github') },
        )
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: Array.isArray(data) ? 'Failed' : (data.message || 'Failed to fetch contributors') })
        }
        return reply.send(data)
      } else {
        const projectId = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
        const res = await fetch(
          `${GITLAB_API}/projects/${projectId}/repository/contributors`,
          { headers: buildHeaders('gitlab') },
        )
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: Array.isArray(data) ? 'Failed' : (data.message || 'Failed to fetch contributors') })
        }
        return reply.send(data)
      }
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch contributors' })
    }
  })

  fastify.get<{
    Querystring: { url: string; base: string; head: string }
  }>('/api/git/compare', async (request, reply) => {
    const { url, base, head } = request.query
    const parsed = parseGitUrl(url)
    if (!parsed || !base || !head) {
      return reply.code(400).send({ error: 'Invalid repo URL or missing base/head' })
    }

    try {
      if (parsed.provider === 'github') {
        const res = await fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
          { headers: buildHeaders('github') },
        )
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: data.message || 'Failed to compare' })
        }
        return reply.send(data)
      } else {
        const projectId = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
        const res = await fetch(
          `${GITLAB_API}/projects/${projectId}/repository/compare?from=${encodeURIComponent(base)}&to=${encodeURIComponent(head)}`,
          { headers: buildHeaders('gitlab') },
        )
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: data.message || 'Failed to compare' })
        }
        return reply.send(data)
      }
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to compare branches' })
    }
  })

  fastify.get<{
    Querystring: { url: string }
  }>('/api/git/branches', async (request, reply) => {
    const { url } = request.query
    const parsed = parseGitUrl(url)
    if (!parsed) {
      return reply.code(400).send({ error: 'Invalid repo URL' })
    }

    try {
      if (parsed.provider === 'github') {
        const res = await fetch(
          `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/branches?per_page=100`,
          { headers: buildHeaders('github') },
        )
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: Array.isArray(data) ? 'Failed' : (data.message || 'Failed to fetch branches') })
        }
        return reply.send(data)
      } else {
        const projectId = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
        const res = await fetch(
          `${GITLAB_API}/projects/${projectId}/repository/branches?per_page=100`,
          { headers: buildHeaders('gitlab') },
        )
        const data = await res.json()
        if (!res.ok) {
          return reply.code(res.status).send({ error: Array.isArray(data) ? 'Failed' : (data.message || 'Failed to fetch branches') })
        }
        return reply.send(data)
      }
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ error: 'Failed to fetch branches' })
    }
  })
}
