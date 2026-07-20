import { useEditorStore } from './useEditorStore'
import type { LeftPanelId, RightPanelId } from './editorStore'

const LEFT_TITLES: Record<LeftPanelId, string> = {
  total: 'Total',
  data: 'Data',
  share: 'Share',
}

/**
 * Empty shell panels for Phase 3 — Phase 4/5 fill controls.
 */
export function LeftEditorPanel() {
  const leftPanel = useEditorStore((s) => s.leftPanel)
  if (!leftPanel) return null
  return (
    <aside
      className="editor-panel editor-panel--left"
      data-testid={`panel-${leftPanel}`}
      aria-label={LEFT_TITLES[leftPanel]}
    >
      <header className="editor-panel__header">
        <h2 className="editor-panel__title">{LEFT_TITLES[leftPanel]}</h2>
      </header>
      <div className="editor-panel__body">
        <p className="editor-panel__placeholder">Controls coming in a later phase.</p>
      </div>
    </aside>
  )
}

export function RightEditorPanel() {
  const rightPanel = useEditorStore((s) => s.rightPanel)
  if (!rightPanel) return null
  const id: RightPanelId = rightPanel
  return (
    <aside
      className="editor-panel editor-panel--right"
      data-testid={`panel-${id}`}
      aria-label="Design"
    >
      <header className="editor-panel__header">
        <h2 className="editor-panel__title">Design</h2>
      </header>
      <div className="editor-panel__body">
        <p className="editor-panel__placeholder">Controls coming in a later phase.</p>
      </div>
    </aside>
  )
}
