/**
 * Dynamic X-axis ceiling helpers.
 * Nice numbers keep labels readable; lerping ceilings between ticks avoids jitter.
 */

const NICE_STEPS = [1, 2, 2.5, 5, 10] as const

/**
 * Round `value` up to a "nice" axis ceiling (1–2–2.5–5 × 10^k).
 * Returns at least `minCeiling` (default 1) so a zero frame still has a scale.
 */
export function niceCeiling(value: number, minCeiling = 1): number {
  if (!Number.isFinite(value) || value <= 0) return minCeiling
  const exp = Math.floor(Math.log10(value))
  const base = Math.pow(10, exp)
  const mantissa = value / base
  for (const step of NICE_STEPS) {
    if (mantissa <= step + 1e-12) {
      return Math.max(minCeiling, step * base)
    }
  }
  return Math.max(minCeiling, 10 * base)
}

/**
 * Axis ceiling for a set of bar values (typically current Top N widths).
 */
export function axisCeilingForValues(values: readonly number[], minCeiling = 1): number {
  let max = 0
  for (const v of values) {
    if (v > max) max = v
  }
  return niceCeiling(max, minCeiling)
}

/**
 * Interpolate axis ceilings between two ticks.
 * Uses the max of the two nice ceilings so the scale never shrinks mid-transition
 * in a way that makes bars overflow; still lerps for smooth growth.
 */
export function lerpAxisCeiling(ceilingA: number, ceilingB: number, t: number): number {
  // Prefer the larger end so bars never exceed the drawn axis during a shrink.
  const hi = Math.max(ceilingA, ceilingB)
  const lo = Math.min(ceilingA, ceilingB)
  // Approach the higher ceiling quickly; ease down slowly via plain lerp of the pair.
  if (ceilingB >= ceilingA) {
    return ceilingA + (ceilingB - ceilingA) * t
  }
  // Shrinking: hold high until late in the segment, then ease down.
  const hold = 0.65
  if (t <= hold) return hi
  const u = (t - hold) / (1 - hold)
  return hi + (lo - hi) * u
}
