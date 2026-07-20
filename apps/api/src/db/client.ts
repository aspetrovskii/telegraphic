import { createClient, type Client } from '@libsql/client'
import { migrate } from './migrate.js'

export type Db = Client

export type CreateDbOptions = {
  /** libSQL / Turso URL. Defaults from env or local file. */
  url?: string
  authToken?: string
}

/**
 * SQLite via libSQL locally (`file:…`) and Turso in production.
 * Prefer `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` when set; else `DATABASE_URL` / file.
 */
export function resolveDatabaseConfig(env: NodeJS.ProcessEnv = process.env): CreateDbOptions {
  const tursoUrl = env.TURSO_DATABASE_URL?.trim()
  if (tursoUrl) {
    const authToken = env.TURSO_AUTH_TOKEN?.trim()
    if (authToken) {
      return { url: tursoUrl, authToken }
    }
    return { url: tursoUrl }
  }
  const databaseUrl = env.DATABASE_URL?.trim()
  if (databaseUrl) {
    return { url: databaseUrl }
  }
  return { url: 'file:./data/dev.db' }
}

export async function createDb(options: CreateDbOptions = resolveDatabaseConfig()): Promise<Db> {
  const url = options.url ?? 'file:./data/dev.db'
  const client =
    options.authToken !== undefined
      ? createClient({ url, authToken: options.authToken })
      : createClient({ url })
  await migrate(client)
  return client
}
