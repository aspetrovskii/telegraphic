import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { health as sharedHealth } from '@telegraphic/shared/health'

const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal('telegraphic-api'),
  shared: z.object({
    ok: z.literal(true),
    package: z.string(),
  }),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>

export function createApp() {
  const app = new Hono()

  app.use(
    '*',
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    }),
  )

  app.get('/api/health', (c) => {
    const body: HealthResponse = {
      ok: true,
      service: 'telegraphic-api',
      shared: sharedHealth(),
    }
    return c.json(healthResponseSchema.parse(body))
  })

  app.get('/health', (c) => c.redirect('/api/health'))

  return app
}

export const app = createApp()
