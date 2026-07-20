/**
 * A record = one chat in the rating.
 * One Telegram Desktop single-chat export → one record (PRD §2.2 Data).
 */
export type Record = {
  id: string
  /** Editable display title (rename in Data panel). */
  title: string
  /** Original chat name from the export. */
  sourceChatTitle: string
  /** Per-card bar color override. */
  color?: string
  /** Client-resized avatar data URL (~128px). */
  avatarDataUrl?: string
  visible: boolean
  /** Cumulative message counts aligned to project `ticks`. */
  counts: number[]
}

export type CreateRecordInput = {
  id: string
  title?: string
  sourceChatTitle: string
  counts: number[]
  color?: string
  avatarDataUrl?: string
  visible?: boolean
}

export function createRecord(input: CreateRecordInput): Record {
  const record: Record = {
    id: input.id,
    title: input.title ?? input.sourceChatTitle,
    sourceChatTitle: input.sourceChatTitle,
    visible: input.visible ?? true,
    counts: input.counts,
  }
  if (input.color !== undefined) {
    record.color = input.color
  }
  if (input.avatarDataUrl !== undefined) {
    record.avatarDataUrl = input.avatarDataUrl
  }
  return record
}
