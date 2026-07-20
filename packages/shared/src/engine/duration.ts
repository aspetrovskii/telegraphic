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

export function computeProjectDuration(project: Project): ProjectDuration {
  const ticks = resolvePlaybackTicks(project)
  const tickCount = ticks.length
  const daySpan = Math.max(0, tickCount - 1)

  let animationSeconds: number
  if (project.settings.speedMode === 'totalLength') {
    animationSeconds = Math.max(0, project.settings.speedValue)
  } else {
    // daysPerSecond: each video second covers `speedValue` days
    const daysPerSecond = Math.max(1e-9, project.settings.speedValue)
    animationSeconds = daySpan / daysPerSecond
  }

  const startDelay = Math.max(0, project.settings.startDelay)
  const finishDelay = Math.max(0, project.settings.finishDelay)
  const totalSeconds = startDelay + animationSeconds + finishDelay

  return { animationSeconds, totalSeconds, tickCount }
}
