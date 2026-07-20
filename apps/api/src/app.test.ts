import { describe, expect, it } from 'vitest'
import { app } from './app.js'

describe('api health', () => {
  it('returns ok from /api/health', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      ok: true,
      service: 'telegraphic-api',
      shared: { ok: true, package: '@telegraphic/shared' },
    })
  })
})
