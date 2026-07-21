import { create } from 'zustand'
import {
  addParsedExportToProject,
  computeProjectDuration,
  createEngineFixtureProject,
  SCREEN_SIZE_PRESETS,
  type ParsedChatExport,
  type Project,
  type ScreenSizePreset,
  type Theme,
  type ThemeAvatar,
  type ThemeBackground,
  type ThemeCard,
  type ThemeCardTypography,
  type ThemeFilling,
  type ThemeNameLabel,
  type ThemeTimer,
  type ThemeValueLabel,
  type TotalSettings,
} from '@telegraphic/shared'

export type LeftPanelId = 'total' | 'data' | 'share'
export type RightPanelId = 'design'
export type DesignElementId = 'background' | 'card'

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

export type SaveStatus = 'local' | 'clean' | 'dirty' | 'saving' | 'saved' | 'error'

type EditorState = {
  project: Project
  /** When false, Share/API persistence is unavailable (fixture / local-only). */
  persistable: boolean
  saveStatus: SaveStatus
  saveError: string | null
  tSec: number
  playing: boolean
  leftPanel: LeftPanelId | null
  rightPanel: RightPanelId | null
  designElement: DesignElementId
  /** Record selected for per-card Design overrides (null = none). */
  selectedRecordId: string | null
  ratingSelected: boolean
  canvas: CanvasView
  /** Latest measured viewport size for fit calculations. */
  viewport: { width: number; height: number }
  recordSearch: string
  importModal: ImportModalState

  setProject: (project: Project) => void
  setTitle: (title: string) => void
  markDirty: () => void
  setSaveStatus: (status: SaveStatus, error?: string | null) => void
  setTSec: (tSec: number) => void
  setPlaying: (playing: boolean) => void
  togglePlay: () => void
  toggleLeftPanel: (id: LeftPanelId) => void
  toggleRightPanel: (id: RightPanelId) => void
  setDesignElement: (id: DesignElementId) => void
  setSelectedRecordId: (id: string | null) => void
  setRatingSelected: (selected: boolean) => void
  setCanvas: (partial: Partial<CanvasView>) => void
  setViewport: (width: number, height: number) => void
  fitCanvas: () => void
  durationSeconds: () => number

  updateSettings: (partial: Partial<TotalSettings>) => void
  setScreenSizePreset: (preset: ScreenSizePreset) => void
  setCustomScreenSize: (width: number, height: number) => void
  updateTheme: (partial: Partial<Theme>) => void
  updateBackground: (partial: Partial<ThemeBackground>) => void
  updateFilling: (partial: Partial<ThemeFilling>) => void
  updateTimer: (partial: Partial<ThemeTimer>) => void
  updateCard: (partial: Partial<ThemeCard>) => void
  updateValueLabel: (partial: Partial<ThemeValueLabel>) => void
  updateNameLabel: (partial: Partial<ThemeNameLabel>) => void
  updateAvatarTheme: (partial: Partial<ThemeAvatar>) => void
  updateCardTypography: (partial: Partial<ThemeCardTypography>) => void
  setRecordSearch: (query: string) => void
  renameRecord: (id: string, title: string) => void
  deleteRecord: (id: string) => void
  setRecordVisible: (id: string, visible: boolean) => void
  setRecordAvatar: (id: string, avatarDataUrl: string | undefined) => void
  setRecordColor: (id: string, color: string | undefined) => void
  setRecordNameColor: (id: string, nameColor: string | undefined) => void
  addParsedRecord: (parsed: ParsedChatExport, options?: { id?: string; title?: string }) => string
  openImportModal: () => void
  closeImportModal: () => void
  setImportProgress: (stage: string | null, ratio: number | null) => void
  setImportError: (error: string | null) => void
}

const TARGET_FPS = 30

export const PLAYBACK_FPS = TARGET_FPS

function loadProject(projectId: string, initial?: Project): Project {
  if (initial) return initial
  // Local-only fixture race for engine / e2e smoke (`/edit/fixture`).
  void projectId
  return createEngineFixtureProject()
}

function withDirty<T extends Partial<EditorState>>(
  persistable: boolean,
  patch: T,
): T & { saveStatus?: SaveStatus; saveError?: null } {
  if (!persistable) return patch
  return { ...patch, saveStatus: 'dirty', saveError: null }
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

export function createEditorStore(projectId: string, initialProject?: Project) {
  const project = loadProject(projectId, initialProject)
  const persistable = projectId !== 'fixture'
  const initialViewport = { width: 1200, height: 700 }

  const firstVisible = project.records.find((r) => r.visible)?.id ?? project.records[0]?.id ?? null

  return create<EditorState>((set, get) => ({
    project,
    persistable,
    saveStatus: persistable ? 'clean' : 'local',
    saveError: null,
    tSec: 0,
    playing: false,
    leftPanel: null,
    rightPanel: null,
    designElement: 'background',
    selectedRecordId: firstVisible,
    ratingSelected: true,
    canvas: computeFit(project, initialViewport),
    viewport: initialViewport,
    recordSearch: '',
    importModal: { open: false, progressRatio: null, progressStage: null, error: null },

    setProject: (next) =>
      set((s) => ({
        project: next,
        tSec: clampTSec(next, s.tSec),
        selectedRecordId:
          s.selectedRecordId && next.records.some((r) => r.id === s.selectedRecordId)
            ? s.selectedRecordId
            : (next.records.find((r) => r.visible)?.id ?? next.records[0]?.id ?? null),
      })),
    setTitle: (title) => {
      set((s) => withDirty(s.persistable, { project: { ...s.project, title } }))
    },
    markDirty: () =>
      set((s) => (s.persistable ? { saveStatus: 'dirty' as const, saveError: null } : {})),
    setSaveStatus: (status, error = null) => set({ saveStatus: status, saveError: error }),
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
    setDesignElement: (id) => set({ designElement: id, rightPanel: 'design' }),
    setSelectedRecordId: (id) =>
      set({
        selectedRecordId: id,
        designElement: id ? 'card' : get().designElement,
        rightPanel: 'design',
      }),
    setRatingSelected: (selected) => set({ ratingSelected: selected }),
    setCanvas: (partial) => set((s) => ({ canvas: { ...s.canvas, ...partial } })),
    setViewport: (width, height) => set({ viewport: { width, height } }),
    fitCanvas: () => {
      const { project: p, viewport } = get()
      set({ canvas: computeFit(p, viewport) })
    },
    durationSeconds: () => computeProjectDuration(get().project).totalSeconds,

    updateSettings: (partial) => {
      const { project: prev, tSec, viewport, persistable: canPersist } = get()
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
      set(
        withDirty(canPersist, {
          project: next,
          tSec: clampTSec(next, tSec),
          ...(sizeChanged ? { canvas: computeFit(next, viewport) } : {}),
        }),
      )
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

    updateTheme: (partial) => {
      const { project: prev } = get()
      const nextTheme: Theme = { ...prev.theme, ...partial }
      if (partial.background) {
        nextTheme.background = {
          ...prev.theme.background,
          ...partial.background,
          filling: partial.background.filling
            ? { ...prev.theme.background.filling, ...partial.background.filling }
            : prev.theme.background.filling,
          timer: partial.background.timer
            ? { ...prev.theme.background.timer, ...partial.background.timer }
            : prev.theme.background.timer,
        }
      }
      if (partial.card) {
        nextTheme.card = {
          ...prev.theme.card,
          ...partial.card,
          valueLabel: partial.card.valueLabel
            ? { ...prev.theme.card.valueLabel, ...partial.card.valueLabel }
            : prev.theme.card.valueLabel,
          nameLabel: partial.card.nameLabel
            ? { ...prev.theme.card.nameLabel, ...partial.card.nameLabel }
            : prev.theme.card.nameLabel,
          avatar: partial.card.avatar
            ? { ...prev.theme.card.avatar, ...partial.card.avatar }
            : prev.theme.card.avatar,
          typography: partial.card.typography
            ? { ...prev.theme.card.typography, ...partial.card.typography }
            : prev.theme.card.typography,
          palette: partial.card.palette ?? prev.theme.card.palette,
        }
      }
      set(withDirty(get().persistable, { project: { ...prev, theme: nextTheme } }))
    },

    updateBackground: (partial) => {
      get().updateTheme({ background: { ...get().project.theme.background, ...partial } })
    },

    updateFilling: (partial) => {
      const filling = { ...get().project.theme.background.filling, ...partial }
      get().updateBackground({ filling })
    },

    updateTimer: (partial) => {
      const timer = { ...get().project.theme.background.timer, ...partial }
      get().updateBackground({ timer })
    },

    updateCard: (partial) => {
      get().updateTheme({ card: { ...get().project.theme.card, ...partial } })
    },

    updateValueLabel: (partial) => {
      get().updateCard({
        valueLabel: { ...get().project.theme.card.valueLabel, ...partial },
      })
    },

    updateNameLabel: (partial) => {
      get().updateCard({
        nameLabel: { ...get().project.theme.card.nameLabel, ...partial },
      })
    },

    updateAvatarTheme: (partial) => {
      get().updateCard({
        avatar: { ...get().project.theme.card.avatar, ...partial },
      })
    },

    updateCardTypography: (partial) => {
      get().updateCard({
        typography: { ...get().project.theme.card.typography, ...partial },
      })
    },

    setRecordSearch: (query) => set({ recordSearch: query }),

    renameRecord: (id, title) => {
      const trimmed = title.trim()
      if (!trimmed) return
      set((s) =>
        withDirty(s.persistable, {
          project: {
            ...s.project,
            records: s.project.records.map((r) => (r.id === id ? { ...r, title: trimmed } : r)),
          },
        }),
      )
    },

    deleteRecord: (id) => {
      set((s) => {
        const records = s.project.records.filter((r) => r.id !== id)
        const nextProject = { ...s.project, records }
        return withDirty(s.persistable, {
          project: nextProject,
          tSec: clampTSec(nextProject, s.tSec),
          selectedRecordId:
            s.selectedRecordId === id
              ? (records.find((r) => r.visible)?.id ?? records[0]?.id ?? null)
              : s.selectedRecordId,
        })
      })
    },

    setRecordVisible: (id, visible) => {
      set((s) =>
        withDirty(s.persistable, {
          project: {
            ...s.project,
            records: s.project.records.map((r) => (r.id === id ? { ...r, visible } : r)),
          },
        }),
      )
    },

    setRecordAvatar: (id, avatarDataUrl) => {
      set((s) =>
        withDirty(s.persistable, {
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
        }),
      )
    },

    setRecordColor: (id, color) => {
      set((s) =>
        withDirty(s.persistable, {
          project: {
            ...s.project,
            records: s.project.records.map((r) => {
              if (r.id !== id) return r
              const next = { ...r }
              if (color === undefined) delete next.color
              else next.color = color
              return next
            }),
          },
        }),
      )
    },

    setRecordNameColor: (id, nameColor) => {
      set((s) =>
        withDirty(s.persistable, {
          project: {
            ...s.project,
            records: s.project.records.map((r) => {
              if (r.id !== id) return r
              const next = { ...r }
              if (nameColor === undefined) delete next.nameColor
              else next.nameColor = nameColor
              return next
            }),
          },
        }),
      )
    },

    addParsedRecord: (parsed, options = {}) => {
      const id = options.id ?? nextRecordId()
      const { project: prev, tSec, persistable: canPersist } = get()
      const next = addParsedExportToProject(prev, parsed, {
        id,
        ...(options.title !== undefined ? { title: options.title } : {}),
      })
      set(withDirty(canPersist, { project: next, tSec: clampTSec(next, tSec) }))
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
