import { createHash, randomBytes } from 'node:crypto'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Db } from '../db/client.js'

export const SESSION_COOKIE = 'tg_session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export type SessionUser = {
  id: string
  email: string
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function newId(): string {
  return randomBytes(16).toString('hex')
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Long unguessable share slug (PRD §2.2 Share). */
export function newShareSlug(): string {
  return randomBytes(24).toString('base64url')
}

export function cookieSecure(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production' || env.COOKIE_SECURE === '1'
}

export async function createSession(
  db: Db,
  userId: string,
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = newSessionToken()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [newId(), userId, hashToken(token), expiresAt.toISOString(), now.toISOString()],
  })
  return { token, expiresAt }
}

export function setSessionCookie(
  c: Context,
  token: string,
  expiresAt: Date,
  env: NodeJS.ProcessEnv = process.env,
): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    secure: cookieSecure(env),
    expires: expiresAt,
  })
}

export function clearSessionCookie(c: Context, env: NodeJS.ProcessEnv = process.env): void {
  deleteCookie(c, SESSION_COOKIE, {
    path: '/',
    secure: cookieSecure(env),
  })
}

export async function destroySession(db: Db, token: string | undefined): Promise<void> {
  if (!token) return
  await db.execute({
    sql: `DELETE FROM sessions WHERE token_hash = ?`,
    args: [hashToken(token)],
  })
}

export async function getSessionUser(
  db: Db,
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null
  const result = await db.execute({
    sql: `SELECT u.id AS id, u.email AS email, s.expires_at AS expires_at
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?
          LIMIT 1`,
    args: [hashToken(token)],
  })
  const row = result.rows[0]
  if (!row) return null
  const expiresAt = String(row.expires_at)
  if (new Date(expiresAt).getTime() <= Date.now()) {
    await destroySession(db, token)
    return null
  }
  return { id: String(row.id), email: String(row.email) }
}

export function readSessionToken(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE)
}
