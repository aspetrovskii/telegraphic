import { createRecord, type CreateRecordInput, type Record } from '../types/record.js'
import { enumerateDays, isIsoDate } from '../ticks.js'
import { ParseError } from './errors.js'
import type { TelegramMessage } from './schema.js'

export type ParseProgressStage = 'reading' | 'extracting' | 'parsing' | 'aggregating' | 'done'

export type ParseProgress = {
  stage: ParseProgressStage
  /** 0–1 when known; omitted for indeterminate stages. */
  ratio?: number
}

export type ParsedChatExport = {
  sourceChatTitle: string
  /** Inclusive daily ISO dates covering first→last countable message. */
  ticks: string[]
  /** Cumulative message counts aligned to `ticks` (empty days carry forward). */
  counts: number[]
  /** Total countable messages (`type === "message"`). */
  messageTotal: number
}

export type ProgressCallback = (progress: ParseProgress) => void

/**
 * Calendar day from Telegram's local `date` field (`YYYY-MM-DDTHH:mm:ss`).
 * Prefer this over UTC conversion of `date_unixtime` so day buckets match
 * the exporter's local timezone.
 */
export function dayKeyFromTelegramDate(date: string): string | null {
  if (date.length < 10) return null
  const key = date.slice(0, 10)
  if (!isIsoDate(key)) return null
  return key
}

/** Countable user/content messages only — service messages are excluded. */
export function isCountableMessage(msg: TelegramMessage): boolean {
  return msg.type === 'message'
}

/**
 * Build daily cumulative series from validated chat messages.
 * Empty calendar days between first and last message carry the previous total.
 */
export function aggregateDailyCumulative(
  messages: TelegramMessage[],
  onProgress?: ProgressCallback,
): { ticks: string[]; counts: number[]; messageTotal: number } {
  onProgress?.({ stage: 'aggregating', ratio: 0 })

  const dailyIncrements = new Map<string, number>()
  let messageTotal = 0
  const total = messages.length

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!
    if (!isCountableMessage(msg)) continue
    const dateStr = msg.date
    if (!dateStr) continue
    const day = dayKeyFromTelegramDate(dateStr)
    if (!day) continue
    dailyIncrements.set(day, (dailyIncrements.get(day) ?? 0) + 1)
    messageTotal++
    if (onProgress && total > 0 && i % 2048 === 0) {
      onProgress({ stage: 'aggregating', ratio: i / total })
    }
  }

  if (messageTotal === 0) {
    throw new ParseError(
      'NO_COUNTABLE_MESSAGES',
      'Export has no countable messages (type "message"). Service-only chats cannot form a rating series.',
    )
  }

  const days = [...dailyIncrements.keys()].sort()
  const first = days[0]!
  const last = days[days.length - 1]!
  const ticks = enumerateDays(first, last)
  const counts = new Array<number>(ticks.length)
  let cumulative = 0
  for (let i = 0; i < ticks.length; i++) {
    cumulative += dailyIncrements.get(ticks[i]!) ?? 0
    counts[i] = cumulative
  }

  onProgress?.({ stage: 'aggregating', ratio: 1 })
  return { ticks, counts, messageTotal }
}

export function parsedExportToRecord(
  parsed: ParsedChatExport,
  options: { id: string; title?: string; visible?: boolean },
): Record {
  const input: CreateRecordInput = {
    id: options.id,
    sourceChatTitle: parsed.sourceChatTitle,
    counts: parsed.counts,
  }
  if (options.title !== undefined) {
    input.title = options.title
  }
  if (options.visible !== undefined) {
    input.visible = options.visible
  }
  return createRecord(input)
}
