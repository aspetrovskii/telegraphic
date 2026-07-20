import type { Project } from '../types/project.js'
import { computeProjectDuration } from './duration.js'
import { clamp01 } from './interpolate.js'
import { resolvePlaybackTicks } from './ticksWindow.js'

export type PlaybackPosition = {
  /** Clamped tSec used for rendering. */
  tSec: number
  /** 0–1 progress through the animated race (delays excluded). */
  raceProgress: number
  /** Fractional index into playback ticks: [0, tickCount-1]. */
  tickFloat: number
  /** Floor / ceil playback-tick indices. */
  tickIndexA: number
  tickIndexB: number
  /** Blend factor between A and B in [0, 1]. */
  tickT: number
  /** ISO date used for the timer label (from tick A, or B when exactly on B). */
  timerDate: string | null
  totalSeconds: number
}

/**
 * Map wall-clock `tSec` into a fractional playback-tick position.
 * Start/finish delays freeze the first/last frame.
 */
export function playbackPositionAt(project: Project, tSec: number): PlaybackPosition {
  const { animationSeconds, totalSeconds } = computeProjectDuration(project)
  const ticks = resolvePlaybackTicks(project)
  const t = Number.isFinite(tSec) ? Math.max(0, tSec) : 0
  const startDelay = Math.max(0, project.settings.startDelay)

  let raceProgress = 0
  if (animationSeconds <= 0 || ticks.length <= 1) {
    raceProgress = t <= startDelay ? 0 : 1
  } else if (t <= startDelay) {
    raceProgress = 0
  } else if (t >= startDelay + animationSeconds) {
    raceProgress = 1
  } else {
    raceProgress = (t - startDelay) / animationSeconds
  }
  raceProgress = clamp01(raceProgress)

  const last = Math.max(0, ticks.length - 1)
  const tickFloat = raceProgress * last
  const tickIndexA = Math.min(last, Math.floor(tickFloat))
  const tickIndexB = Math.min(last, tickIndexA + (ticks.length <= 1 ? 0 : 1))
  const tickT = ticks.length <= 1 ? 0 : clamp01(tickFloat - tickIndexA)

  const timerDate =
    ticks.length === 0
      ? null
      : tickT >= 1 - 1e-9
        ? (ticks[tickIndexB] ?? null)
        : (ticks[tickIndexA] ?? null)

  return {
    tSec: t,
    raceProgress,
    tickFloat,
    tickIndexA,
    tickIndexB,
    tickT,
    timerDate,
    totalSeconds,
  }
}
