import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, type ProjectSummary } from '../api/client'
import { ShareDialog } from '../components/ShareDialog'
import { useAuthStore } from '../store/auth'

function formatEdited(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Edited just now'
  if (mins < 60) return `Edited ${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Edited ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 14) return `Edited ${days}d ago`
  return `Edited ${new Date(iso).toLocaleDateString()}`
}

export function HomePage() {
  const { user, ready, signout } = useAuthStore()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'updatedAt' | 'title'>('updatedAt')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [shareProject, setShareProject] = useState<ProjectSummary | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async (q: string, s: 'updatedAt' | 'title') => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listProjects(q, s)
      setProjects(res.projects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const handle = window.setTimeout(() => {
      void load(query, sort)
    }, 150)
    return () => window.clearTimeout(handle)
  }, [user, query, sort, load])

  const empty = useMemo(
    () => !loading && projects.length === 0 && !query.trim(),
    [loading, projects, query],
  )

  if (ready && !user) {
    return <Navigate to="/sign-in" replace />
  }

  async function createProject() {
    setCreating(true)
    setError(null)
    try {
      await api.createProject({ title: 'Untitled rating' })
      await load(query, sort)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  async function duplicate(id: string) {
    setMenuId(null)
    await api.duplicateProject(id)
    await load(query, sort)
  }

  async function remove(id: string) {
    setMenuId(null)
    if (!window.confirm('Delete this rating? This cannot be undone.')) return
    await api.deleteProject(id)
    await load(query, sort)
  }

  async function commitRename(id: string) {
    const title = renameValue.trim()
    setRenamingId(null)
    if (!title) return
    await api.updateProject(id, { title })
    await load(query, sort)
  }

  return (
    <div className="home" data-testid="home-page">
      <header className="home-header">
        <div className="home-header-left">
          <Link to="/" className="home-logo">
            Telegraphic
          </Link>
          <label className="home-search">
            <span className="visually-hidden">Search</span>
            <input
              type="search"
              placeholder="Search ratings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="home-search"
            />
          </label>
        </div>
        <div className="home-header-right">
          <select
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'updatedAt' | 'title')}
            aria-label="Sort projects"
          >
            <option value="updatedAt">Last edited</option>
            <option value="title">Title</option>
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void createProject()}
            disabled={creating}
            data-testid="new-rating"
          >
            New rating
          </button>
          <div className="user-menu">
            <span className="user-email" data-testid="user-email">
              {user?.email}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void signout()}
              data-testid="sign-out"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        {empty ? (
          <div className="home-empty" data-testid="home-empty">
            <h1>Create your first rating</h1>
            <p className="muted">Turn Telegram chat exports into a bar-chart-race video.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void createProject()}
              disabled={creating}
              data-testid="empty-create"
            >
              Create your first rating
            </button>
          </div>
        ) : (
          <ul className="project-grid" data-testid="project-grid">
            {projects.map((p) => (
              <li
                key={p.id}
                className="project-card"
                data-testid="project-card"
                data-project-id={p.id}
              >
                <Link to={`/edit/${p.id}`} className="project-thumb-link">
                  <div className="project-thumb">
                    {p.thumbnailDataUrl ? (
                      <img src={p.thumbnailDataUrl} alt="" />
                    ) : (
                      <div className="project-thumb-placeholder" aria-hidden>
                        <span>No preview</span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="project-card-meta">
                  {renamingId === p.id ? (
                    <input
                      className="rename-input"
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => void commitRename(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitRename(p.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      data-testid="rename-input"
                    />
                  ) : (
                    <Link
                      to={`/edit/${p.id}`}
                      className="project-title"
                      data-testid="project-title"
                    >
                      {p.title}
                    </Link>
                  )}
                  <p className="project-edited muted">{formatEdited(p.updatedAt)}</p>
                  <div className="project-menu-wrap">
                    <button
                      type="button"
                      className="btn btn-ghost project-kebab"
                      aria-label={`Actions for ${p.title}`}
                      aria-expanded={menuId === p.id}
                      onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                      data-testid="project-menu"
                    >
                      ···
                    </button>
                    {menuId === p.id ? (
                      <ul className="project-menu" role="menu">
                        <li>
                          <Link
                            role="menuitem"
                            to={`/edit/${p.id}`}
                            onClick={() => setMenuId(null)}
                          >
                            Open
                          </Link>
                        </li>
                        <li>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuId(null)
                              setRenamingId(p.id)
                              setRenameValue(p.title)
                            }}
                          >
                            Rename
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => void duplicate(p.id)}
                          >
                            Duplicate
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuId(null)
                              setShareProject(p)
                            }}
                          >
                            Share
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            role="menuitem"
                            className="danger"
                            onClick={() => void remove(p.id)}
                          >
                            Delete
                          </button>
                        </li>
                      </ul>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {shareProject ? (
        <ShareDialog
          projectId={shareProject.id}
          projectTitle={shareProject.title}
          onClose={() => setShareProject(null)}
        />
      ) : null}
    </div>
  )
}
