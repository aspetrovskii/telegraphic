import { describe, expect, it, beforeAll, beforeEach } from 'vitest'
import { createApp } from './app.js'
import { createDb } from './db/client.js'
import { MAX_PROJECT_PAYLOAD_BYTES } from './projects/schema.js'
import type { Hono } from 'hono'
import type { AuthEnv } from './auth/routes.js'

type UserBody = { user: { id: string; email: string } }
type ProjectBody = {
  project: {
    id: string
    title: string
    ticks: unknown[]
    records: unknown[]
    theme: unknown
    settings: unknown
    ownerId?: string
  }
}
type ProjectsBody = { projects: Array<{ title: string }> }
type LinkBody = { link: { id: string; slug: string; urlPath: string } }
type LinksBody = { links: unknown[] }
type PublicBody = {
  project: { title: string; ownerId?: string; records: Array<{ counts: number[] }> }
}

function cookieHeader(res: Response): string | null {
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof anyHeaders.getSetCookie === 'function') {
    const parts = anyHeaders.getSetCookie()
    if (parts.length) {
      return parts.map((c) => c.split(';')[0] ?? c).join('; ')
    }
  }
  const single = res.headers.get('set-cookie')
  if (!single) return null
  return single
    .split(',')
    .map((c) => c.split(';')[0]?.trim() ?? '')
    .filter(Boolean)
    .join('; ')
}

describe('api integration', () => {
  let app: Hono<AuthEnv>
  let jar: string

  beforeAll(async () => {
    const db = await createDb({ url: 'file::memory:' })
    app = await createApp({ db })
  })

  beforeEach(() => {
    jar = ''
  })

  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    if (jar) headers.set('cookie', jar)
    if (init.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    const res = await app.request(path, { ...init, headers })
    const set = cookieHeader(res)
    if (set) {
      const incoming = set.split('; ').filter(Boolean)
      const map = new Map(
        jar
          .split('; ')
          .filter(Boolean)
          .map((c) => {
            const i = c.indexOf('=')
            return [c.slice(0, i), c.slice(i + 1)] as const
          }),
      )
      for (const c of incoming) {
        const i = c.indexOf('=')
        const name = c.slice(0, i)
        const value = c.slice(i + 1)
        if (value === '' || value === 'deleted') map.delete(name)
        else map.set(name, value)
      }
      jar = [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    }
    return res
  }

  it('returns ok from /api/health', async () => {
    const res = await request('/api/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      ok: true,
      service: 'telegraphic-api',
      shared: { ok: true, package: '@telegraphic/shared' },
    })
  })

  it('signs up, signs in, and returns the current user', async () => {
    const email = `user-${Date.now()}@example.com`
    const password = 'password123'

    const signup = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    expect(signup.status).toBe(201)
    const signupBody = (await signup.json()) as UserBody
    expect(signupBody.user.email).toBe(email)
    expect(jar).toContain('tg_session=')

    const me = await request('/api/auth/me')
    expect(me.status).toBe(200)
    expect(((await me.json()) as UserBody).user.email).toBe(email)

    await request('/api/auth/signout', { method: 'POST' })
    const meAfter = await request('/api/auth/me')
    expect(meAfter.status).toBe(401)

    const signin = await request('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    expect(signin.status).toBe(200)
    expect((await request('/api/auth/me')).status).toBe(200)
  })

  it('rejects duplicate signup and bad credentials', async () => {
    const email = `dup-${Date.now()}@example.com`
    const password = 'password123'
    expect(
      (
        await request('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
      ).status,
    ).toBe(201)

    jar = ''
    const dup = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    expect(dup.status).toBe(409)

    const bad = await request('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'wrong-password' }),
    })
    expect(bad.status).toBe(401)
  })

  it('CRUD projects: create, list, rename, duplicate, delete; search works', async () => {
    const email = `proj-${Date.now()}@example.com`
    await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'password123' }),
    })

    const create = await request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title: 'My first rating' }),
    })
    expect(create.status).toBe(201)
    const created = (await create.json()) as ProjectBody
    expect(created.project.title).toBe('My first rating')
    expect(created.project.ticks).toEqual([])
    expect(created.project.records).toEqual([])
    expect(created.project.theme).toBeTruthy()
    expect(created.project.settings).toBeTruthy()
    const id = created.project.id

    await request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title: 'Other chat race' }),
    })

    const list = await request('/api/projects?q=first')
    expect(list.status).toBe(200)
    const listed = (await list.json()) as ProjectsBody
    expect(listed.projects).toHaveLength(1)
    expect(listed.projects[0]?.title).toBe('My first rating')

    const rename = await request(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Renamed rating' }),
    })
    expect(rename.status).toBe(200)
    expect(((await rename.json()) as ProjectBody).project.title).toBe('Renamed rating')

    const dup = await request(`/api/projects/${id}/duplicate`, { method: 'POST' })
    expect(dup.status).toBe(201)
    expect(((await dup.json()) as ProjectBody).project.title).toBe('Renamed rating (copy)')

    const del = await request(`/api/projects/${id}`, { method: 'DELETE' })
    expect(del.status).toBe(200)
    expect((await request(`/api/projects/${id}`)).status).toBe(404)
  })

  it('rejects oversized project payloads', async () => {
    const email = `big-${Date.now()}@example.com`
    await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'password123' }),
    })

    const huge = 'x'.repeat(MAX_PROJECT_PAYLOAD_BYTES + 100)
    const res = await request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title: 'Huge', thumbnailDataUrl: `data:text/plain,${huge}` }),
    })
    expect(res.status).toBe(413)
  })

  it('creates, lists, and revokes share links; public slug returns project', async () => {
    const email = `share-${Date.now()}@example.com`
    await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'password123' }),
    })

    const create = await request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Shared rating',
        ticks: ['2024-01-01', '2024-01-02'],
        records: [
          {
            id: 'r1',
            title: 'Chat A',
            sourceChatTitle: 'Chat A',
            visible: true,
            counts: [1, 2],
          },
        ],
      }),
    })
    const projectId = ((await create.json()) as ProjectBody).project.id

    const make = await request(`/api/projects/${projectId}/shares`, { method: 'POST' })
    expect(make.status).toBe(201)
    const link = ((await make.json()) as LinkBody).link
    expect(link.slug.length).toBeGreaterThanOrEqual(24)
    expect(link.urlPath).toBe(`/p/${link.slug}`)

    const listed = await request(`/api/projects/${projectId}/shares`)
    expect(((await listed.json()) as LinksBody).links).toHaveLength(1)

    const savedJar = jar
    jar = ''
    const pub = await request(`/api/p/${link.slug}`)
    expect(pub.status).toBe(200)
    const pubBody = (await pub.json()) as PublicBody
    expect(pubBody.project.title).toBe('Shared rating')
    expect(pubBody.project.ownerId).toBeUndefined()
    expect(pubBody.project.records[0]?.counts).toEqual([1, 2])

    jar = savedJar
    const revoke = await request(`/api/shares/${link.id}/revoke`, { method: 'POST' })
    expect(revoke.status).toBe(200)

    jar = ''
    expect((await request(`/api/p/${link.slug}`)).status).toBe(404)
  })

  it('never requires raw message fields on project save', async () => {
    const email = `privacy-${Date.now()}@example.com`
    await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'password123' }),
    })

    const res = await request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Aggregates only',
        ticks: ['2024-06-01'],
        records: [
          {
            id: 'r1',
            title: 'Friends',
            sourceChatTitle: 'Friends',
            visible: true,
            counts: [10],
          },
        ],
      }),
    })
    expect(res.status).toBe(201)
    const project = ((await res.json()) as ProjectBody).project
    expect(JSON.stringify(project)).not.toMatch(/rawMessages|message_text|"text":/)
  })
})
