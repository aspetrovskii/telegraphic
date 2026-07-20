import { describe, expect, it } from 'vitest'
import { createEditorStore, PLAYBACK_FPS } from './editorStore'

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
})
