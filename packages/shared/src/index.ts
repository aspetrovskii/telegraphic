/**
 * Shared types, Telegram export parser, and canvas bar-race engine.
 * Phase 0: placeholder only — implement in Phases 1–2.
 */
export const PACKAGE_NAME = '@telegraphic/shared' as const

export function health(): { ok: true; package: typeof PACKAGE_NAME } {
  return { ok: true, package: PACKAGE_NAME }
}
