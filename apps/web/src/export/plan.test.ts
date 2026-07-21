import { describe, expect, it } from 'vitest'
import { createEngineFixtureProject, computeProjectDuration } from '@telegraphic/shared'
import { EXPORT_FPS, frameTimeSec, planExport } from './plan'

describe('export plan', () => {
  it('matches duration/fps/size from settings including delays', () => {
    const project = createEngineFixtureProject()
    project.settings.speedMode = 'totalLength'
    project.settings.speedValue = 30
    project.settings.startDelay = 2
    project.settings.finishDelay = 3
    project.settings.screenSize = { preset: '1920x1080', width: 1920, height: 1080 }

    const duration = computeProjectDuration(project)
    expect(duration.totalSeconds).toBe(35) // 2 + 30 + 3

    const plan = planExport(project, EXPORT_FPS)
    expect(plan.fps).toBe(30)
    expect(plan.width).toBe(1920)
    expect(plan.height).toBe(1080)
    expect(plan.frameCount).toBe(35 * 30)
    expect(plan.durationSec).toBe(35)
  })

  it('rounds odd dimensions up for encoder compatibility', () => {
    const project = createEngineFixtureProject()
    project.settings.screenSize = { preset: 'custom', width: 961, height: 541 }
    project.settings.speedValue = 1
    const plan = planExport(project)
    expect(plan.width).toBe(962)
    expect(plan.height).toBe(542)
  })

  it('honors zero-length animation with delays only', () => {
    const project = createEngineFixtureProject()
    project.settings.speedMode = 'totalLength'
    project.settings.speedValue = 0
    project.settings.startDelay = 1
    project.settings.finishDelay = 1
    const plan = planExport(project)
    expect(plan.durationSec).toBe(2)
    expect(plan.frameCount).toBe(60)
    expect(frameTimeSec(plan, 0)).toBe(0)
    expect(frameTimeSec(plan, plan.frameCount - 1)).toBeLessThan(plan.durationSec)
  })
})
