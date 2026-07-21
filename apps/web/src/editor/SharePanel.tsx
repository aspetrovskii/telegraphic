import { useEffect, useState } from 'react'
import { ApiError, api, type ShareLink } from '../api/client'
import { exportProjectVideo } from '../export'
import { useEditorStore } from './useEditorStore'

/**
 * Left Share panel — Make a link / Manage links / Download a video.
 * Wired to Phase 7 share API; empty + error states included.
 */
export function SharePanel() {
  const persistable = useEditorStore((s) => s.persistable)
  const project = useEditorStore((s) => s.project)
  const saveStatus = useEditorStore((s) => s.saveStatus)
  const [links, setLinks] = useState<ShareLink[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  async function refresh() {
    const res = await api.listShares(project.id)
    setLinks(res.links)
  }

  useEffect(() => {
    if (!persistable) return
    let cancelled = false
    void (async () => {
      try {
        const res = await api.listShares(project.id)
        if (!cancelled) {
          setLinks(res.links)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load links')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [persistable, project.id])

  async function makeLink() {
    if (!persistable) return
    if (saveStatus === 'dirty' || saveStatus === 'saving' || saveStatus === 'error') {
      setError('Save the project before creating a share link.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.createShare(project.id)
      await refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create link',
      )
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

  async function copy(link: ShareLink) {
    const url = `${window.location.origin}${link.urlPath}`
    await navigator.clipboard.writeText(url)
    setCopiedId(link.id)
    window.setTimeout(() => setCopiedId((cur) => (cur === link.id ? null : cur)), 1500)
  }

  async function downloadVideo() {
    if (exporting) return
    setExporting(true)
    setError(null)
    try {
      await exportProjectVideo(project, {})
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Export failed')
      }
    } finally {
      setExporting(false)
    }
  }

  if (!persistable) {
    return (
      <div className="share-panel" data-testid="share-panel">
        <p className="share-panel__lead muted">
          Share links need a saved project. Open a rating from Home to create view-only links.
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          data-testid="share-download"
          disabled={exporting}
          onClick={() => void downloadVideo()}
        >
          {exporting ? 'Exporting…' : 'Download a video'}
        </button>
      </div>
    )
  }

  return (
    <div className="share-panel" data-testid="share-panel">
      <p className="share-panel__lead muted">Manage links and exports.</p>

      <button
        type="button"
        className="btn btn-primary share-panel__make"
        data-testid="share-make-link"
        disabled={busy || saveStatus === 'saving'}
        onClick={() => void makeLink()}
      >
        Make a link
      </button>

      {error ? (
        <p className="form-error" role="alert" data-testid="share-error">
          {error}
        </p>
      ) : null}

      <section className="share-panel__section" aria-labelledby="share-manage-heading">
        <h3 id="share-manage-heading" className="share-panel__section-title">
          Manage links
        </h3>
        {links.length === 0 ? (
          <p className="share-panel__empty muted" data-testid="share-empty">
            No active links yet. Make a link to share a view-only player.
          </p>
        ) : (
          <ul className="share-list" data-testid="share-link-list">
            {links.map((link) => (
              <li key={link.id} className="share-row" data-testid="share-link-row">
                <code className="share-slug" title={link.urlPath}>
                  {link.urlPath}
                </code>
                <span className="muted">
                  {new Date(link.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  data-testid="share-copy"
                  onClick={() => void copy(link)}
                >
                  {copiedId === link.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger-ghost"
                  data-testid="share-revoke"
                  disabled={busy}
                  onClick={() => void revoke(link.id)}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        className="btn btn-ghost share-panel__download"
        data-testid="share-download"
        disabled={exporting}
        onClick={() => void downloadVideo()}
      >
        {exporting ? 'Exporting…' : 'Download a video'}
      </button>
    </div>
  )
}
