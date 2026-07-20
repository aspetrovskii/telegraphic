import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api, type ProjectDetail } from '../api/client'
import { useAuthStore } from '../store/auth'

/**
 * Minimal project detail / save surface for Phase 7.
 * Full Figma-like editor lands in Phases 3–6.
 */
export function EditStubPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user, ready } = useAuthStore()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>(
    'loading',
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.getProject(projectId)
        if (cancelled) return
        setProject(res.project)
        setTitle(res.project.title)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, user])

  if (ready && !user) {
    return <Navigate to="/sign-in" replace />
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!projectId) return
    setStatus('saving')
    setError(null)
    try {
      const res = await api.updateProject(projectId, { title: title.trim() || 'Untitled rating' })
      setProject(res.project)
      setTitle(res.project.title)
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setStatus('error')
    }
  }

  return (
    <main className="edit-stub" data-testid="edit-stub">
      <header className="edit-stub-header">
        <Link to="/" className="btn btn-ghost" data-testid="back-home">
          ← Home
        </Link>
        <p className="muted">
          Editor chrome arrives in later phases — you can save the title here.
        </p>
      </header>
      {status === 'loading' ? <p className="muted">Loading…</p> : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {project ? (
        <form className="edit-stub-form" onSubmit={(e) => void onSave(e)}>
          <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="edit-title"
            />
          </label>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === 'saving'}
            data-testid="save-project"
          >
            {status === 'saving' ? 'Saving…' : 'Save project'}
          </button>
          {status === 'saved' ? (
            <p className="save-ok" data-testid="save-ok">
              Saved
            </p>
          ) : null}
        </form>
      ) : null}
    </main>
  )
}
