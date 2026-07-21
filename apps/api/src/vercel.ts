import type { IncomingMessage, ServerResponse } from 'node:http'
import { getRequestListener } from '@hono/node-server'
import { getApp } from './app.js'

let listenerPromise: Promise<ReturnType<typeof getRequestListener>> | null = null

function getListener() {
  if (!listenerPromise) {
    listenerPromise = getApp().then((app) => getRequestListener(app.fetch))
  }
  return listenerPromise
}

/**
 * Vercel Node.js serverless entry.
 * Uses the Node request listener so libSQL/Turso works (not Edge).
 * DB/app init is deferred to the first request (needs Turso env on Vercel).
 */
export default async function vercelHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const listener = await getListener()
  await listener(req, res)
}
