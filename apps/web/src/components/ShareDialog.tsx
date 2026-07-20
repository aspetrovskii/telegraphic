import { useEffect, useState, type MouseEvent } from 'react'
import { api, type ShareLink } from '../api/client'

type Props = {
  projectId: string
  projectTitle: string
  onClose: () => void
}

export function ShareDialog({ projectId, projectTitle, onClose }: Props) {
  const [links, setLinks] = useState<ShareLink[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const res = await api.listShares(projectId)
    setLinks(res.links)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api.listShares(projectId)
        if (!cancelled) setLinks(res.links)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load links')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  async function makeLink() {
    setBusy(true)
    setError(null)
    try {
      await api.createShare(projectId)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    setBusy(true)
    setError(null)
    try {
      await api.revokeShare(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link')
    } finally {
      setBusy(false)
    }
  }

  async function copy(urlPath: string) {
    const url = `${window.location.origin}${urlPath}`
    await navigator.clipboard.writeText(url)
  }

  function onBackdrop(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onBackdrop}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="share-dialog-title"
        data-testid="share-dialog"
      >
        <header className="modal-header">
          <h2 id="share-dialog-title">Share — {projectTitle}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>
        <div className="modal-body">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void makeLink()}
            disabled={busy}
            data-testid="make-link"
          >
            Make a link
          </button>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {links.length === 0 ? (
            <p className="muted">No active links yet.</p>
          ) : (
            <ul className="share-list">
              {links.map((link) => (
                <li key={link.id} className="share-row">
                  <code className="share-slug">{link.urlPath}</code>
                  <span className="muted">{new Date(link.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void copy(link.urlPath)}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-ghost"
                    onClick={() => void revoke(link.id)}
                    disabled={busy}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
