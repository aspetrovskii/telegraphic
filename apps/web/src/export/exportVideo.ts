import type { Project } from '@telegraphic/shared'
import { detectExportCapabilities, isAvcConfigSupported, type ExportFormat } from './capabilities'
import { downloadBlob, exportFilename } from './download'
import { exportMp4 } from './exportMp4'
import { exportWebm } from './exportWebm'
import { EXPORT_FPS, planExport, type ExportPlan } from './plan'

export type ExportStage = 'preparing' | 'encoding' | 'finalizing' | 'done' | 'error'

export type ExportProgress = {
  stage: ExportStage
  ratio: number
  frame?: number
  totalFrames?: number
  format: ExportFormat
  usingFallback: boolean
  message?: string
}

export type ExportResult = {
  blob: Blob
  format: ExportFormat
  usingFallback: boolean
  plan: ExportPlan
  filename: string
  /** Wall-clock encode time (ms) — not used by the engine. */
  elapsedMs: number
}

export type ExportVideoOptions = {
  fps?: number
  forceFallback?: boolean
  /** When false, skip triggering a browser download (useful for tests). */
  download?: boolean
  onProgress?: (progress: ExportProgress) => void
  signal?: AbortSignal
}

/**
 * Full export pipeline: plan → WebCodecs/mp4-muxer (or MediaRecorder WebM) → download.
 */
export async function exportProjectVideo(
  project: Project,
  options: ExportVideoOptions = {},
): Promise<ExportResult> {
  const fps = options.fps ?? EXPORT_FPS
  const plan = planExport(project, fps)
  const caps = detectExportCapabilities(options.forceFallback === true)

  let format: ExportFormat = caps.preferredFormat
  let usingFallback = caps.willUseFallback

  if (!usingFallback) {
    const bitrate = plan.width * plan.height >= 1920 * 1080 ? 8_000_000 : 2_500_000
    const avcOk = await isAvcConfigSupported(plan.width, plan.height, bitrate)
    if (!avcOk) {
      usingFallback = true
      format = 'webm'
    }
  }

  if (usingFallback && !caps.mediaRecorder) {
    throw new Error(
      'Video export is not supported in this browser (need WebCodecs or MediaRecorder)',
    )
  }

  const report = (partial: Omit<ExportProgress, 'format' | 'usingFallback'>) => {
    options.onProgress?.({
      ...partial,
      format,
      usingFallback,
    })
  }

  report({ stage: 'preparing', ratio: 0, totalFrames: plan.frameCount })

  const started = performance.now()
  let blob: Blob

  const mp4Opts = {
    onProgress: (p: { frame: number; totalFrames: number; ratio: number }) =>
      report({
        stage: 'encoding' as const,
        ratio: p.ratio * 0.95,
        frame: p.frame,
        totalFrames: p.totalFrames,
      }),
    ...(options.signal ? { signal: options.signal } : {}),
  }

  const webmOpts = (message: string) => ({
    onProgress: (p: { frame: number; totalFrames: number; ratio: number }) =>
      report({
        stage: 'encoding' as const,
        ratio: p.ratio * 0.95,
        frame: p.frame,
        totalFrames: p.totalFrames,
        message,
      }),
    ...(options.signal ? { signal: options.signal } : {}),
  })

  try {
    if (!usingFallback) {
      blob = await exportMp4(project, plan, mp4Opts)
    } else {
      blob = await exportWebm(
        project,
        plan,
        webmOpts('Using WebM fallback (MP4 unavailable in this browser)'),
      )
    }
  } catch (err) {
    // If MP4 fails mid-flight, try WebM once (unless already fallback / aborted).
    if (
      !usingFallback &&
      caps.mediaRecorder &&
      !(err instanceof DOMException && err.name === 'AbortError')
    ) {
      usingFallback = true
      format = 'webm'
      report({
        stage: 'encoding',
        ratio: 0,
        totalFrames: plan.frameCount,
        message: 'MP4 encode failed; switching to WebM fallback',
      })
      blob = await exportWebm(project, plan, webmOpts('Using WebM fallback'))
    } else {
      report({
        stage: 'error',
        ratio: 0,
        message: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  }

  report({ stage: 'finalizing', ratio: 0.98, totalFrames: plan.frameCount })

  const filename = exportFilename(project.title, format)
  if (options.download !== false) {
    downloadBlob(blob, filename)
  }

  const result: ExportResult = {
    blob,
    format,
    usingFallback,
    plan,
    filename,
    elapsedMs: performance.now() - started,
  }

  report({ stage: 'done', ratio: 1, totalFrames: plan.frameCount })
  exposeLastExport(result)
  return result
}

export type LastExportProbe = {
  format: ExportFormat
  usingFallback: boolean
  width: number
  height: number
  fps: number
  durationSec: number
  frameCount: number
  byteLength: number
  mimeType: string
  filename: string
}

function exposeLastExport(result: ExportResult): void {
  if (typeof window === 'undefined') return
  const probe: LastExportProbe = {
    format: result.format,
    usingFallback: result.usingFallback,
    width: result.plan.width,
    height: result.plan.height,
    fps: result.plan.fps,
    durationSec: result.plan.durationSec,
    frameCount: result.plan.frameCount,
    byteLength: result.blob.size,
    mimeType: result.blob.type,
    filename: result.filename,
  }
  ;(window as unknown as { __telegraphicLastExport?: LastExportProbe }).__telegraphicLastExport =
    probe
}
