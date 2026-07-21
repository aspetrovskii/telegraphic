import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '@telegraphic/shared'
import { ApiError, api } from '../api/client'
import { EditorProvider } from './useEditorStore'
import { InfiniteCanvas } from './InfiniteCanvas'
import { RatingRectangle } from './RatingRectangle'
import { ToolbarLeft } from './ToolbarLeft'
import { ToolbarRight } from './ToolbarRight'
import { LeftEditorPanel, RightEditorPanel } from './EditorPanel'
import { PlayerBar } from './PlayerBar'
import { EditorAutosave } from './EditorAutosave'
import './editor.css'

type Props = {
  projectId: string
}

function EditorShell({ projectId }: { projectId: string }) {
  const persistable = projectId !== 'fixture'
  return (
    <div className="editor-shell" data-testid="editor-shell">
      <header className="editor-chrome">
        <ToolbarLeft />
        <ToolbarRight />
      </header>
      <div className="editor-workspace">
        <LeftEditorPanel />
        <InfiniteCanvas>
          <RatingRectangle />
        </InfiniteCanvas>
        <RightEditorPanel />
      </div>
      <PlayerBar />
      {persistable ? <EditorAutosave projectId={projectId} /> : null}
    </div>
  )
}

function PersistedEditor({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setProject(null)
    setError(null)
    void (async () => {
      try {
        const res = await api.getProject(projectId)
        if (!cancelled) setProject(res.project)
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError && err.status === 404
              ? 'Project not found.'
              : err instanceof Error
                ? err.message
                : 'Failed to load project'
          setError(message)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (error) {
    return (
      <main className="edit-stub" data-testid="editor-load-error">
        <p className="form-error" role="alert">
          {error}
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Home
        </Link>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="edit-stub" data-testid="editor-loading">
        <p className="muted">Loading project…</p>
      </main>
    )
  }

  return (
    <EditorProvider projectId={projectId} initialProject={project}>
      <EditorShell projectId={projectId} />
    </EditorProvider>
  )
}

export function EditorPage({ projectId }: Props) {
  if (projectId === 'fixture') {
    return (
      <EditorProvider projectId="fixture">
        <EditorShell projectId="fixture" />
      </EditorProvider>
    )
  }
  return <PersistedEditor projectId={projectId} />
}
