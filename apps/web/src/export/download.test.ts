import { describe, expect, it } from 'vitest'
import { exportFilename } from './download'

describe('exportFilename', () => {
  it('slugifies title and appends format', () => {
    expect(exportFilename('My Cool Rating!', 'mp4')).toBe('my-cool-rating.mp4')
    expect(exportFilename('  ', 'webm')).toBe('telegraphic.webm')
  })
})
