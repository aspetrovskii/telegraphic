import type { Record } from './record.js'
import { createDefaultTotalSettings, type TotalSettings } from './settings.js'
import { createDefaultTheme, type Theme } from './theme.js'

/**
 * Saved rating project. Server stores aggregates + theme + metadata only —
 * never raw Telegram messages (AGENTS.md privacy rule).
 */
export type Project = {
  id: string
  ownerId: string
  title: string
  createdAt: string
  updatedAt: string
  /** ISO dates `YYYY-MM-DD`, daily grid shared by all records. */
  ticks: string[]
  records: Record[]
  settings: TotalSettings
  theme: Theme
}

export type CreateProjectInput = {
  id: string
  ownerId: string
  title: string
  /** ISO datetime; defaults left to caller for determinism. */
  createdAt: string
  updatedAt: string
  ticks?: string[]
  records?: Record[]
  settings?: TotalSettings
  theme?: Theme
}

export function createProject(input: CreateProjectInput): Project {
  return {
    id: input.id,
    ownerId: input.ownerId,
    title: input.title,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    ticks: input.ticks ?? [],
    records: input.records ?? [],
    settings: input.settings ?? createDefaultTotalSettings(),
    theme: input.theme ?? createDefaultTheme(),
  }
}
