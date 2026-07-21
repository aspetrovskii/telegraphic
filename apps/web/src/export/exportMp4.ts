import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { render, type Project } from '@telegraphic/shared'
import { bitrateForSize, pickAvcCodec } from './codec'
import { frameTimeSec, type ExportPlan } from './plan'

export type Mp4Progress = {
  frame: number
  totalFrames: number
  ratio: number
}

/**
 * Encode project frames with WebCodecs → mux with mp4-muxer → MP4 blob.
 * Uses the same `render(ctx, project, tSec)` engine as the preview canvas.
 */
export async function exportMp4(
  project: Project,
  plan: ExportPlan,
  options: {
    onProgress?: (p: Mp4Progress) => void
    signal?: AbortSignal
  } = {},
): Promise<Blob> {
  const { onProgress, signal } = options
  throwIfAborted(signal)

  const canvas = document.createElement('canvas')
  canvas.width = plan.width
  canvas.height = plan.height
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
  if (!ctx) throw new Error('Could not create 2D canvas context for export')

  const bitrate = bitrateForSize(plan.width, plan.height)
  const codec = await pickAvcCodec(plan.width, plan.height, bitrate, plan.fps)
  if (!codec) {
    throw new Error('No supported AVC codec for this resolution')
  }

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width: plan.width,
      height: plan.height,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  })

  let encoderError: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta)
    },
    error: (e) => {
      encoderError = e instanceof Error ? e : new Error(String(e))
    },
  })

  encoder.configure({
    codec,
    width: plan.width,
    height: plan.height,
    bitrate,
    framerate: plan.fps,
  })

  const keyframeEvery = plan.fps * 2

  for (let i = 0; i < plan.frameCount; i++) {
    throwIfAborted(signal)
    if (encoderError) throw encoderError

    // Back-pressure: wait when the encoder queue grows.
    while (encoder.encodeQueueSize > 4) {
      throwIfAborted(signal)
      await yieldToBrowser()
    }

    const tSec = frameTimeSec(plan, i)
    render(ctx, project, tSec)

    const timestamp = i * plan.frameDurationUs
    const frame = new VideoFrame(canvas, {
      timestamp,
      duration: plan.frameDurationUs,
    })
    try {
      encoder.encode(frame, { keyFrame: i % keyframeEvery === 0 })
    } finally {
      frame.close()
    }

    onProgress?.({
      frame: i + 1,
      totalFrames: plan.frameCount,
      ratio: (i + 1) / plan.frameCount,
    })

    // Keep the UI responsive on long 1080p exports.
    if (i % 3 === 0) await yieldToBrowser()
  }

  throwIfAborted(signal)
  await encoder.flush()
  if (encoderError) throw encoderError
  encoder.close()
  muxer.finalize()

  const buffer = target.buffer
  return new Blob([buffer], { type: 'video/mp4' })
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Export aborted', 'AbortError')
  }
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}
