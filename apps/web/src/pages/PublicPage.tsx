import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Project } from '@telegraphic/shared'
import { ApiError, api } from '../api/client'
import { RacePlayer } from '../components/RacePlayer'
import { useAuthStore } from '../store/auth'

/**
 * View-only public player at `/p/:slug`.
 * noindex; Download a video; Duplicate to my projects (sign-in required).
 */
export function PublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [duplicating, setDuplicating] = useState(false)
  const [dupError, setDupError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const res = await api.getPublicProject(slug)
        if (!cancelled) {
          setProject(res.project)
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError && err.status === 404
              ? 'This share link is invalid or was revoked.'
              : err instanceof Error
                ? err.message
                : 'Failed to load shared project'
          setError(message)
          setProject(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    const title = project?.title ? `${project.title} · Telegraphic` : 'Shared rating · Telegraphic'
    document.title = title
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex, nofollow')
    return () => {
      document.title = 'Telegraphic'
      meta?.setAttribute('content', 'index, follow')
    }
  }, [project?.title])

  async function duplicate() {
    if (!project || !slug) return
    setDupError(null)
    if (!user) {
      navigate(`/sign-in?next=${encodeURIComponent(`/p/${slug}`)}`)
      return
    }
    setDuplicating(true)
    try {
      const res = await api.createProject({
        title: `${project.title} (copy)`,
        ticks: project.ticks,
        records: project.records,
        settings: project.settings,
        theme: project.theme,
      })
      navigate(`/edit/${res.project.id}`)
    } catch (err) {
      setDupError(
        err instanceof ApiError && err.status === 413
          ? err.message ||
              'Project is too large to duplicate. Ask the owner to reduce avatars or records.'
          : err instanceof Error
            ? err.message
            : 'Failed to duplicate',
      )
    } finally {
      setDuplicating(false)
    }
  }

  if (!slug) {
    return (
      <main className="public-page public-page--error" data-testid="public-page">
        <p className="form-error" role="alert">
          Missing share link.
        </p>
        <Link to="/">Back to Telegraphic</Link>
      </main>
    )
  }

  if (loading || !ready) {
    return (
      <main className="public-page public-page--loading" data-testid="public-page">
        <p className="muted" data-testid="public-loading">
          Loading shared rating…
        </p>
      </main>
    )
  }

  if (error || !project) {
    return (
      <main className="public-page public-page--error" data-testid="public-page">
        <h1 className="public-page__title">Link unavailable</h1>
        <p className="form-error" role="alert" data-testid="public-error">
          {error ?? 'Not found'}
        </p>
        <Link to="/" className="btn btn-primary">
          Go to Telegraphic
        </Link>
      </main>
    )
  }

  return (
    <main className="public-page" data-testid="public-page">
      <header className="public-page__header">
        <Link to="/" className="public-page__brand">
          Telegraphic
        </Link>
      </header>

      <div className="public-page__stage">
        <RacePlayer project={project} />
      </div>

      <section className="public-page__meta">
        <h1 className="public-page__title" data-testid="public-title">
          {project.title}
        </h1>
        <p className="public-page__subtitle muted">View-only shared rating</p>
        <div className="public-page__actions">
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="public-duplicate"
            disabled={duplicating}
            onClick={() => void duplicate()}
          >
            {duplicating ? 'Duplicating…' : 'Duplicate to my projects'}
          </button>
          {/* Download lives on the player bar; secondary CTA mirrors Stitch IA. */}
          <button
            type="button"
            className="btn btn-primary"
            data-testid="public-download-cta"
            onClick={() => {
              document.querySelector<HTMLButtonElement>('[data-testid="public-download"]')?.click()
            }}
          >
            Download a video
          </button>
        </div>
        {dupError ? (
          <p className="form-error" role="alert" data-testid="public-dup-error">
            {dupError}
          </p>
        ) : null}
        {!user ? (
          <p className="muted public-page__signin-hint" data-testid="public-signin-hint">
            Sign in to duplicate this rating into your projects.
          </p>
        ) : null}
      </section>

      <footer className="public-page__footer">
        <Link to="/">Made with Telegraphic</Link>
      </footer>
    </main>
  )
}
