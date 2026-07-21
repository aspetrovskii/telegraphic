import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { computeProjectDuration, render, type Project } from '@telegraphic/shared'
import { detectExportCapabilities, exportProjectVideo, type ExportProgress } from '../export'

const PLAYBACK_FPS = 30

function formatTime(sec: number): string {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const rem = s - m * 60
  const whole = Math.floor(rem)
  const frac = Math.floor((rem - whole) * 10)
  return `${m}:${String(whole).padStart(2, '0')}.${frac}`
}

type Props = {
  project: Project
  /** Element used for fullscreen (defaults to the player root). */
  fullscreenRootTestId?: string
  showDownload?: boolean
}

/**
 * View-only race player used on the public `/p/:slug` page.
 * Uses the same shared `render` + export path as the editor (no fork).
 */
export function RacePlayer({
  project,
  fullscreenRootTestId = 'public-page',
  showDownload = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const duration = computeProjectDuration(project).totalSeconds
  const { width, height } = project.settings.screenSize

  const [tSec, setTSec] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [fallbackBanner, setFallbackBanner] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const caps = detectExportCapabilities()
  const showFallbackNotice = caps.willUseFallback || fallbackBanner

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    render(ctx, project, tSec)
  }, [project, tSec, width, height])

  useEffect(() => {
    if (!playing) return
    const stepSec = 1 / PLAYBACK_FPS
    let last = performance.now()
    let acc = 0

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      acc += dt
      while (acc >= stepSec) {
        acc -= stepSec
        setTSec((prev) => {
          const next = prev + stepSec
          if (next >= duration) {
            setPlaying(false)
            return duration
          }
          return next
        })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, duration])

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  async function handleExport() {
    if (exporting) return
    setExportError(null)
    setPlaying(false)
    setExporting(true)
    if (caps.willUseFallback) setFallbackBanner(true)
    setProgress({
      stage: 'preparing',
      ratio: 0,
      format: caps.willUseFallback ? 'webm' : 'mp4',
      usingFallback: caps.willUseFallback,
    })
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await exportProjectVideo(project, {
        signal: controller.signal,
        onProgress: setProgress,
      })
      if (result.usingFallback) setFallbackBanner(true)
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setExportError(err instanceof Error ? err.message : 'Export failed')
      }
    } finally {
      abortRef.current = null
      setExporting(false)
    }
  }

  async function toggleFullscreen() {
    const shell =
      document.querySelector<HTMLElement>(`[data-testid="${fullscreenRootTestId}"]`) ??
      rootRef.current
    if (!shell) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await shell.requestFullscreen()
    }
  }

  const pct = progress ? Math.round(progress.ratio * 100) : 0

  return (
    <div className="race-player" ref={rootRef} data-testid="race-player">
      <div className="race-player__frame">
        <canvas
          ref={canvasRef}
          className="race-player__canvas"
          data-testid="public-engine-canvas"
          width={width}
          height={height}
        />
      </div>

      <div className="player-bar race-player__bar" data-testid="public-player-bar">
        <button
          type="button"
          className="player-bar__play"
          data-testid="public-player-play"
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={exporting}
          onClick={() => {
            if (!playing && tSec >= duration) setTSec(0)
            setPlaying((p) => !p)
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <span className="player-bar__time" data-testid="public-player-time">
          {formatTime(tSec)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          className="player-bar__scrub"
          data-testid="public-player-scrub"
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
        <button
          type="button"
          className="player-bar__fullscreen"
          data-testid="public-player-fullscreen"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          disabled={exporting}
          onClick={() => void toggleFullscreen()}
        >
          {isFullscreen ? 'Exit' : 'Full'}
        </button>

        {showDownload && (
          <button
            type="button"
            className="player-bar__download"
            data-testid="public-download"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? 'Exporting…' : 'Download a video'}
          </button>
        )}

        {exporting && (
          <div
            className="player-bar__progress"
            data-testid="public-export-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div className="player-bar__progress-track">
              <div className="player-bar__progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="player-bar__progress-label">{pct}%</span>
          </div>
        )}

        {showFallbackNotice && (
          <p className="player-bar__notice" data-testid="export-fallback-notice" role="status">
            MP4 export needs WebCodecs. This browser will download WebM instead.
          </p>
        )}

        {exportError && (
          <p className="player-bar__error" data-testid="public-export-error" role="alert">
            {exportError}
          </p>
        )}
      </div>
    </div>
  )
}
