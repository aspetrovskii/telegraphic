import { z } from 'zod'

/**
 * Telegram Desktop single-chat `result.json` boundary schema.
 * Full-account exports (`chats.list`) are rejected elsewhere.
 * Unknown message fields are allowed (forward-compatible).
 */

const messageEntitySchema = z
  .object({
    type: z.string(),
    text: z.string(),
  })
  .passthrough()

const textFieldSchema = z.union([z.string(), z.array(z.union([z.string(), messageEntitySchema]))])

export const telegramMessageSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    type: z.string(),
    date: z.string().optional(),
    date_unixtime: z.union([z.string(), z.number()]).optional(),
    text: textFieldSchema.optional(),
    action: z.string().optional(),
  })
  .passthrough()

export const telegramChatExportSchema = z
  .object({
    name: z.string(),
    type: z.string().optional(),
    id: z.union([z.number(), z.string()]).optional(),
    messages: z.array(telegramMessageSchema),
  })
  .passthrough()

export type TelegramMessage = z.infer<typeof telegramMessageSchema>
export type TelegramChatExport = z.infer<typeof telegramChatExportSchema>

/** Detect full-account export shape (multi-chat). */
export function isFullAccountExport(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const obj = value as { chats?: unknown }
  if (!obj.chats || typeof obj.chats !== 'object') return false
  const chats = obj.chats as { list?: unknown }
  return Array.isArray(chats.list) && chats.list.length > 0
}
