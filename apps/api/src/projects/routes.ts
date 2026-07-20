import { Hono } from 'hono'
import type { AuthEnv } from '../auth/routes.js'
import { newId } from '../auth/session.js'
import {
  assertPayloadSize,
  defaultProjectPayload,
  MAX_PROJECT_PAYLOAD_BYTES,
  projectBodySchema,
  projectListQuerySchema,
  projectPatchSchema,
  rowToProject,
  rowToSummary,
  type ProjectRow,
} from './schema.js'

function requireUser(c: { get: (k: 'user') => AuthEnv['Variables']['user'] }) {
  const user = c.get('user')
  if (!user) {
    return null
  }
  return user
}

function mapRow(raw: Record<string, unknown>): ProjectRow {
  return {
    id: String(raw.id),
    owner_id: String(raw.owner_id),
    title: String(raw.title),
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    ticks_json: String(raw.ticks_json),
    records_json: String(raw.records_json),
    settings_json: String(raw.settings_json),
    theme_json: String(raw.theme_json),
    thumbnail_data_url: raw.thumbnail_data_url == null ? null : String(raw.thumbnail_data_url),
  }
}

export function createProjectRoutes() {
  const routes = new Hono<AuthEnv>()

  routes.get('/', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const query = projectListQuerySchema.safeParse({
      q: c.req.query('q') ?? '',
      sort: c.req.query('sort') ?? 'updatedAt',
      order: c.req.query('order') ?? 'desc',
    })
    if (!query.success) {
      return c.json({ error: 'Invalid query', details: query.error.flatten() }, 400)
    }

    const { q, sort, order } = query.data
    const sortCol = sort === 'title' ? 'title' : 'updated_at'
    const orderSql = order === 'asc' ? 'ASC' : 'DESC'
    const like = `%${q.trim()}%`

    const result = await c.get('db').execute({
      sql: `SELECT * FROM projects
            WHERE owner_id = ?
              AND (? = '%%' OR title LIKE ? COLLATE NOCASE)
            ORDER BY ${sortCol} ${orderSql}`,
      args: [user.id, like, like],
    })

    const projects = result.rows.map((r) =>
      rowToSummary(mapRow(r as unknown as Record<string, unknown>)),
    )
    return c.json({ projects })
  })

  routes.post('/', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const raw = await c.req.text()
    try {
      assertPayloadSize(raw)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Payload too large' }, 413)
    }

    let json: unknown
    try {
      json = raw ? JSON.parse(raw) : {}
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400)
    }

    const defaults = defaultProjectPayload()
    const parsed = projectBodySchema.safeParse({ ...defaults, ...(json as object) })
    if (!parsed.success) {
      return c.json({ error: 'Invalid project', details: parsed.error.flatten() }, 400)
    }

    const id = newId()
    const now = new Date().toISOString()
    const body = parsed.data
    const settings = body.settings ?? defaults.settings
    const theme = body.theme ?? defaults.theme

    await c.get('db').execute({
      sql: `INSERT INTO projects
            (id, owner_id, title, created_at, updated_at, ticks_json, records_json, settings_json, theme_json, thumbnail_data_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        user.id,
        body.title,
        now,
        now,
        JSON.stringify(body.ticks),
        JSON.stringify(body.records),
        JSON.stringify(settings),
        JSON.stringify(theme),
        body.thumbnailDataUrl ?? null,
      ],
    })

    const created = await c.get('db').execute({
      sql: `SELECT * FROM projects WHERE id = ? LIMIT 1`,
      args: [id],
    })
    const row = mapRow(created.rows[0] as unknown as Record<string, unknown>)
    return c.json({ project: rowToProject(row) }, 201)
  })

  routes.get('/:id', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')

    const result = await c.get('db').execute({
      sql: `SELECT * FROM projects WHERE id = ? AND owner_id = ? LIMIT 1`,
      args: [id, user.id],
    })
    if (!result.rows[0]) {
      return c.json({ error: 'Not found' }, 404)
    }
    return c.json({
      project: rowToProject(mapRow(result.rows[0] as unknown as Record<string, unknown>)),
    })
  })

  routes.patch('/:id', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')

    const raw = await c.req.text()
    try {
      assertPayloadSize(raw)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Payload too large' }, 413)
    }

    let json: unknown
    try {
      json = raw ? JSON.parse(raw) : {}
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400)
    }

    const parsed = projectPatchSchema.safeParse(json)
    if (!parsed.success) {
      return c.json({ error: 'Invalid project', details: parsed.error.flatten() }, 400)
    }

    const existing = await c.get('db').execute({
      sql: `SELECT * FROM projects WHERE id = ? AND owner_id = ? LIMIT 1`,
      args: [id, user.id],
    })
    if (!existing.rows[0]) {
      return c.json({ error: 'Not found' }, 404)
    }
    const row = mapRow(existing.rows[0] as unknown as Record<string, unknown>)
    const current = rowToProject(row)
    const patch = parsed.data
    const now = new Date().toISOString()

    const next = {
      title: patch.title ?? current.title,
      ticks: patch.ticks ?? current.ticks,
      records: patch.records ?? current.records,
      settings: patch.settings ?? current.settings,
      theme: patch.theme ?? current.theme,
      thumbnailDataUrl:
        patch.thumbnailDataUrl !== undefined ? patch.thumbnailDataUrl : current.thumbnailDataUrl,
    }

    await c.get('db').execute({
      sql: `UPDATE projects SET
              title = ?, updated_at = ?, ticks_json = ?, records_json = ?,
              settings_json = ?, theme_json = ?, thumbnail_data_url = ?
            WHERE id = ? AND owner_id = ?`,
      args: [
        next.title,
        now,
        JSON.stringify(next.ticks),
        JSON.stringify(next.records),
        JSON.stringify(next.settings),
        JSON.stringify(next.theme),
        next.thumbnailDataUrl,
        id,
        user.id,
      ],
    })

    const updated = await c.get('db').execute({
      sql: `SELECT * FROM projects WHERE id = ? LIMIT 1`,
      args: [id],
    })
    return c.json({
      project: rowToProject(mapRow(updated.rows[0] as unknown as Record<string, unknown>)),
    })
  })

  routes.delete('/:id', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')

    const result = await c.get('db').execute({
      sql: `DELETE FROM projects WHERE id = ? AND owner_id = ?`,
      args: [id, user.id],
    })
    if (result.rowsAffected === 0) {
      return c.json({ error: 'Not found' }, 404)
    }
    return c.json({ ok: true })
  })

  routes.post('/:id/duplicate', async (c) => {
    const user = requireUser(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')

    const existing = await c.get('db').execute({
      sql: `SELECT * FROM projects WHERE id = ? AND owner_id = ? LIMIT 1`,
      args: [id, user.id],
    })
    if (!existing.rows[0]) {
      return c.json({ error: 'Not found' }, 404)
    }
    const row = mapRow(existing.rows[0] as unknown as Record<string, unknown>)
    const newProjectId = newId()
    const now = new Date().toISOString()
    const title = `${row.title} (copy)`

    await c.get('db').execute({
      sql: `INSERT INTO projects
            (id, owner_id, title, created_at, updated_at, ticks_json, records_json, settings_json, theme_json, thumbnail_data_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newProjectId,
        user.id,
        title,
        now,
        now,
        row.ticks_json,
        row.records_json,
        row.settings_json,
        row.theme_json,
        row.thumbnail_data_url,
      ],
    })

    const created = await c.get('db').execute({
      sql: `SELECT * FROM projects WHERE id = ? LIMIT 1`,
      args: [newProjectId],
    })
    return c.json(
      { project: rowToProject(mapRow(created.rows[0] as unknown as Record<string, unknown>)) },
      201,
    )
  })

  return routes
}

export { MAX_PROJECT_PAYLOAD_BYTES }
