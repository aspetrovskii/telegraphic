/** Linear interpolation. Pure. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Clamp `t` into [0, 1]. */
export function clamp01(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t
}

/** Smoothstep easing in [0, 1] — still a pure function of `t`. */
export function smoothstep(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}
