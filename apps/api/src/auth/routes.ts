import { Hono } from 'hono'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { hashPassword, verifyPassword } from './password.js'
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getSessionUser,
  newId,
  readSessionToken,
  setSessionCookie,
  type SessionUser,
} from './session.js'

export type AuthEnv = {
  Variables: {
    db: Db
    user: SessionUser | null
  }
}

const credentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
})

export function createAuthRoutes() {
  const routes = new Hono<AuthEnv>()

  routes.post('/signup', async (c) => {
    const db = c.get('db')
    const parsed = credentialsSchema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: 'Invalid email or password', details: parsed.error.flatten() }, 400)
    }
    const email = parsed.data.email.trim().toLowerCase()
    const password = parsed.data.password

    const existing = await db.execute({
      sql: `SELECT id FROM users WHERE email = ? LIMIT 1`,
      args: [email],
    })
    if (existing.rows.length > 0) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const userId = newId()
    const passwordHash = await hashPassword(password)
    const now = new Date().toISOString()
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
      args: [userId, email, passwordHash, now],
    })

    const { token, expiresAt } = await createSession(db, userId)
    setSessionCookie(c, token, expiresAt)
    return c.json({ user: { id: userId, email } }, 201)
  })

  routes.post('/signin', async (c) => {
    const db = c.get('db')
    const parsed = credentialsSchema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: 'Invalid email or password', details: parsed.error.flatten() }, 400)
    }
    const email = parsed.data.email.trim().toLowerCase()
    const password = parsed.data.password

    const result = await db.execute({
      sql: `SELECT id, password_hash FROM users WHERE email = ? LIMIT 1`,
      args: [email],
    })
    const row = result.rows[0]
    if (!row) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }
    const ok = await verifyPassword(password, String(row.password_hash))
    if (!ok) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const { token, expiresAt } = await createSession(db, String(row.id))
    setSessionCookie(c, token, expiresAt)
    return c.json({ user: { id: String(row.id), email } })
  })

  routes.post('/signout', async (c) => {
    const db = c.get('db')
    const token = readSessionToken(c)
    await destroySession(db, token)
    clearSessionCookie(c)
    return c.json({ ok: true })
  })

  routes.get('/me', async (c) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ user: null }, 401)
    }
    return c.json({ user })
  })

  return routes
}

export async function loadUserMiddleware(
  db: Db,
  token: string | undefined,
): Promise<SessionUser | null> {
  return getSessionUser(db, token)
}
