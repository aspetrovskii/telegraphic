import type { Project } from '../types/project.js'
import { resolvePlaybackTicks } from './ticksWindow.js'

/**
 * Animation span (excluding start/finish delays) and total video duration.
 * Pure function of project settings + tick grid.
 */
export type ProjectDuration = {
  /** Seconds of animated race (between delays). */
  animationSeconds: number
  /** Total video length including start/finish delays. */
  totalSeconds: number
  /** Number of playback ticks after interval + smoothing. */
  tickCount: number
}

/** Whole UTC calendar days between two ISO dates (end − start). */
function calendarDaySpan(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split('-').map(Number) as [number, number, number]
  const [ey, em, ed] = endIso.split('-').map(Number) as [number, number, number]
  const start = Date.UTC(sy, sm - 1, sd)
  const end = Date.UTC(ey, em - 1, ed)
  return Math.max(0, Math.round((end - start) / 86_400_000))
}

export function computeProjectDuration(project: Project): ProjectDuration {
  const ticks = resolvePlaybackTicks(project)
  const tickCount = ticks.length
  // Calendar span of the playback window (honors smoothing stride).
  const daySpan = tickCount <= 1 ? 0 : calendarDaySpan(ticks[0]!, ticks[tickCount - 1]!)

  let animationSeconds: number
  if (project.settings.speedMode === 'totalLength') {
    animationSeconds = Math.max(0, project.settings.speedValue)
  } else if (project.settings.speedValue <= 0) {
    // Zero/negative days-per-second → no animated span (freeze on first/last via delays).
    animationSeconds = 0
  } else {
    // daysPerSecond: each video second covers `speedValue` calendar days
    animationSeconds = daySpan / project.settings.speedValue
  }

  const startDelay = Math.max(0, project.settings.startDelay)
  const finishDelay = Math.max(0, project.settings.finishDelay)
  const totalSeconds = startDelay + animationSeconds + finishDelay

  return { animationSeconds, totalSeconds, tickCount }
}
