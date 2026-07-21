export type ExportFormat = 'mp4' | 'webm'

export type ExportCapabilities = {
  webCodecs: boolean
  mediaRecorder: boolean
  preferredFormat: ExportFormat
  /** True when MP4 path is unavailable and WebM fallback will be used. */
  willUseFallback: boolean
}

function hasVideoEncoder(): boolean {
  return typeof globalThis.VideoEncoder === 'function'
}

function hasVideoFrame(): boolean {
  return typeof globalThis.VideoFrame === 'function'
}

function hasMediaRecorder(): boolean {
  return typeof globalThis.MediaRecorder === 'function'
}

/** Pick a MediaRecorder MIME type supported by this browser. */
export function pickWebmMimeType(): string | null {
  if (!hasMediaRecorder()) return null
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

export function detectExportCapabilities(forceFallback = false): ExportCapabilities {
  const webCodecs = hasVideoEncoder() && hasVideoFrame()
  const mediaRecorder = hasMediaRecorder() && pickWebmMimeType() !== null
  const canMp4 = webCodecs && !forceFallback
  return {
    webCodecs,
    mediaRecorder,
    preferredFormat: canMp4 ? 'mp4' : 'webm',
    willUseFallback: !canMp4,
  }
}
