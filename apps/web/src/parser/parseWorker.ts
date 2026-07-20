/**
 * Web Worker entry: parse Telegram Desktop exports off the main thread.
 * Speaks a small postMessage protocol — no UI.
 */

import {
  ParseError,
  parseTelegramExportBytes,
  type ParsedChatExport,
  type ParseProgress,
} from '@telegraphic/shared'

export type ParseWorkerRequest = {
  type: 'parse'
  requestId: string
  /** Transferable bytes of result.json or a ZIP containing it. */
  bytes: ArrayBuffer
}

export type ParseWorkerProgressMessage = {
  type: 'progress'
  requestId: string
  progress: ParseProgress
}

export type ParseWorkerResultMessage = {
  type: 'result'
  requestId: string
  result: ParsedChatExport
}

export type ParseWorkerErrorMessage = {
  type: 'error'
  requestId: string
  error: {
    code: string
    message: string
  }
}

export type ParseWorkerOutbound =
  ParseWorkerProgressMessage | ParseWorkerResultMessage | ParseWorkerErrorMessage

function isParseRequest(data: unknown): data is ParseWorkerRequest {
  if (!data || typeof data !== 'object') return false
  const msg = data as ParseWorkerRequest
  return (
    msg.type === 'parse' && typeof msg.requestId === 'string' && msg.bytes instanceof ArrayBuffer
  )
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data
  if (!isParseRequest(data)) {
    return
  }

  const { requestId, bytes } = data
  try {
    const result = parseTelegramExportBytes(new Uint8Array(bytes), (progress) => {
      const message: ParseWorkerProgressMessage = {
        type: 'progress',
        requestId,
        progress,
      }
      self.postMessage(message)
    })
    const message: ParseWorkerResultMessage = {
      type: 'result',
      requestId,
      result,
    }
    self.postMessage(message)
  } catch (err) {
    const code = err instanceof ParseError ? err.code : 'UNSUPPORTED_INPUT'
    const messageText = err instanceof Error ? err.message : 'Unknown parse error'
    const message: ParseWorkerErrorMessage = {
      type: 'error',
      requestId,
      error: { code, message: messageText },
    }
    self.postMessage(message)
  }
}
