import { create } from 'zustand'
import {
  addParsedExportToProject,
  computeProjectDuration,
  createEngineFixtureProject,
  SCREEN_SIZE_PRESETS,
  type ParsedChatExport,
  type Project,
  type ScreenSizePreset,
  type TotalSettings,
} from '@telegraphic/shared'

export type LeftPanelId = 'total' | 'data' | 'share'
export type RightPanelId = 'design'

export type CanvasView = {
  panX: number
  panY: number
  /** Scale factor; 1 = 100%. */
  zoom: number
}

export type ImportModalState = {
  open: boolean
  progressRatio: number | null
  progressStage: string | null
  error: string | null
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
  recordSearch: string
  importModal: ImportModalState

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

  updateSettings: (partial: Partial<TotalSettings>) => void
  setScreenSizePreset: (preset: ScreenSizePreset) => void
  setCustomScreenSize: (width: number, height: number) => void
  setRecordSearch: (query: string) => void
  renameRecord: (id: string, title: string) => void
  deleteRecord: (id: string) => void
  setRecordVisible: (id: string, visible: boolean) => void
  setRecordAvatar: (id: string, avatarDataUrl: string | undefined) => void
  addParsedRecord: (parsed: ParsedChatExport, options?: { id?: string; title?: string }) => string
  openImportModal: () => void
  closeImportModal: () => void
  setImportProgress: (stage: string | null, ratio: number | null) => void
  setImportError: (error: string | null) => void
}

const TARGET_FPS = 30

export const PLAYBACK_FPS = TARGET_FPS

function loadProject(projectId: string): Project {
  // Phase 4 still uses the engine fixture locally; Phase 7 API persistence is separate.
  void projectId
  return createEngineFixtureProject()
}

function computeFit(project: Project, viewport: { width: number; height: number }): CanvasView {
  const { width: frameW, height: frameH } = project.settings.screenSize
  const pad = 80
  const availW = Math.max(1, viewport.width - pad * 2)
  const availH = Math.max(1, viewport.height - pad * 2)
  const zoom = Math.min(availW / frameW, availH / frameH, 1)
  const panX = (viewport.width - frameW * zoom) / 2
  const panY = (viewport.height - frameH * zoom) / 2
  return { panX, panY, zoom }
}

function clampTSec(project: Project, tSec: number): number {
  const total = computeProjectDuration(project).totalSeconds
  return Math.min(Math.max(0, tSec), total)
}

function nextRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `rec-${crypto.randomUUID()}`
  }
  return `rec-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
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
    recordSearch: '',
    importModal: { open: false, progressRatio: null, progressStage: null, error: null },

    setProject: (next) =>
      set((s) => ({
        project: next,
        tSec: clampTSec(next, s.tSec),
      })),
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
      const { project: p, viewport } = get()
      set({ canvas: computeFit(p, viewport) })
    },
    durationSeconds: () => computeProjectDuration(get().project).totalSeconds,

    updateSettings: (partial) => {
      const { project: prev, tSec, viewport } = get()
      const nextSettings: TotalSettings = { ...prev.settings, ...partial }
      // Nested objects must replace, not shallow-merge incompletely.
      if (partial.datesInterval) {
        nextSettings.datesInterval = { ...prev.settings.datesInterval, ...partial.datesInterval }
      }
      if (partial.screenSize) {
        nextSettings.screenSize = { ...prev.settings.screenSize, ...partial.screenSize }
      }
      const next: Project = { ...prev, settings: nextSettings }
      const sizeChanged =
        next.settings.screenSize.width !== prev.settings.screenSize.width ||
        next.settings.screenSize.height !== prev.settings.screenSize.height
      set({
        project: next,
        tSec: clampTSec(next, tSec),
        ...(sizeChanged ? { canvas: computeFit(next, viewport) } : {}),
      })
    },

    setScreenSizePreset: (preset) => {
      if (preset === 'custom') {
        get().updateSettings({
          screenSize: { ...get().project.settings.screenSize, preset: 'custom' },
        })
        return
      }
      const dims = SCREEN_SIZE_PRESETS[preset]
      get().updateSettings({
        screenSize: { preset, width: dims.width, height: dims.height },
      })
    },

    setCustomScreenSize: (width, height) => {
      get().updateSettings({
        screenSize: {
          preset: 'custom',
          width: Math.max(1, Math.floor(width)),
          height: Math.max(1, Math.floor(height)),
        },
      })
    },

    setRecordSearch: (query) => set({ recordSearch: query }),

    renameRecord: (id, title) => {
      const trimmed = title.trim()
      if (!trimmed) return
      set((s) => ({
        project: {
          ...s.project,
          records: s.project.records.map((r) => (r.id === id ? { ...r, title: trimmed } : r)),
        },
      }))
    },

    deleteRecord: (id) => {
      set((s) => ({
        project: {
          ...s.project,
          records: s.project.records.filter((r) => r.id !== id),
        },
        tSec: clampTSec(
          { ...s.project, records: s.project.records.filter((r) => r.id !== id) },
          s.tSec,
        ),
      }))
    },

    setRecordVisible: (id, visible) => {
      set((s) => ({
        project: {
          ...s.project,
          records: s.project.records.map((r) => (r.id === id ? { ...r, visible } : r)),
        },
      }))
    },

    setRecordAvatar: (id, avatarDataUrl) => {
      set((s) => ({
        project: {
          ...s.project,
          records: s.project.records.map((r) => {
            if (r.id !== id) return r
            const next = { ...r }
            if (avatarDataUrl === undefined) {
              delete next.avatarDataUrl
            } else {
              next.avatarDataUrl = avatarDataUrl
            }
            return next
          }),
        },
      }))
    },

    addParsedRecord: (parsed, options = {}) => {
      const id = options.id ?? nextRecordId()
      const { project: prev, tSec } = get()
      const next = addParsedExportToProject(prev, parsed, {
        id,
        ...(options.title !== undefined ? { title: options.title } : {}),
      })
      set({ project: next, tSec: clampTSec(next, tSec) })
      return id
    },

    openImportModal: () =>
      set({
        importModal: { open: true, progressRatio: null, progressStage: null, error: null },
      }),
    closeImportModal: () =>
      set({
        importModal: { open: false, progressRatio: null, progressStage: null, error: null },
      }),
    setImportProgress: (stage, ratio) =>
      set((s) => ({
        importModal: { ...s.importModal, progressStage: stage, progressRatio: ratio, error: null },
      })),
    setImportError: (error) =>
      set((s) => ({
        importModal: { ...s.importModal, error, progressStage: null, progressRatio: null },
      })),
  }))
}

export type EditorStore = ReturnType<typeof createEditorStore>
