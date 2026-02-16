export interface ParsedRepo {
  provider: 'github' | 'gitlab'
  owner: string
  repo: string
}

export function parseGitUrl(url: string): ParsedRepo | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  // Normalize: remove protocol, trailing .git, trailing slash
  let normalized = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')

  // github.com/owner/repo or gitlab.com/owner/repo
  const githubMatch = normalized.match(/^(?:www\.)?github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/)
  if (githubMatch) {
    return {
      provider: 'github',
      owner: githubMatch[1]!,
      repo: githubMatch[2]!,
    }
  }

  const gitlabMatch = normalized.match(/^(?:www\.)?gitlab\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/)
  if (gitlabMatch) {
    return {
      provider: 'gitlab',
      owner: gitlabMatch[1]!,
      repo: gitlabMatch[2]!.replace(/\.git$/, ''),
    }
  }

  return null
}
