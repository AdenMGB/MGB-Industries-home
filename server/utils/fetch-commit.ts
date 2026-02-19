import { parseGitUrl } from './git-url.js'

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

function normalizeRepoUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export async function fetchCommit(url: string, sha: string): Promise<Record<string, unknown> | null> {
  const normalizedUrl = normalizeRepoUrl(url)
  const parsed = parseGitUrl(normalizedUrl)
  if (!parsed || !sha) return null

  try {
    if (parsed.provider === 'github') {
      const res = await fetch(
        `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/commits/${encodeURIComponent(sha)}`,
        { headers: buildHeaders('github') },
      )
      if (!res.ok) return null
      return (await res.json()) as Record<string, unknown>
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
      if (!commitRes.ok) return null
      const commitData = (await commitRes.json()) as Record<string, unknown>
      const diffData = (await diffRes.json()) as Record<string, unknown>[]
      const files = Array.isArray(diffData)
        ? diffData.map((d) => {
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
            }
          })
        : []
      return { ...commitData, files }
    }
  } catch {
    return null
  }
}
