import { serve } from '@hono/node-server'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createApp } from './app.js'
import { resolveDatabaseConfig } from './db/client.js'

const port = Number(process.env.PORT ?? 8787)

async function main() {
  const config = resolveDatabaseConfig()
  if (config.url?.startsWith('file:') && !config.url.includes(':memory:')) {
    const filePath = config.url.replace(/^file:/, '')
    if (filePath && !filePath.startsWith(':')) {
      await mkdir(path.dirname(path.resolve(filePath)), { recursive: true })
    }
  }

  const app = await createApp({ dbOptions: config })
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`API listening on http://localhost:${info.port}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
