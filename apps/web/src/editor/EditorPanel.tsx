import { useEditorStore } from './useEditorStore'
import type { LeftPanelId, RightPanelId } from './editorStore'
import { TotalPanel } from './TotalPanel'
import { DataPanel } from './DataPanel'

const LEFT_TITLES: Record<LeftPanelId, string> = {
  total: 'Total',
  data: 'Data',
  share: 'Share',
}

/**
 * Left docked panels. Total & Data are Phase 4; Share stays a stub until Phase 8.
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
      <div className="editor-panel__body editor-panel__body--scroll">
        {leftPanel === 'total' && <TotalPanel />}
        {leftPanel === 'data' && <DataPanel />}
        {leftPanel === 'share' && (
          <p className="editor-panel__placeholder">Controls coming in a later phase.</p>
        )}
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
