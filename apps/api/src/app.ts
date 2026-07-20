import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { health as sharedHealth } from '@telegraphic/shared/health'
import { createAuthRoutes, type AuthEnv } from './auth/routes.js'
import { getSessionUser, readSessionToken } from './auth/session.js'
import { createDb, type Db, type CreateDbOptions } from './db/client.js'
import { createProjectRoutes } from './projects/routes.js'
import { createShareRoutes } from './shares/routes.js'

const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal('telegraphic-api'),
  shared: z.object({
    ok: z.literal(true),
    package: z.string(),
  }),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>

export type CreateAppOptions = {
  db?: Db
  dbOptions?: CreateDbOptions
  corsOrigins?: string[]
}

const DEFAULT_CORS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

export async function createApp(options: CreateAppOptions = {}) {
  const db = options.db ?? (await createDb(options.dbOptions))
  const app = new Hono<AuthEnv>()

  const origins = options.corsOrigins ?? DEFAULT_CORS

  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return origins[0]
        if (origins.includes(origin)) return origin
        // Vercel preview / production frontends share the same origin as /api.
        if (origin.endsWith('.vercel.app')) return origin
        return origins[0]
      },
      credentials: true,
    }),
  )

  app.use('*', async (c, next) => {
    c.set('db', db)
    const token = readSessionToken(c)
    const user = await getSessionUser(db, token)
    c.set('user', user)
    await next()
  })

  app.get('/api/health', (c) => {
    const body: HealthResponse = {
      ok: true,
      service: 'telegraphic-api',
      shared: sharedHealth(),
    }
    return c.json(healthResponseSchema.parse(body))
  })

  app.get('/health', (c) => c.redirect('/api/health'))

  app.route('/api/auth', createAuthRoutes())
  app.route('/api/projects', createProjectRoutes())
  app.route('/api', createShareRoutes())

  return app
}

/** Eager default app for production entrypoints (lazy-init via promise). */
let defaultAppPromise: Promise<Hono<AuthEnv>> | null = null

export function getApp() {
  if (!defaultAppPromise) {
    defaultAppPromise = createApp()
  }
  return defaultAppPromise
}

/** Test helper: reset the singleton between suites if needed. */
export function resetDefaultApp() {
  defaultAppPromise = null
}
