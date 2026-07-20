import { create } from 'zustand'
import {
  computeProjectDuration,
  createEngineFixtureProject,
  type Project,
} from '@telegraphic/shared'

export type LeftPanelId = 'total' | 'data' | 'share'
export type RightPanelId = 'design'

export type CanvasView = {
  panX: number
  panY: number
  /** Scale factor; 1 = 100%. */
  zoom: number
}

type EditorState = {
  project: Project
  tSec: number
  playing: boolean
  leftPanel: LeftPanelId | null
  rightPanel: RightPanelId | null
  ratingSelected: boolean
  canvas: CanvasView
  /** Latest measured viewport size for fit calculations. */
  viewport: { width: number; height: number }

  setProject: (project: Project) => void
  setTSec: (tSec: number) => void
  setPlaying: (playing: boolean) => void
  togglePlay: () => void
  toggleLeftPanel: (id: LeftPanelId) => void
  toggleRightPanel: (id: RightPanelId) => void
  setRatingSelected: (selected: boolean) => void
  setCanvas: (partial: Partial<CanvasView>) => void
  setViewport: (width: number, height: number) => void
  fitCanvas: () => void
  durationSeconds: () => number
}

const TARGET_FPS = 30

export const PLAYBACK_FPS = TARGET_FPS

function loadProject(projectId: string): Project {
  // Phase 3: no backend yet — fixture for any id; Phase 7 wires real projects.
  void projectId
  return createEngineFixtureProject()
}

function computeFit(
  project: Project,
  viewport: { width: number; height: number },
): CanvasView {
  const { width: frameW, height: frameH } = project.settings.screenSize
  const pad = 80
  const availW = Math.max(1, viewport.width - pad * 2)
  const availH = Math.max(1, viewport.height - pad * 2)
  const zoom = Math.min(availW / frameW, availH / frameH, 1)
  const panX = (viewport.width - frameW * zoom) / 2
  const panY = (viewport.height - frameH * zoom) / 2
  return { panX, panY, zoom }
}

export function createEditorStore(projectId: string) {
  const project = loadProject(projectId)
  const initialViewport = { width: 1200, height: 700 }

  return create<EditorState>((set, get) => ({
    project,
    tSec: 0,
    playing: false,
    leftPanel: null,
    rightPanel: null,
    ratingSelected: true,
    canvas: computeFit(project, initialViewport),
    viewport: initialViewport,

    setProject: (next) => set({ project: next }),
    setTSec: (tSec) => {
      const total = get().durationSeconds()
      set({ tSec: Math.min(Math.max(0, tSec), total) })
    },
    setPlaying: (playing) => set({ playing }),
    togglePlay: () => set((s) => ({ playing: !s.playing })),
    toggleLeftPanel: (id) =>
      set((s) => ({
        leftPanel: s.leftPanel === id ? null : id,
      })),
    toggleRightPanel: (id) =>
      set((s) => ({
        rightPanel: s.rightPanel === id ? null : id,
      })),
    setRatingSelected: (selected) => set({ ratingSelected: selected }),
    setCanvas: (partial) => set((s) => ({ canvas: { ...s.canvas, ...partial } })),
    setViewport: (width, height) => set({ viewport: { width, height } }),
    fitCanvas: () => {
      const { project, viewport } = get()
      set({ canvas: computeFit(project, viewport) })
    },
    durationSeconds: () => computeProjectDuration(get().project).totalSeconds,
  }))
}

export type EditorStore = ReturnType<typeof createEditorStore>
export type EditorStoreApi = EditorStore
