const API_BASE = import.meta.env.VITE_API_URL || ''

async function gitRequest<T>(endpoint: string): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`)
    const data = await res.json()
    if (!res.ok) {
      return { error: data.error || 'Request failed' }
    }
    return { data: data as T }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' }
  }
}

export interface GitRepoParams {
  page?: number
  per_page?: number
  sha?: string
  author?: string
  path?: string
  since?: string
  until?: string
}

export const gitApi = {
  getRepo(url: string) {
    return gitRequest<Record<string, unknown>>(`/api/git/repo?url=${encodeURIComponent(url)}`)
  },

  getCommits(url: string, params?: GitRepoParams) {
    const search = new URLSearchParams({ url })
    if (params?.page) search.set('page', String(params.page))
    if (params?.per_page) search.set('per_page', String(params.per_page))
    if (params?.sha) search.set('sha', params.sha)
    if (params?.author) search.set('author', params.author)
    if (params?.path) search.set('path', params.path)
    if (params?.since) search.set('since', params.since)
    if (params?.until) search.set('until', params.until)
    return gitRequest<unknown[]>(`/api/git/commits?${search}`)
  },

  getContributors(url: string) {
    return gitRequest<unknown[]>(`/api/git/contributors?url=${encodeURIComponent(url)}`)
  },

  getCompare(url: string, base: string, head: string) {
    const search = new URLSearchParams({ url, base, head })
    return gitRequest<Record<string, unknown>>(`/api/git/compare?${search}`)
  },

  getBranches(url: string) {
    return gitRequest<unknown[]>(`/api/git/branches?url=${encodeURIComponent(url)}`)
  },

  getCommit(url: string, sha: string) {
    return gitRequest<Record<string, unknown>>(
      `/api/git/commit?url=${encodeURIComponent(url)}&sha=${encodeURIComponent(sha)}`,
    )
  },
}
