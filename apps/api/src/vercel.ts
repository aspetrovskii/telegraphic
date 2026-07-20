import { handle } from 'hono/vercel'
import { getApp } from './app.js'

const appPromise = getApp()

/**
 * Vercel serverless entry. Awaits DB migrate on cold start, then delegates to Hono.
 */
export default async function vercelHandler(request: Request): Promise<Response> {
  const app = await appPromise
  return handle(app)(request)
}
