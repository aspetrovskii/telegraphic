import type { Record as ProjectRecord } from '../types/record.js'

export type RankedEntry = {
  recordId: string
  value: number
  /** 0-based rank among visible records (0 = first / top). */
  rank: number
}

/**
 * Sort visible records by value descending; ties broken by record id (stable, deterministic).
 * Returns all visible entries with ranks; caller slices Top N.
 */
export function rankRecords(
  records: readonly ProjectRecord[],
  valuesById: ReadonlyMap<string, number>,
): RankedEntry[] {
  const entries: RankedEntry[] = []
  for (const record of records) {
    if (!record.visible) continue
    const value = valuesById.get(record.id) ?? 0
    entries.push({ recordId: record.id, value, rank: 0 })
  }
  entries.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value
    return a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0
  })
  for (let i = 0; i < entries.length; i++) {
    entries[i]!.rank = i
  }
  return entries
}

/** Top N slice of a ranked list. */
export function takeTopN(ranked: readonly RankedEntry[], topN: number): RankedEntry[] {
  const n = Math.max(0, Math.floor(topN))
  return ranked.slice(0, n)
}

/** Build a value map for one integer tick index (project-grid index). */
export function valuesAtProjectTick(
  records: readonly ProjectRecord[],
  tickIndex: number,
  countAt: (record: ProjectRecord, tickIndex: number) => number,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const record of records) {
    if (!record.visible) continue
    map.set(record.id, countAt(record, tickIndex))
  }
  return map
}
