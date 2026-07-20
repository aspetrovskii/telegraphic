import { describe, expect, it } from 'vitest'
import { createEditorStore, PLAYBACK_FPS } from './editorStore'
import type { ParsedChatExport } from '@telegraphic/shared'

describe('editorStore', () => {
  it('loads fixture project and reports duration', () => {
    const store = createEditorStore('fixture')
    const state = store.getState()
    expect(state.project.id).toBe('fixture-engine-phase2')
    expect(state.durationSeconds()).toBeGreaterThan(0)
    expect(PLAYBACK_FPS).toBe(30)
  })

  it('toggles left panels exclusively and closes on second click', () => {
    const store = createEditorStore('fixture')
    store.getState().toggleLeftPanel('total')
    expect(store.getState().leftPanel).toBe('total')
    store.getState().toggleLeftPanel('data')
    expect(store.getState().leftPanel).toBe('data')
    store.getState().toggleLeftPanel('data')
    expect(store.getState().leftPanel).toBeNull()
  })

  it('clamps scrub time to duration', () => {
    const store = createEditorStore('fixture')
    const total = store.getState().durationSeconds()
    store.getState().setTSec(total + 50)
    expect(store.getState().tSec).toBe(total)
    store.getState().setTSec(-1)
    expect(store.getState().tSec).toBe(0)
  })

  it('updates Total settings live and clamps time when duration shrinks', () => {
    const store = createEditorStore('fixture')
    store.getState().updateSettings({ topN: 3, scale: 200, speedValue: 5, startDelay: 1 })
    const settings = store.getState().project.settings
    expect(settings.topN).toBe(3)
    expect(settings.scale).toBe(200)
    expect(settings.speedValue).toBe(5)
    expect(settings.startDelay).toBe(1)
    expect(store.getState().durationSeconds()).toBe(6) // 1 + 5 + 0
  })

  it('changes screen size presets and custom dims', () => {
    const store = createEditorStore('fixture')
    store.getState().setScreenSizePreset('1080x1080')
    expect(store.getState().project.settings.screenSize).toEqual({
      preset: '1080x1080',
      width: 1080,
      height: 1080,
    })
    store.getState().setCustomScreenSize(800, 600)
    expect(store.getState().project.settings.screenSize).toEqual({
      preset: 'custom',
      width: 800,
      height: 600,
    })
  })

  it('renames, hides, and deletes records', () => {
    const store = createEditorStore('fixture')
    const id = store.getState().project.records[0]!.id
    store.getState().renameRecord(id, 'Renamed Alpha')
    expect(store.getState().project.records.find((r) => r.id === id)?.title).toBe('Renamed Alpha')
    store.getState().setRecordVisible(id, false)
    expect(store.getState().project.records.find((r) => r.id === id)?.visible).toBe(false)
    const before = store.getState().project.records.length
    store.getState().deleteRecord(id)
    expect(store.getState().project.records).toHaveLength(before - 1)
    expect(store.getState().project.records.find((r) => r.id === id)).toBeUndefined()
  })

  it('adds a parsed export as a new record', () => {
    const store = createEditorStore('fixture')
    const before = store.getState().project.records.length
    const parsed: ParsedChatExport = {
      sourceChatTitle: 'Alice',
      ticks: ['2024-01-01', '2024-01-02'],
      counts: [2, 3],
      messageTotal: 3,
    }
    const id = store.getState().addParsedRecord(parsed, { id: 'rec-alice-test' })
    expect(id).toBe('rec-alice-test')
    const records = store.getState().project.records
    expect(records).toHaveLength(before + 1)
    expect(records.find((r) => r.id === id)?.title).toBe('Alice')
  })
})
