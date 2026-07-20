export type { EngineCanvasContext, EngineCanvasGradient, EngineTextMetrics } from './canvas.js'
export { lerp, clamp01, smoothstep } from './interpolate.js'
export { computeProjectDuration, type ProjectDuration } from './duration.js'
export { resolvePlaybackTicks, tickIndexInProject, countAtTick } from './ticksWindow.js'
export { rankRecords, takeTopN, valuesAtProjectTick, type RankedEntry } from './ranking.js'
export { niceCeiling, axisCeilingForValues, lerpAxisCeiling } from './axis.js'
export { playbackPositionAt, type PlaybackPosition } from './time.js'
export {
  formatTimerDate,
  formatTimerClock,
  formatValue,
  colorForRecordId,
  initialsFromTitle,
} from './format.js'
export { computeFrameLayout, type FrameLayout, type BarLayout } from './layout.js'
export { drawFrame } from './draw.js'
export { render } from './render.js'
