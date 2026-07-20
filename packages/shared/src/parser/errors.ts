export class ParseError extends Error {
  readonly code: ParseErrorCode

  constructor(code: ParseErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ParseError'
    this.code = code
  }
}

export type ParseErrorCode =
  | 'INVALID_JSON'
  | 'NOT_SINGLE_CHAT'
  | 'MISSING_MESSAGES'
  | 'EMPTY_EXPORT'
  | 'NO_COUNTABLE_MESSAGES'
  | 'INVALID_MESSAGE_DATE'
  | 'ZIP_NO_RESULT_JSON'
  | 'ZIP_INVALID'
  | 'ZIP_TOO_LARGE'
  | 'UNSUPPORTED_INPUT'
