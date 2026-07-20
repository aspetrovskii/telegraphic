import { describe, expect, it, vi } from 'vitest'
import { parseExportInWorker, ParseWorkerClientError } from './parseExport.js'
import type { ParseWorkerOutbound, ParseWorkerRequest } from './parseWorker.js'

/**
 * Fake Worker that exercises the postMessage protocol without a real thread.
 * Proves the bridge never calls the parser on the "main" side — only via worker messages.
 */
class FakeWorker extends EventTarget {
  static lastRequest: ParseWorkerRequest | null = null

  postMessage(data: ParseWorkerRequest): void {
    FakeWorker.lastRequest = data
    queueMicrotask(() => {
      const progress: ParseWorkerOutbound = {
        type: 'progress',
        requestId: data.requestId,
        progress: { stage: 'parsing', ratio: 0.5 },
      }
      this.dispatchEvent(new MessageEvent('message', { data: progress }))

      const bytes = new Uint8Array(data.bytes)
      const text = new TextDecoder().decode(bytes)
      let result: ParseWorkerOutbound
      try {
        const json = JSON.parse(text) as { name: string; messages: unknown[] }
        result = {
          type: 'result',
          requestId: data.requestId,
          result: {
            sourceChatTitle: json.name,
            ticks: ['2024-01-01'],
            counts: [json.messages.length],
            messageTotal: json.messages.length,
          },
        }
      } catch {
        result = {
          type: 'error',
          requestId: data.requestId,
          error: { code: 'INVALID_JSON', message: 'bad json' },
        }
      }
      this.dispatchEvent(new MessageEvent('message', { data: result }))
    })
  }

  terminate(): void {
    /* no-op */
  }
}

describe('parseExportInWorker bridge', () => {
  it('posts bytes to a worker and resolves the result off the caller path', async () => {
    const stages: string[] = []
    const payload = new TextEncoder().encode(
      JSON.stringify({
        name: 'Bridge Chat',
        messages: [{ id: 1, type: 'message', date: '2024-01-01T00:00:00', text: 'x' }],
      }),
    )

    const result = await parseExportInWorker(payload, {
      createWorker: () => new FakeWorker() as unknown as Worker,
      onProgress: (p) => stages.push(p.stage),
    })

    expect(FakeWorker.lastRequest?.type).toBe('parse')
    expect(FakeWorker.lastRequest?.bytes).toBeInstanceOf(ArrayBuffer)
    expect(result.sourceChatTitle).toBe('Bridge Chat')
    expect(result.messageTotal).toBe(1)
    expect(stages).toContain('parsing')
  })

  it('surfaces worker error codes', async () => {
    class ErrorWorker extends FakeWorker {
      override postMessage(data: ParseWorkerRequest): void {
        queueMicrotask(() => {
          const msg: ParseWorkerOutbound = {
            type: 'error',
            requestId: data.requestId,
            error: { code: 'NOT_SINGLE_CHAT', message: 'nope' },
          }
          this.dispatchEvent(new MessageEvent('message', { data: msg }))
        })
      }
    }

    await expect(
      parseExportInWorker(new TextEncoder().encode('{}'), {
        createWorker: () => new ErrorWorker() as unknown as Worker,
      }),
    ).rejects.toBeInstanceOf(ParseWorkerClientError)
  })

  it('documents that large parses are scheduled on Worker, not import-time sync parse', async () => {
    // Acceptance: parsing 50MB JSON stays off the main thread.
    // The production path constructs `new Worker(new URL('./parseWorker.ts', …))`
    // and only transfers ArrayBuffer — shared parser runs inside the worker module.
    const factory = vi.fn(() => new FakeWorker() as unknown as Worker)
    const payload = new TextEncoder().encode(
      JSON.stringify({
        name: 'x',
        messages: [{ id: 1, type: 'message', date: '2024-01-01T00:00:00' }],
      }),
    )
    await parseExportInWorker(payload, { createWorker: factory })
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('fails when onProgress throws instead of hanging', async () => {
    await expect(
      parseExportInWorker(
        new TextEncoder().encode(
          JSON.stringify({
            name: 'x',
            messages: [{ id: 1, type: 'message', date: '2024-01-01T00:00:00' }],
          }),
        ),
        {
          createWorker: () => new FakeWorker() as unknown as Worker,
          onProgress: () => {
            throw new Error('progress boom')
          },
        },
      ),
    ).rejects.toThrow('progress boom')
  })

  it('fails on unknown worker message types', async () => {
    class WeirdWorker extends FakeWorker {
      override postMessage(data: ParseWorkerRequest): void {
        queueMicrotask(() => {
          this.dispatchEvent(
            new MessageEvent('message', {
              data: { type: 'weird', requestId: data.requestId },
            }),
          )
        })
      }
    }

    await expect(
      parseExportInWorker(new TextEncoder().encode('{}'), {
        createWorker: () => new WeirdWorker() as unknown as Worker,
      }),
    ).rejects.toBeInstanceOf(ParseWorkerClientError)
  })
})
