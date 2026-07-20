import { unzipSync, strFromU8 } from 'fflate'
import { ParseError } from './errors.js'
import type { ParsedChatExport, ProgressCallback } from './aggregate.js'
import { parseTelegramChatExportJson } from './parseJson.js'

function findResultJsonPath(paths: string[]): string | null {
  const normalized = paths.map((p) => p.replace(/\\/g, '/'))
  const exact = normalized.find((p) => p === 'result.json' || p.endsWith('/result.json'))
  if (exact) {
    return paths[normalized.indexOf(exact)] ?? exact
  }
  const loose = normalized.find((p) => p.toLowerCase().endsWith('result.json'))
  if (loose) {
    return paths[normalized.indexOf(loose)] ?? loose
  }
  return null
}

/**
 * Extract `result.json` from a Telegram Desktop export ZIP and parse it.
 */
export function parseTelegramChatExportZip(
  bytes: Uint8Array,
  onProgress?: ProgressCallback,
): ParsedChatExport {
  onProgress?.({ stage: 'extracting', ratio: 0 })

  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch (err) {
    throw new ParseError('ZIP_INVALID', 'Could not read ZIP archive.', { cause: err })
  }

  const path = findResultJsonPath(Object.keys(files))
  if (!path) {
    throw new ParseError(
      'ZIP_NO_RESULT_JSON',
      'ZIP does not contain result.json. Export a single chat from Telegram Desktop as JSON.',
    )
  }

  const fileBytes = files[path]
  if (!fileBytes) {
    throw new ParseError('ZIP_NO_RESULT_JSON', `Missing entry ${path} in ZIP.`)
  }

  onProgress?.({ stage: 'extracting', ratio: 1 })

  let text: string
  try {
    text = strFromU8(fileBytes)
  } catch (err) {
    throw new ParseError('INVALID_JSON', 'result.json inside ZIP is not valid UTF-8.', {
      cause: err,
    })
  }

  return parseTelegramChatExportJson(text, onProgress)
}

export function looksLikeZip(bytes: Uint8Array): boolean {
  // PK\x03\x04 or empty zip PK\x05\x06
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
  )
}

/**
 * Auto-detect ZIP vs JSON bytes and parse a single-chat export.
 */
export function parseTelegramExportBytes(
  bytes: Uint8Array,
  onProgress?: ProgressCallback,
): ParsedChatExport {
  if (looksLikeZip(bytes)) {
    return parseTelegramChatExportZip(bytes, onProgress)
  }
  return parseTelegramChatExportJson(
    (() => {
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch (err) {
        throw new ParseError('UNSUPPORTED_INPUT', 'Input is neither ZIP nor UTF-8 JSON.', {
          cause: err,
        })
      }
    })(),
    onProgress,
  )
}
