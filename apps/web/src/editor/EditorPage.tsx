import { EditorProvider } from './EditorContext'
import { InfiniteCanvas } from './InfiniteCanvas'
import { RatingRectangle } from './RatingRectangle'
import { ToolbarLeft } from './ToolbarLeft'
import { ToolbarRight } from './ToolbarRight'
import { LeftEditorPanel, RightEditorPanel } from './EditorPanel'
import { PlayerBar } from './PlayerBar'
import './editor.css'

type Props = {
  projectId: string
}

export function EditorPage({ projectId }: Props) {
  return (
    <EditorProvider projectId={projectId}>
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
      </div>
    </EditorProvider>
  )
}
