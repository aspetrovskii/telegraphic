import type { Project, Theme, TotalSettings, Record as ChatRecord } from '@telegraphic/shared'

export type User = { id: string; email: string }

export type ProjectSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  thumbnailDataUrl: string | null
}

export type ProjectDetail = Project & {
  thumbnailDataUrl: string | null
}

export type ShareLink = {
  id: string
  projectId: string
  slug: string
  urlPath: string
  createdAt: string
  revokedAt: string | null
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  })
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `HTTP ${res.status}`
    throw new ApiError(res.status, message, data)
  }
  return data as T
}

export const api = {
  me: () => request<{ user: User } | { user: null }>('/api/auth/me'),
  signup: (email: string, password: string) =>
    request<{ user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  signin: (email: string, password: string) =>
    request<{ user: User }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  signout: () => request<{ ok: true }>('/api/auth/signout', { method: 'POST' }),

  listProjects: (q = '', sort: 'updatedAt' | 'title' = 'updatedAt') =>
    request<{ projects: ProjectSummary[] }>(
      `/api/projects?q=${encodeURIComponent(q)}&sort=${sort}&order=desc`,
    ),
  createProject: (body: {
    title: string
    ticks?: string[]
    records?: ChatRecord[]
    settings?: TotalSettings
    theme?: Theme
    thumbnailDataUrl?: string | null
  }) =>
    request<{ project: ProjectDetail }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getProject: (id: string) => request<{ project: ProjectDetail }>(`/api/projects/${id}`),
  updateProject: (
    id: string,
    body: Partial<{
      title: string
      ticks: string[]
      records: ChatRecord[]
      settings: TotalSettings
      theme: Theme
      thumbnailDataUrl: string | null
    }>,
  ) =>
    request<{ project: ProjectDetail }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteProject: (id: string) => request<{ ok: true }>(`/api/projects/${id}`, { method: 'DELETE' }),
  duplicateProject: (id: string) =>
    request<{ project: ProjectDetail }>(`/api/projects/${id}/duplicate`, {
      method: 'POST',
    }),

  listShares: (projectId: string) =>
    request<{ links: ShareLink[] }>(`/api/projects/${projectId}/shares`),
  createShare: (projectId: string) =>
    request<{ link: ShareLink }>(`/api/projects/${projectId}/shares`, {
      method: 'POST',
    }),
  revokeShare: (shareId: string) =>
    request<{ ok: true }>(`/api/shares/${shareId}/revoke`, { method: 'POST' }),
  /** Public view-only payload for `/p/:slug` (no auth). */
  getPublicProject: (slug: string) =>
    request<{ project: ProjectDetail }>(`/api/p/${encodeURIComponent(slug)}`),
}
