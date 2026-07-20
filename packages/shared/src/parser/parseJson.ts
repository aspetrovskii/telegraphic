import { ParseError } from './errors.js'
import {
  aggregateDailyCumulative,
  type ParsedChatExport,
  type ProgressCallback,
} from './aggregate.js'
import { isFullAccountExport, telegramChatExportSchema } from './schema.js'

function report(
  onProgress: ProgressCallback | undefined,
  stage: 'reading' | 'parsing',
  ratio?: number,
) {
  if (!onProgress) return
  const progress = ratio === undefined ? { stage } : { stage, ratio }
  onProgress(progress)
}

/**
 * Parse a Telegram Desktop single-chat export object (already JSON-parsed).
 */
export function parseTelegramChatExport(
  value: unknown,
  onProgress?: ProgressCallback,
): ParsedChatExport {
  report(onProgress, 'parsing', 0)

  if (isFullAccountExport(value)) {
    throw new ParseError(
      'NOT_SINGLE_CHAT',
      'Expected a single-chat Telegram Desktop export (result.json with name + messages). Full account exports with chats.list are not supported — export one chat at a time.',
    )
  }

  const parsed = telegramChatExportSchema.safeParse(value)
  if (!parsed.success) {
    const hasMessages =
      value &&
      typeof value === 'object' &&
      Array.isArray((value as { messages?: unknown }).messages)
    if (!hasMessages) {
      throw new ParseError(
        'MISSING_MESSAGES',
        'Not a valid single-chat export: missing name and/or messages array.',
        { cause: parsed.error },
      )
    }
    throw new ParseError(
      'MISSING_MESSAGES',
      `Invalid Telegram export shape: ${parsed.error.message}`,
      { cause: parsed.error },
    )
  }

  const chat = parsed.data
  if (chat.messages.length === 0) {
    throw new ParseError('EMPTY_EXPORT', 'Chat export contains an empty messages array.')
  }

  report(onProgress, 'parsing', 1)
  const series = aggregateDailyCumulative(chat.messages, onProgress)
  onProgress?.({ stage: 'done', ratio: 1 })

  return {
    sourceChatTitle: chat.name,
    ticks: series.ticks,
    counts: series.counts,
    messageTotal: series.messageTotal,
  }
}

/**
 * Parse JSON text of a single-chat `result.json`.
 */
export function parseTelegramChatExportJson(
  text: string,
  onProgress?: ProgressCallback,
): ParsedChatExport {
  report(onProgress, 'reading', 0)
  let value: unknown
  try {
    value = JSON.parse(text) as unknown
  } catch (err) {
    throw new ParseError('INVALID_JSON', 'File is not valid JSON (truncated or malformed).', {
      cause: err,
    })
  }
  report(onProgress, 'reading', 1)
  return parseTelegramChatExport(value, onProgress)
}

/**
 * Decode UTF-8 bytes then parse as single-chat export JSON.
 */
export function parseTelegramChatExportBytes(
  bytes: Uint8Array,
  onProgress?: ProgressCallback,
): ParsedChatExport {
  report(onProgress, 'reading', 0)
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (err) {
    throw new ParseError('INVALID_JSON', 'File is not valid UTF-8 JSON.', { cause: err })
  }
  return parseTelegramChatExportJson(text, onProgress)
}
