import type { Project, ProjectInput } from '../types'

export interface SmartText {
  title: string
  heading: string
  client: string
  stage: string
  industry: string
  timeline: string
  category: string
  tags: string[]
  caption: string
  quote: string
  author: string
  authorRole: string
  aboutLead: string
  about: string[]
  challengeLead: string
  challengeIntro: string
  challengePoints: { title: string; text: string }[]
  brandingLead: string
  branding: string[]
}

export interface SmartJob {
  status: 'running' | 'done' | 'error'
  step: 'read' | 'design' | 'render' | 'save'
  done: number
  total: number
  error: string
  result: {
    text: SmartText
    sections: { url: string; background: string; title: string }[]
    cover: string
    skipped: number
  } | null
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status)
  return body as T
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: data === undefined ? undefined : JSON.stringify(data),
})

export const api = {
  listProjects: () => request<Project[]>('/api/projects'),
  createProject: (data: ProjectInput) => request<Project>('/api/projects', json('POST', data)),
  updateProject: (slug: string, data: ProjectInput) =>
    request<Project>(`/api/projects/${encodeURIComponent(slug)}`, json('PUT', data)),
  deleteProject: (slug: string) =>
    request<{ ok: true }>(`/api/projects/${encodeURIComponent(slug)}`, json('DELETE')),
  login: (email: string, password: string) =>
    request<{ email: string }>('/api/auth/login', json('POST', { email, password })),
  logout: () => request<{ ok: true }>('/api/auth/logout', json('POST')),
  me: () => request<{ email: string }>('/api/auth/me'),
  smartStatus: () => request<{ configured: boolean; renderer: boolean }>('/api/smart-create/status'),
  smartStart: (file: File, notes: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('notes', notes)
    return request<{ jobId: string }>('/api/smart-create/start', { method: 'POST', body: form })
  },
  smartJob: (id: string) => request<SmartJob>(`/api/smart-create/jobs/${encodeURIComponent(id)}`),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ url: string }>('/api/uploads', { method: 'POST', body: form })
  },
}
