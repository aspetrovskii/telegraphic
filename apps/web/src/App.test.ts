import { describe, expect, it } from 'vitest'
import { health } from '@telegraphic/shared/health'

describe('web scaffold', () => {
  it('can import shared health helper', () => {
    expect(health().ok).toBe(true)
  })
})
