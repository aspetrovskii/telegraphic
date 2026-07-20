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

function utcDayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/**
 * Map wall-clock `tSec` into a fractional playback-tick position.
 * Start/finish delays freeze the first/last frame.
 *
 * - `totalLength`: progress is uniform across playback tick indices.
 * - `daysPerSecond`: progress is uniform across calendar days between the
 *   first and last playback ticks, so unequal gaps get proportional wall time.
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

  let tickIndexA = 0
  let tickIndexB = 0
  let tickT = 0
  let tickFloat = 0

  if (ticks.length <= 1) {
    tickIndexA = 0
    tickIndexB = 0
    tickT = 0
    tickFloat = 0
  } else if (project.settings.speedMode === 'daysPerSecond') {
    const startDay = utcDayNumber(ticks[0]!)
    const endDay = utcDayNumber(ticks[last]!)
    const targetDay = startDay + raceProgress * (endDay - startDay)
    let a = 0
    for (let i = 0; i < last; i++) {
      if (utcDayNumber(ticks[i + 1]!) >= targetDay - 1e-9) {
        a = i
        break
      }
      a = i
    }
    const b = Math.min(last, a + 1)
    const dayA = utcDayNumber(ticks[a]!)
    const dayB = utcDayNumber(ticks[b]!)
    tickIndexA = a
    tickIndexB = b
    tickT = dayB <= dayA ? 0 : clamp01((targetDay - dayA) / (dayB - dayA))
    tickFloat = a + tickT
  } else {
    tickFloat = raceProgress * last
    tickIndexA = Math.min(last, Math.floor(tickFloat))
    tickIndexB = Math.min(last, tickIndexA + 1)
    tickT = clamp01(tickFloat - tickIndexA)
  }

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
