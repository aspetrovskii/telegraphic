import type { Project } from '../types/project.js'
import type { Record as ProjectRecord } from '../types/record.js'

/**
 * Clip project ticks to datesInterval and downsample by smoothingInterval.
 * Returns the ISO dates used as the playback grid.
 */
export function resolvePlaybackTicks(project: Project): string[] {
  const { ticks, settings } = project
  if (ticks.length === 0) return []

  const { start, end } = settings.datesInterval
  let lo = 0
  let hi = ticks.length - 1

  if (start !== null) {
    const idx = ticks.findIndex((t) => t >= start)
    lo = idx === -1 ? ticks.length : idx
  }
  if (end !== null) {
    let last = -1
    for (let i = lo; i < ticks.length; i++) {
      if (ticks[i]! <= end) last = i
      else break
    }
    hi = last
  }

  if (lo > hi || lo >= ticks.length) return []

  const step = Math.max(1, Math.floor(settings.smoothingInterval))
  const out: string[] = []
  for (let i = lo; i <= hi; i += step) {
    out.push(ticks[i]!)
  }
  // Always include the last day of the clipped range so the race reaches the end.
  if (out.length === 0 || out[out.length - 1] !== ticks[hi]!) {
    out.push(ticks[hi]!)
  }
  return out
}

/** Map a playback-tick ISO date back to the index in the full project.ticks array. */
export function tickIndexInProject(project: Project, isoDate: string): number {
  return project.ticks.indexOf(isoDate)
}

/**
 * Cumulative count for a record at a full-grid tick index.
 * Out-of-range → 0; uses last known count if array is shorter (defensive).
 */
export function countAtTick(record: ProjectRecord, tickIndex: number): number {
  if (tickIndex < 0) return 0
  if (record.counts.length === 0) return 0
  if (tickIndex >= record.counts.length) {
    return record.counts[record.counts.length - 1]!
  }
  return record.counts[tickIndex]!
}
