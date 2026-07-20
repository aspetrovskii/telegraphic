import { useEffect, useRef } from 'react'
import { useEditorStore, useEditorStoreApi } from './useEditorStore'
import { PLAYBACK_FPS } from './editorStore'

function formatTime(sec: number): string {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const rem = s - m * 60
  const whole = Math.floor(rem)
  const frac = Math.floor((rem - whole) * 10)
  return `${m}:${String(whole).padStart(2, '0')}.${frac}`
}

/**
 * Bottom preview player — play/pause + scrub wired to engine time.
 * Playback advances at a fixed 30fps timestep (acceptance: 30fps on fixture).
 */
export function PlayerBar() {
  const playing = useEditorStore((s) => s.playing)
  const tSec = useEditorStore((s) => s.tSec)
  const togglePlay = useEditorStore((s) => s.togglePlay)
  const setTSec = useEditorStore((s) => s.setTSec)
  const setPlaying = useEditorStore((s) => s.setPlaying)
  const store = useEditorStoreApi()
  const duration = useEditorStore((s) => s.durationSeconds())
  const frameCountRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!playing) return

    const stepSec = 1 / PLAYBACK_FPS
    let last = performance.now()
    let acc = 0
    frameCountRef.current = 0

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      acc += dt
      while (acc >= stepSec) {
        acc -= stepSec
        const state = store.getState()
        const total = state.durationSeconds()
        const next = state.tSec + stepSec
        frameCountRef.current += 1
        if (next >= total) {
          state.setTSec(total)
          state.setPlaying(false)
          return
        }
        state.setTSec(next)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, store])

  // Expose frame counter for e2e (30fps smoke)
  useEffect(() => {
    ;(
      window as unknown as { __telegraphicPlaybackFrames?: () => number }
    ).__telegraphicPlaybackFrames = () => frameCountRef.current
    return () => {
      delete (window as unknown as { __telegraphicPlaybackFrames?: () => number })
        .__telegraphicPlaybackFrames
    }
  }, [])

  return (
    <div className="player-bar" data-testid="player-bar">
      <button
        type="button"
        className="player-bar__play"
        data-testid="player-play"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={() => {
          if (!playing && tSec >= duration) setTSec(0)
          togglePlay()
        }}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <span className="player-bar__time" data-testid="player-time">
        {formatTime(tSec)} / {formatTime(duration)}
      </span>
      <input
        type="range"
        className="player-bar__scrub"
        data-testid="player-scrub"
        min={0}
        max={duration || 1}
        step={0.01}
        value={Math.min(tSec, duration)}
        aria-label="Scrub"
        onChange={(e) => {
          setPlaying(false)
          setTSec(Number(e.target.value))
        }}
      />
      <span className="player-bar__fps" data-testid="player-fps" title="Target playback rate">
        {PLAYBACK_FPS} fps
      </span>
    </div>
  )
}
