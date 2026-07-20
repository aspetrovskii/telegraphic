import { useEffect, useRef, useState } from 'react'
import { detectExportCapabilities, exportProjectVideo, type ExportProgress } from '../export'
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
 * Bottom preview player — play/pause, scrub, fullscreen, Download a video.
 * Playback advances at a fixed 30fps timestep (acceptance: 30fps on fixture).
 */
export function PlayerBar() {
  const playing = useEditorStore((s) => s.playing)
  const tSec = useEditorStore((s) => s.tSec)
  const togglePlay = useEditorStore((s) => s.togglePlay)
  const setTSec = useEditorStore((s) => s.setTSec)
  const setPlaying = useEditorStore((s) => s.setPlaying)
  const project = useEditorStore((s) => s.project)
  const store = useEditorStoreApi()
  const duration = useEditorStore((s) => s.durationSeconds())
  const frameCountRef = useRef(0)
  const rafRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const caps = detectExportCapabilities()
  const showFallbackNotice = caps.willUseFallback

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

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function handleExport(forceFallback = false) {
    if (exporting) return
    setExportError(null)
    setPlaying(false)
    setExporting(true)
    setProgress({
      stage: 'preparing',
      ratio: 0,
      format: forceFallback || caps.willUseFallback ? 'webm' : 'mp4',
      usingFallback: forceFallback || caps.willUseFallback,
    })

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await exportProjectVideo(project, {
        forceFallback,
        signal: controller.signal,
        onProgress: setProgress,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setExportError(null)
      } else {
        setExportError(err instanceof Error ? err.message : 'Export failed')
      }
    } finally {
      abortRef.current = null
      setExporting(false)
    }
  }

  async function toggleFullscreen() {
    const shell = document.querySelector<HTMLElement>('[data-testid="editor-shell"]')
    if (!shell) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await shell.requestFullscreen()
    }
  }

  const pct = progress ? Math.round(progress.ratio * 100) : 0
  const usingFallback = progress?.usingFallback ?? showFallbackNotice

  return (
    <div className="player-bar" data-testid="player-bar">
      <button
        type="button"
        className="player-bar__play"
        data-testid="player-play"
        aria-label={playing ? 'Pause' : 'Play'}
        disabled={exporting}
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
        disabled={exporting}
        onChange={(e) => {
          setPlaying(false)
          setTSec(Number(e.target.value))
        }}
      />
      <span className="player-bar__fps" data-testid="player-fps" title="Target playback rate">
        {PLAYBACK_FPS} fps
      </span>

      {exporting && (
        <div
          className="player-bar__progress"
          data-testid="export-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Export progress"
        >
          <div className="player-bar__progress-track">
            <div className="player-bar__progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="player-bar__progress-label">
            {progress?.stage === 'finalizing'
              ? 'Finalizing…'
              : progress?.stage === 'preparing'
                ? 'Preparing…'
                : `Exporting ${pct}%`}
          </span>
        </div>
      )}

      <button
        type="button"
        className="player-bar__download"
        data-testid="player-download"
        disabled={exporting}
        onClick={() => void handleExport(false)}
      >
        {exporting ? 'Exporting…' : 'Download a video'}
      </button>

      <button
        type="button"
        className="player-bar__fullscreen"
        data-testid="player-fullscreen"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        disabled={exporting}
        onClick={() => void toggleFullscreen()}
      >
        {isFullscreen ? 'Exit' : 'Full'}
      </button>

      {/* Hidden test hook: force MediaRecorder path without changing product UX. */}
      <button
        type="button"
        className="player-bar__force-fallback"
        data-testid="player-download-fallback"
        tabIndex={-1}
        aria-hidden="true"
        disabled={exporting}
        onClick={() => void handleExport(true)}
      />

      {(showFallbackNotice || usingFallback) && (
        <p className="player-bar__notice" data-testid="export-fallback-notice" role="status">
          MP4 export needs WebCodecs. This browser will download WebM instead.
        </p>
      )}

      {exportError && (
        <p className="player-bar__error" data-testid="export-error" role="alert">
          {exportError}
        </p>
      )}
    </div>
  )
}
