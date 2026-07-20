/** Global rating settings from the Total panel (PRD §2.2). */

export type SpeedMode = 'totalLength' | 'daysPerSecond'

export type ScreenSizePreset = '1920x1080' | '1080x1920' | '1080x1080' | 'custom'

export type ScreenSize = {
  preset: ScreenSizePreset
  width: number
  height: number
}

export type DatesInterval = {
  /** Inclusive ISO date `YYYY-MM-DD`, or null for data start. */
  start: string | null
  /** Inclusive ISO date `YYYY-MM-DD`, or null for data end. */
  end: string | null
}

export type TotalSettings = {
  /** How many positions on screen. Default 15. */
  topN: number
  datesInterval: DatesInterval
  /** Bar length scale relative to auto-fit, 0–500 (%). Default 100. */
  scale: number
  screenSize: ScreenSize
  speedMode: SpeedMode
  /** Seconds (totalLength) or days (daysPerSecond), depending on mode. */
  speedValue: number
  /** Freeze frame at start, seconds. */
  startDelay: number
  /** Freeze frame at end, seconds. */
  finishDelay: number
  /** Aggregate granularity in days (smoothing window). Default 1. */
  smoothingInterval: number
}

export const DEFAULT_TOP_N = 15
export const DEFAULT_SCALE = 100
export const DEFAULT_SPEED_VALUE_TOTAL_LENGTH = 30
export const DEFAULT_SMOOTHING_INTERVAL = 1

export const SCREEN_SIZE_PRESETS: Record<
  Exclude<ScreenSizePreset, 'custom'>,
  { width: number; height: number }
> = {
  '1920x1080': { width: 1920, height: 1080 },
  '1080x1920': { width: 1080, height: 1920 },
  '1080x1080': { width: 1080, height: 1080 },
}

export function createDefaultTotalSettings(): TotalSettings {
  return {
    topN: DEFAULT_TOP_N,
    datesInterval: { start: null, end: null },
    scale: DEFAULT_SCALE,
    screenSize: {
      preset: '1920x1080',
      ...SCREEN_SIZE_PRESETS['1920x1080'],
    },
    speedMode: 'totalLength',
    speedValue: DEFAULT_SPEED_VALUE_TOTAL_LENGTH,
    startDelay: 0,
    finishDelay: 0,
    smoothingInterval: DEFAULT_SMOOTHING_INTERVAL,
  }
}
