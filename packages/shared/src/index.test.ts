import { describe, expect, it } from 'vitest'
import { health, PACKAGE_NAME } from './index.js'

describe('shared package', () => {
  it('reports healthy placeholder', () => {
    expect(health()).toEqual({ ok: true, package: PACKAGE_NAME })
  })
})
