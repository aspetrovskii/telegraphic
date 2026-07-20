import type { TimerFormat } from '../types/theme.js'
import type { ValueFormat } from '../types/theme.js'

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

/** Format an ISO date for the timer label. Pure. */
export function formatTimerDate(isoDate: string, format: TimerFormat): string {
  const parsed = parseIsoDate(isoDate)
  if (!parsed) return isoDate
  const { y, m, d } = parsed
  const dd = String(d).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const mon = MONTHS_SHORT[m - 1] ?? mm
  switch (format) {
    case 'DD/MM/YY':
      return `${dd}/${mm}/${String(y).slice(-2)}`
    case 'DD MMM YYYY':
      return `${dd} ${mon} ${y}`
    case 'MMM YYYY':
      return `${mon} ${y}`
    case 'YYYY':
      return String(y)
    case 'Q# YYYY': {
      const q = Math.floor((m - 1) / 3) + 1
      return `Q${q} ${y}`
    }
    default:
      return isoDate
  }
}

/**
 * Second-line clock for the timer when `showTime` is on and smoothing &lt; 1 day.
 * `dayFraction` in [0, 1) maps to HH:MM (deterministic; no wall clock).
 */
export function formatTimerClock(dayFraction: number): string {
  const clamped = Number.isFinite(dayFraction) ? Math.min(Math.max(dayFraction, 0), 0.999999) : 0
  const totalMinutes = Math.floor(clamped * 24 * 60)
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * Format a bar value label.
 * `compact`: 1280 → 1.3k, 1_280_000 → 1.3M (decimals from theme).
 */
export function formatValue(
  value: number,
  opts: { format: ValueFormat; decimals: number; thousandsSeparator: boolean },
): string {
  const v = Number.isFinite(value) ? value : 0
  if (opts.format === 'compact') {
    const abs = Math.abs(v)
    const decimals = Math.max(0, Math.floor(opts.decimals))
    if (abs >= 1_000_000) {
      return trimTrailingZeros((v / 1_000_000).toFixed(decimals)) + 'M'
    }
    if (abs >= 1_000) {
      return trimTrailingZeros((v / 1_000).toFixed(decimals)) + 'k'
    }
    // Below 1k: still honor `decimals` (message counts are usually whole numbers).
    return trimTrailingZeros(v.toFixed(decimals))
  }

  const decimals = Math.max(0, Math.floor(opts.decimals))
  const text = decimals > 0 ? v.toFixed(decimals) : String(Math.round(v))
  if (!opts.thousandsSeparator) return text
  const [intPart, frac] = text.split('.') as [string, string | undefined]
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac !== undefined ? `${withSep}.${frac}` : withSep
}

function trimTrailingZeros(s: string): string {
  if (!s.includes('.')) return s
  return s.replace(/\.?0+$/, '')
}

/** Deterministic color from palette by record id. */
export function colorForRecordId(
  recordId: string,
  palette: readonly string[],
  fallback: string,
): string {
  if (palette.length === 0) return fallback
  let hash = 0
  for (let i = 0; i < recordId.length; i++) {
    hash = (hash * 31 + recordId.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % palette.length
  return palette[idx] ?? fallback
}

/** Initials fallback for missing avatars (up to 2 chars). */
export function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    const w = parts[0]!
    return w.slice(0, 2).toUpperCase()
  }
  return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase()
}
