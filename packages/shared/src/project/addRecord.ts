import type { Project } from '../types/project.js'
import type { Record } from '../types/record.js'
import { createRecord } from '../types/record.js'
import type { ParsedChatExport } from '../parser/aggregate.js'
import { alignCountsToTicks, unionTicks } from '../ticks.js'

export type AddParsedRecordOptions = {
  id: string
  title?: string
  visible?: boolean
  avatarDataUrl?: string
}

/**
 * Merge a parsed single-chat export into a project: union the tick grids,
 * realign every record's cumulative series, and append the new record.
 * Pure — does not mutate the input project.
 */
export function addParsedExportToProject(
  project: Project,
  parsed: ParsedChatExport,
  options: AddParsedRecordOptions,
): Project {
  const nextTicks =
    project.ticks.length === 0 ? [...parsed.ticks] : unionTicks(project.ticks, parsed.ticks)

  const realigned: Record[] = project.records.map((record) => ({
    ...record,
    counts: alignCountsToTicks(project.ticks, record.counts, nextTicks),
  }))

  const newCounts = alignCountsToTicks(parsed.ticks, parsed.counts, nextTicks)
  const input = {
    id: options.id,
    sourceChatTitle: parsed.sourceChatTitle,
    counts: newCounts,
    ...(options.title !== undefined ? { title: options.title } : {}),
    ...(options.visible !== undefined ? { visible: options.visible } : {}),
    ...(options.avatarDataUrl !== undefined ? { avatarDataUrl: options.avatarDataUrl } : {}),
  }
  realigned.push(createRecord(input))

  return {
    ...project,
    ticks: nextTicks,
    records: realigned,
    updatedAt: project.updatedAt,
  }
}

/** Last cumulative count (message total) for a record, or 0 when empty. */
export function recordMessageTotal(record: Record): number {
  if (record.counts.length === 0) return 0
  return record.counts[record.counts.length - 1]!
}

/** Inclusive available date bounds from the project tick grid. */
export function projectDateBounds(project: Project): { start: string | null; end: string | null } {
  if (project.ticks.length === 0) return { start: null, end: null }
  return {
    start: project.ticks[0]!,
    end: project.ticks[project.ticks.length - 1]!,
  }
}
