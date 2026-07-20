import { Hono } from 'hono'
import type { AuthEnv } from '../auth/routes.js'
import { newId, newShareSlug } from '../auth/session.js'
import { rowToProject, type ProjectRow } from '../projects/schema.js'

function mapProjectRow(raw: Record<string, unknown>): ProjectRow {
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

export type ShareLinkDto = {
  id: string
  projectId: string
  slug: string
  urlPath: string
  createdAt: string
  revokedAt: string | null
}

function mapShare(raw: Record<string, unknown>): ShareLinkDto {
  const slug = String(raw.slug)
  return {
    id: String(raw.id),
    projectId: String(raw.project_id),
    slug,
    urlPath: `/p/${slug}`,
    createdAt: String(raw.created_at),
    revokedAt: raw.revoked_at == null ? null : String(raw.revoked_at),
  }
}

export function createShareRoutes() {
  const routes = new Hono<AuthEnv>()

  routes.get('/projects/:projectId/shares', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const projectId = c.req.param('projectId')

    const owned = await c.get('db').execute({
      sql: `SELECT id FROM projects WHERE id = ? AND owner_id = ? LIMIT 1`,
      args: [projectId, user.id],
    })
    if (!owned.rows[0]) {
      return c.json({ error: 'Not found' }, 404)
    }

    const result = await c.get('db').execute({
      sql: `SELECT * FROM share_links
            WHERE project_id = ? AND revoked_at IS NULL
            ORDER BY created_at DESC`,
      args: [projectId],
    })
    return c.json({
      links: result.rows.map((r) => mapShare(r as unknown as Record<string, unknown>)),
    })
  })

  routes.post('/projects/:projectId/shares', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const projectId = c.req.param('projectId')

    const owned = await c.get('db').execute({
      sql: `SELECT id FROM projects WHERE id = ? AND owner_id = ? LIMIT 1`,
      args: [projectId, user.id],
    })
    if (!owned.rows[0]) {
      return c.json({ error: 'Not found' }, 404)
    }

    const id = newId()
    const slug = newShareSlug()
    const now = new Date().toISOString()
    await c.get('db').execute({
      sql: `INSERT INTO share_links (id, project_id, slug, created_at, revoked_at)
            VALUES (?, ?, ?, ?, NULL)`,
      args: [id, projectId, slug, now],
    })

    const created = await c.get('db').execute({
      sql: `SELECT * FROM share_links WHERE id = ? LIMIT 1`,
      args: [id],
    })
    return c.json({ link: mapShare(created.rows[0] as unknown as Record<string, unknown>) }, 201)
  })

  routes.post('/shares/:id/revoke', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')

    const result = await c.get('db').execute({
      sql: `SELECT s.id AS id
            FROM share_links s
            JOIN projects p ON p.id = s.project_id
            WHERE s.id = ? AND p.owner_id = ? AND s.revoked_at IS NULL
            LIMIT 1`,
      args: [id, user.id],
    })
    if (!result.rows[0]) {
      return c.json({ error: 'Not found' }, 404)
    }

    const now = new Date().toISOString()
    await c.get('db').execute({
      sql: `UPDATE share_links SET revoked_at = ? WHERE id = ?`,
      args: [now, id],
    })
    return c.json({ ok: true })
  })

  /** Public read for view-only share links (Phase 8 page consumes this). */
  routes.get('/p/:slug', async (c) => {
    const slug = c.req.param('slug')
    const result = await c.get('db').execute({
      sql: `SELECT p.*
            FROM share_links s
            JOIN projects p ON p.id = s.project_id
            WHERE s.slug = ? AND s.revoked_at IS NULL
            LIMIT 1`,
      args: [slug],
    })
    if (!result.rows[0]) {
      return c.json({ error: 'Not found' }, 404)
    }
    const project = rowToProject(
      mapProjectRow(result.rows[0] as unknown as Record<string, unknown>),
    )
    return c.json({
      project: {
        id: project.id,
        title: project.title,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        ticks: project.ticks,
        records: project.records,
        settings: project.settings,
        theme: project.theme,
        thumbnailDataUrl: project.thumbnailDataUrl,
      },
    })
  })

  return routes
}
