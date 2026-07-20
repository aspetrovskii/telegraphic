/**
 * Main-thread bridge: runs the shared Telegram parser inside a Web Worker.
 * Keeps large JSON/ZIP parsing off the UI thread (Phase 1 acceptance).
 */

import type { ParsedChatExport, ParseProgress } from '@telegraphic/shared'
import type {
  ParseWorkerErrorMessage,
  ParseWorkerOutbound,
  ParseWorkerProgressMessage,
  ParseWorkerRequest,
  ParseWorkerResultMessage,
} from './parseWorker.ts'

export type ParseExportOptions = {
  onProgress?: (progress: ParseProgress) => void
  /** Injected for tests; defaults to the module worker. */
  createWorker?: () => Worker
}

export class ParseWorkerClientError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ParseWorkerClientError'
    this.code = code
  }
}

let requestCounter = 0

function nextRequestId(): string {
  requestCounter += 1
  return `parse-${requestCounter}`
}

function defaultCreateWorker(): Worker {
  return new Worker(new URL('./parseWorker.ts', import.meta.url), { type: 'module' })
}

/**
 * Parse a File / Blob / ArrayBuffer of a single-chat Telegram export
 * (`result.json` or ZIP) on a dedicated worker thread.
 */
export function parseExportInWorker(
  input: File | Blob | ArrayBuffer | Uint8Array,
  options: ParseExportOptions = {},
): Promise<ParsedChatExport> {
  const createWorker = options.createWorker ?? defaultCreateWorker

  return new Promise((resolve, reject) => {
    let worker: Worker
    try {
      worker = createWorker()
    } catch (err) {
      reject(err)
      return
    }

    const requestId = nextRequestId()
    let settled = false

    const cleanup = () => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      worker.terminate()
    }

    const fail = (err: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }

    const succeed = (result: ParsedChatExport) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }

    const onMessage = (event: MessageEvent<ParseWorkerOutbound>) => {
      const msg = event.data
      if (!msg || msg.requestId !== requestId) return

      if (msg.type === 'progress') {
        options.onProgress?.((msg as ParseWorkerProgressMessage).progress)
        return
      }
      if (msg.type === 'result') {
        succeed((msg as ParseWorkerResultMessage).result)
        return
      }
      if (msg.type === 'error') {
        const errMsg = msg as ParseWorkerErrorMessage
        fail(new ParseWorkerClientError(errMsg.error.code, errMsg.error.message))
      }
    }

    const onError = (event: ErrorEvent) => {
      fail(new ParseWorkerClientError('UNSUPPORTED_INPUT', event.message || 'Worker failed'))
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)

    void (async () => {
      try {
        const buffer = await toArrayBuffer(input)
        const request: ParseWorkerRequest = {
          type: 'parse',
          requestId,
          bytes: buffer,
        }
        worker.postMessage(request, [buffer])
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)))
      }
    })()
  })
}

async function toArrayBuffer(input: File | Blob | ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  if (input instanceof ArrayBuffer) {
    return input.slice(0)
  }
  if (input instanceof Uint8Array) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer
  }
  return input.arrayBuffer()
}

/** Protocol helpers re-exported for unit tests without spinning a real Worker. */
export type { ParseWorkerRequest, ParseWorkerOutbound }
