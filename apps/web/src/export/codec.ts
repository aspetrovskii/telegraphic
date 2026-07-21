/** Candidate AVC codec strings, low → high capability. */
const AVC_CANDIDATES = [
  'avc1.42001f', // Baseline 3.1 — up to ~720p
  'avc1.420028', // Baseline 4.0 — 1080p30
  'avc1.4D0028', // Main 4.0
  'avc1.640028', // High 4.0
  'avc1.64002a', // High 4.1
] as const

export type AvcCodec = (typeof AVC_CANDIDATES)[number]

/**
 * Pick an AVC codec string supported for the given size.
 * Returns null when WebCodecs / H.264 encode is unavailable.
 */
export async function pickAvcCodec(
  width: number,
  height: number,
  bitrate: number,
  fps = 30,
): Promise<AvcCodec | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoEncoder.isConfigSupported !== 'function') {
    return null
  }

  for (const codec of AVC_CANDIDATES) {
    try {
      const result = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
      })
      if (result.supported) return codec
    } catch {
      // try next
    }
  }
  return null
}

export function bitrateForSize(width: number, height: number): number {
  const pixels = width * height
  if (pixels >= 1920 * 1080) return 8_000_000
  if (pixels >= 1280 * 720) return 5_000_000
  return 2_500_000
}
