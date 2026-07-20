import type { Client } from '@libsql/client'

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  ticks_json TEXT NOT NULL DEFAULT '[]',
  records_json TEXT NOT NULL DEFAULT '[]',
  settings_json TEXT NOT NULL,
  theme_json TEXT NOT NULL,
  thumbnail_data_url TEXT
);

CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects(owner_id);
CREATE INDEX IF NOT EXISTS projects_owner_updated_idx ON projects(owner_id, updated_at);

CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS share_links_project_id_idx ON share_links(project_id);
CREATE INDEX IF NOT EXISTS share_links_slug_idx ON share_links(slug);
`

export async function migrate(client: Client): Promise<void> {
  await client.executeMultiple(MIGRATIONS)
}
