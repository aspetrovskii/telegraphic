import { render, type Project } from '@telegraphic/shared'
import { pickWebmMimeType } from './capabilities'
import { frameTimeSec, type ExportPlan } from './plan'

export type WebmProgress = {
  frame: number
  totalFrames: number
  ratio: number
}

type CanvasCaptureMediaStreamTrack = MediaStreamTrack & {
  requestFrame?: () => void
}

/**
 * MediaRecorder / WebM fallback when WebCodecs MP4 is unavailable.
 * Draws engine frames onto a canvas stream and records them.
 */
export async function exportWebm(
  project: Project,
  plan: ExportPlan,
  options: {
    onProgress?: (p: WebmProgress) => void
    signal?: AbortSignal
  } = {},
): Promise<Blob> {
  const { onProgress, signal } = options
  throwIfAborted(signal)

  const mimeType = pickWebmMimeType()
  if (!mimeType) {
    throw new Error('MediaRecorder WebM is not supported in this browser')
  }

  const canvas = document.createElement('canvas')
  canvas.width = plan.width
  canvas.height = plan.height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Could not create 2D canvas context for export')

  // fps=0 → manual frame push via requestFrame when available.
  const stream = canvas.captureStream(0)
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined
  if (!track) throw new Error('Could not capture canvas video track')

  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: bitrateForSize(plan.width, plan.height),
  })

  recorder.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data)
  }

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve()
    recorder.onerror = () => reject(new Error('MediaRecorder failed during export'))
  })

  recorder.start(200)

  const frameIntervalMs = 1000 / plan.fps
  let lastDraw = performance.now()

  for (let i = 0; i < plan.frameCount; i++) {
    throwIfAborted(signal)
    const tSec = frameTimeSec(plan, i)
    render(ctx, project, tSec)
    if (typeof track.requestFrame === 'function') {
      track.requestFrame()
    }

    onProgress?.({
      frame: i + 1,
      totalFrames: plan.frameCount,
      ratio: (i + 1) / plan.frameCount,
    })

    // Pace roughly at target fps so MediaRecorder timestamps stay coherent.
    const target = lastDraw + frameIntervalMs
    const now = performance.now()
    const wait = Math.max(0, target - now)
    if (wait > 0) await sleep(wait, signal)
    lastDraw = performance.now()
  }

  throwIfAborted(signal)
  // Final frame dwell so the last sample is recorded.
  await sleep(frameIntervalMs, signal)
  recorder.stop()
  track.stop()
  await stopped

  if (chunks.length === 0) {
    throw new Error('MediaRecorder produced an empty WebM file')
  }

  return new Blob(chunks, { type: mimeType.startsWith('video/webm') ? 'video/webm' : mimeType })
}

function bitrateForSize(width: number, height: number): number {
  const pixels = width * height
  if (pixels >= 1920 * 1080) return 6_000_000
  if (pixels >= 1280 * 720) return 3_500_000
  return 1_500_000
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Export aborted', 'AbortError')
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Export aborted', 'AbortError'))
      return
    }
    const id = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(id)
      reject(new DOMException('Export aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
