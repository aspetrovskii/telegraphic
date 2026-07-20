import { useEditorStore } from './EditorContext'

export function ToolbarRight() {
  const rightPanel = useEditorStore((s) => s.rightPanel)
  const toggleRightPanel = useEditorStore((s) => s.toggleRightPanel)

  return (
    <div className="editor-toolbar editor-toolbar--right" data-testid="toolbar-right">
      <button
        type="button"
        className={`editor-toolbar__btn${rightPanel === 'design' ? ' is-active' : ''}`}
        data-testid="panel-toggle-design"
        aria-pressed={rightPanel === 'design'}
        onClick={() => toggleRightPanel('design')}
      >
        Design
      </button>
    </div>
  )
}
