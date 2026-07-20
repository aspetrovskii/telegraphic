<<<<<<< HEAD
import { Link } from 'react-router-dom'
import { useEditorStore } from './EditorContext'
=======
import { useEditorStore } from './useEditorStore'
>>>>>>> ca824bc (fix(web): capture-phase canvas pan and editor store module split)
import type { LeftPanelId } from './editorStore'

const LEFT_BUTTONS: { id: LeftPanelId; label: string }[] = [
  { id: 'total', label: 'Total' },
  { id: 'data', label: 'Data' },
  { id: 'share', label: 'Share' },
]

export function ToolbarLeft() {
  const title = useEditorStore((s) => s.project.title)
  const leftPanel = useEditorStore((s) => s.leftPanel)
  const toggleLeftPanel = useEditorStore((s) => s.toggleLeftPanel)

  return (
    <div className="editor-toolbar editor-toolbar--left" data-testid="toolbar-left">
<<<<<<< HEAD
      <Link to="/" className="editor-toolbar__back" aria-label="Back to Home" data-testid="editor-back">
=======
      <a
        href="/"
        className="editor-toolbar__back"
        aria-label="Back to Home"
        data-testid="editor-back"
      >
>>>>>>> ca824bc (fix(web): capture-phase canvas pan and editor store module split)
        ←
      </Link>
      <h1 className="editor-toolbar__title" data-testid="editor-title" title={title}>
        {title}
      </h1>
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
