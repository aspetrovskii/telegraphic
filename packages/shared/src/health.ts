export const PACKAGE_NAME = '@telegraphic/shared' as const

export function health(): { ok: true; package: typeof PACKAGE_NAME } {
  return { ok: true, package: PACKAGE_NAME }
}
