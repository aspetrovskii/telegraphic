/** Trigger a browser file download for an exported video blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke after the browser has a chance to start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

export function exportFilename(title: string, format: 'mp4' | 'webm'): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  const safe = base.length > 0 ? base : 'telegraphic'
  return `${safe}.${format}`
}
