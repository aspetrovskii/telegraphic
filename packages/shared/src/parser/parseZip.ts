import { unzipSync, strFromU8 } from 'fflate'
import { ParseError } from './errors.js'
import type { ParsedChatExport, ProgressCallback } from './aggregate.js'
import { parseTelegramChatExportJson } from './parseJson.js'

/** Matches Phase 1 acceptance for large JSON parses; caps zip-bomb expansion. */
const MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES = 50 * 1024 * 1024
/** Central-directory walk cap; media-heavy Telegram exports stay well below this. */
const MAX_ZIP_ENTRIES = 100_000

function normalizeZipPath(path: string): string {
  return path.replace(/\\/g, '/')
}

function zipBasename(path: string): string {
  const normalized = normalizeZipPath(path)
  const slash = normalized.lastIndexOf('/')
  return slash >= 0 ? normalized.slice(slash + 1) : normalized
}

/** True only when the entry basename is exactly `result.json` (case-insensitive). */
function isResultJsonPath(path: string): boolean {
  return zipBasename(path).toLowerCase() === 'result.json'
}

function findResultJsonPath(paths: string[]): string | null {
  // Prefer root `result.json`, then nested `…/result.json`.
  const root = paths.find((p) => normalizeZipPath(p) === 'result.json')
  if (root) return root
  const nested = paths.find((p) => {
    const n = normalizeZipPath(p)
    return n.endsWith('/result.json') && zipBasename(n).toLowerCase() === 'result.json'
  })
  return nested ?? null
}

/**
 * Extract `result.json` from a Telegram Desktop export ZIP and parse it.
 */
export function parseTelegramChatExportZip(
  bytes: Uint8Array,
  onProgress?: ProgressCallback,
): ParsedChatExport {
  onProgress?.({ stage: 'extracting', ratio: 0 })

  let entryCount = 0
  let uncompressedTotal = 0

  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes, {
      filter(file) {
        entryCount += 1
        if (entryCount > MAX_ZIP_ENTRIES) {
          throw new ParseError('ZIP_TOO_LARGE', `ZIP has more than ${MAX_ZIP_ENTRIES} entries.`)
        }
        if (!isResultJsonPath(file.name)) {
          return false
        }
        // fflate allocates from header sizes before inflate; reject early.
        const claimed = Math.max(file.size, file.originalSize)
        if (claimed > MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES) {
          throw new ParseError(
            'ZIP_TOO_LARGE',
            `result.json in ZIP exceeds the ${MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES} byte size limit.`,
          )
        }
        uncompressedTotal += claimed
        if (uncompressedTotal > MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES) {
          throw new ParseError(
            'ZIP_TOO_LARGE',
            `Uncompressed ZIP contents exceed the ${MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES} byte size limit.`,
          )
        }
        return true
      },
    })
  } catch (err) {
    if (err instanceof ParseError) throw err
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

  if (fileBytes.byteLength > MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES) {
    throw new ParseError(
      'ZIP_TOO_LARGE',
      `result.json in ZIP exceeds the ${MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES} byte size limit.`,
    )
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
