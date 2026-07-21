import { Link } from 'react-router-dom'
import { useEditorStore } from './useEditorStore'
import type { LeftPanelId, SaveStatus } from './editorStore'

const LEFT_BUTTONS: { id: LeftPanelId; label: string }[] = [
  { id: 'total', label: 'Total' },
  { id: 'data', label: 'Data' },
  { id: 'share', label: 'Share' },
]

function saveLabel(status: SaveStatus): string {
  switch (status) {
    case 'saving':
      return 'Saving…'
    case 'saved':
      return 'Saved'
    case 'dirty':
      return 'Unsaved'
    case 'error':
      return 'Save failed'
    case 'local':
      return 'Local only'
    default:
      return 'Saved'
  }
}

export function ToolbarLeft() {
  const title = useEditorStore((s) => s.project.title)
  const setTitle = useEditorStore((s) => s.setTitle)
  const leftPanel = useEditorStore((s) => s.leftPanel)
  const toggleLeftPanel = useEditorStore((s) => s.toggleLeftPanel)
  const persistable = useEditorStore((s) => s.persistable)
  const saveStatus = useEditorStore((s) => s.saveStatus)
  const saveError = useEditorStore((s) => s.saveError)

  return (
    <div className="editor-toolbar editor-toolbar--left" data-testid="toolbar-left">
      <Link
        to="/"
        className="editor-toolbar__back"
        aria-label="Back to Home"
        data-testid="editor-back"
      >
        ←
      </Link>
      {persistable ? (
        <input
          className="editor-toolbar__title-input"
          data-testid="editor-title"
          value={title}
          aria-label="Project title"
          onChange={(e) => setTitle(e.target.value)}
        />
      ) : (
        <h1 className="editor-toolbar__title" data-testid="editor-title" title={title}>
          {title}
        </h1>
      )}
      <span
        className={`editor-toolbar__save${saveStatus === 'error' ? ' is-error' : ''}`}
        data-testid="editor-save-status"
        title={saveError ?? undefined}
      >
        {saveLabel(saveStatus)}
      </span>
      {saveStatus === 'error' && saveError ? (
        <span className="editor-toolbar__save-error" data-testid="editor-save-error" role="alert">
          {saveError}
        </span>
      ) : null}
      <div className="editor-toolbar__group" role="toolbar" aria-label="Left panels">
        {LEFT_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            className={`editor-toolbar__btn${leftPanel === btn.id ? ' is-active' : ''}`}
            data-testid={`panel-toggle-${btn.id}`}
            aria-pressed={leftPanel === btn.id}
            onClick={() => toggleLeftPanel(btn.id)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
