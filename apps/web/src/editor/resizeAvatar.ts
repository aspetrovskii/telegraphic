/** Client-side avatar resize to ~128px (PRD Data panel). */

export const AVATAR_MAX_EDGE = 128

/**
 * Decode an image file and return a PNG data URL scaled so the longest edge
 * is at most `maxEdge` pixels. Pure browser helper (DOM Canvas) — not used by
 * the shared engine render path.
 */
export async function resizeImageFileToDataUrl(
  file: File | Blob,
  maxEdge: number = AVATAR_MAX_EDGE,
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not create canvas context for avatar resize')
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL('image/png')
  } finally {
    bitmap.close()
  }
}
