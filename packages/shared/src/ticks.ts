/**
 * Daily tick helpers — ISO dates `YYYY-MM-DD`, sorted ascending, unique.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** Inclusive daily range from start to end (ISO dates). */
export function enumerateDays(start: string, end: string): string[] {
  if (!isIsoDate(start) || !isIsoDate(end)) {
    throw new Error(`Invalid ISO date range: ${start} … ${end}`)
  }
  if (start > end) {
    throw new Error(`Start date ${start} is after end date ${end}`)
  }
  const out: string[] = []
  const [sy, sm, sd] = start.split('-').map(Number) as [number, number, number]
  const cursor = new Date(Date.UTC(sy, sm - 1, sd))
  const endMs = (() => {
    const [ey, em, ed] = end.split('-').map(Number) as [number, number, number]
    return Date.UTC(ey, em - 1, ed)
  })()
  while (cursor.getTime() <= endMs) {
    const y = cursor.getUTCFullYear()
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0')
    const d = String(cursor.getUTCDate()).padStart(2, '0')
    out.push(`${y}-${m}-${d}`)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

/** Sorted unique union of tick arrays. */
export function unionTicks(...arrays: string[][]): string[] {
  const set = new Set<string>()
  for (const arr of arrays) {
    for (const t of arr) {
      if (!isIsoDate(t)) {
        throw new Error(`Invalid tick date: ${t}`)
      }
      set.add(t)
    }
  }
  return [...set].sort()
}

/**
 * Align cumulative `counts` (indexed by `fromTicks`) onto `toTicks`.
 * For each target day, uses the last cumulative value whose source day ≤ target.
 * Days before the first source tick get 0.
 * Both tick arrays must be sorted ascending.
 */
export function alignCountsToTicks(
  fromTicks: string[],
  counts: number[],
  toTicks: string[],
): number[] {
  if (fromTicks.length !== counts.length) {
    throw new Error(`fromTicks length (${fromTicks.length}) !== counts length (${counts.length})`)
  }
  assertSortedAscending(fromTicks, 'fromTicks')
  assertSortedAscending(toTicks, 'toTicks')

  const result = new Array<number>(toTicks.length)
  let i = 0
  let last = 0
  for (let t = 0; t < toTicks.length; t++) {
    const day = toTicks[t]!
    while (i < fromTicks.length && fromTicks[i]! <= day) {
      last = counts[i]!
      i++
    }
    result[t] = last
  }
  return result
}

function assertSortedAscending(ticks: string[], label: string): void {
  for (let i = 1; i < ticks.length; i++) {
    const prev = ticks[i - 1]!
    const cur = ticks[i]!
    if (cur < prev) {
      throw new Error(`${label} must be sorted ascending (saw ${prev} before ${cur})`)
    }
  }
}
