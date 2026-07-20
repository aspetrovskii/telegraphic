import { describe, expect, it } from 'vitest'
import { health, PACKAGE_NAME, render, createEngineFixtureProject } from './index.js'

describe('shared package', () => {
  it('reports healthy', () => {
    expect(health()).toEqual({ ok: true, package: PACKAGE_NAME })
  })

  it('exports render and fixture', () => {
    expect(typeof render).toBe('function')
    const project = createEngineFixtureProject()
    expect(project.records.length).toBeGreaterThan(0)
    expect(project.settings.screenSize.width).toBe(960)
  })
})
