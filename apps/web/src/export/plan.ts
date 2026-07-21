import { computeProjectDuration, type Project } from '@telegraphic/shared'

/** Export always targets 30 fps (preview + MP4 contract). */
export const EXPORT_FPS = 30

export type ExportPlan = {
  width: number
  height: number
  fps: number
  /** Total video length including start/finish delays (seconds). */
  durationSec: number
  frameCount: number
  /** Microseconds per frame. */
  frameDurationUs: number
}

/**
 * Pure planning helper: derive frame grid from project settings.
 * Duration includes start/finish delays via `computeProjectDuration`.
 */
export function planExport(project: Project, fps: number = EXPORT_FPS): ExportPlan {
  const { totalSeconds } = computeProjectDuration(project)
  const durationSec = Math.max(0, totalSeconds)
  const rawW = Math.max(2, Math.round(project.settings.screenSize.width))
  const rawH = Math.max(2, Math.round(project.settings.screenSize.height))
  // H.264 / many encoders require even dimensions.
  const width = rawW % 2 === 0 ? rawW : rawW + 1
  const height = rawH % 2 === 0 ? rawH : rawH + 1
  const safeFps = Math.max(1, Math.round(fps))
  const frameCount = Math.max(1, Math.round(durationSec * safeFps))
  const frameDurationUs = Math.round(1_000_000 / safeFps)
  return {
    width,
    height,
    fps: safeFps,
    durationSec: frameCount / safeFps,
    frameCount,
    frameDurationUs,
  }
}

/** Timeline second for frame index `i` (clamped to project duration). */
export function frameTimeSec(plan: ExportPlan, frameIndex: number): number {
  const t = frameIndex / plan.fps
  // Keep last frame at/under planned duration for delay-inclusive freeze frames.
  return Math.min(t, Math.max(0, plan.durationSec - 1 / plan.fps))
}
