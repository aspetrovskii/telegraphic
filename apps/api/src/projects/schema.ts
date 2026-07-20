import { z } from 'zod'
import {
  createDefaultTheme,
  createDefaultTotalSettings,
  type Project,
  type Record,
  type Theme,
  type TotalSettings,
} from '@telegraphic/shared'

/** Reject oversized project payloads (avatars already client-resized). */
export const MAX_PROJECT_PAYLOAD_BYTES = 2 * 1024 * 1024 // 2 MiB

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoDateTime = z.string().min(10)

const recordSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  sourceChatTitle: z.string(),
  color: z.string().optional(),
  avatarDataUrl: z.string().optional(),
  visible: z.boolean(),
  counts: z.array(z.number()),
})

const totalSettingsSchema: z.ZodType<TotalSettings> = z.object({
  topN: z.number(),
  datesInterval: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
  }),
  scale: z.number(),
  screenSize: z.object({
    preset: z.enum(['1920x1080', '1080x1920', '1080x1080', 'custom']),
    width: z.number(),
    height: z.number(),
  }),
  speedMode: z.enum(['totalLength', 'daysPerSecond']),
  speedValue: z.number(),
  startDelay: z.number(),
  finishDelay: z.number(),
  smoothingInterval: z.number(),
})

const themeSchema = z.custom<Theme>((val) => val !== null && typeof val === 'object')

export const projectBodySchema = z.object({
  title: z.string().min(1).max(200),
  ticks: z.array(isoDate).default([]),
  records: z.array(recordSchema).default([]),
  settings: totalSettingsSchema.optional(),
  theme: themeSchema.optional(),
  thumbnailDataUrl: z.string().nullable().optional(),
})

export const projectPatchSchema = projectBodySchema.partial().extend({
  title: z.string().min(1).max(200).optional(),
})

export const projectListQuerySchema = z.object({
  q: z.string().optional().default(''),
  sort: z.enum(['updatedAt', 'title']).optional().default('updatedAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type ProjectRow = {
  id: string
  owner_id: string
  title: string
  created_at: string
  updated_at: string
  ticks_json: string
  records_json: string
  settings_json: string
  theme_json: string
  thumbnail_data_url: string | null
}

export type ProjectSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  thumbnailDataUrl: string | null
}

export type ProjectDetail = Project & {
  thumbnailDataUrl: string | null
}

export function rowToProject(row: ProjectRow): ProjectDetail {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ticks: JSON.parse(row.ticks_json) as string[],
    records: JSON.parse(row.records_json) as Record[],
    settings: JSON.parse(row.settings_json) as TotalSettings,
    theme: JSON.parse(row.theme_json) as Theme,
    thumbnailDataUrl: row.thumbnail_data_url,
  }
}

export function rowToSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnailDataUrl: row.thumbnail_data_url,
  }
}

export function defaultProjectPayload(title = 'Untitled rating') {
  return {
    title,
    ticks: [] as string[],
    records: [] as Record[],
    settings: createDefaultTotalSettings(),
    theme: createDefaultTheme(),
    thumbnailDataUrl: null as string | null,
  }
}

export function assertPayloadSize(rawBody: string): void {
  const bytes = Buffer.byteLength(rawBody, 'utf8')
  if (bytes > MAX_PROJECT_PAYLOAD_BYTES) {
    const err = new Error(
      `Project payload too large (${bytes} bytes; max ${MAX_PROJECT_PAYLOAD_BYTES})`,
    )
    ;(err as Error & { status: number }).status = 413
    throw err
  }
}

export { isoDateTime }
