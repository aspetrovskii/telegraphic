import { describe, expect, it } from 'vitest'
import { niceCeiling, axisCeilingForValues, lerpAxisCeiling } from './axis.js'
import { computeProjectDuration } from './duration.js'
import { formatTimerDate, formatValue, colorForRecordId, initialsFromTitle } from './format.js'
import { lerp, clamp01, smoothstep } from './interpolate.js'
import { computeFrameLayout } from './layout.js'
import { rankRecords, takeTopN } from './ranking.js'
import { resolvePlaybackTicks } from './ticksWindow.js'
import { playbackPositionAt } from './time.js'
import { createEngineFixtureProject } from '../fixtures/engineProject.js'
import { createRecord } from '../types/record.js'
import { createProject } from '../types/project.js'
import { createDefaultTotalSettings } from '../types/settings.js'
import { createDefaultTheme } from '../types/theme.js'

describe('interpolate', () => {
  it('lerps linearly', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
    expect(lerp(0, 10, 0.5)).toBe(5)
  })

  it('clamps to [0,1]', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(0.25)).toBe(0.25)
  })

  it('smoothstep is 0 at 0 and 1 at 1', () => {
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
    expect(smoothstep(0.5)).toBe(0.5)
  })
})

describe('ranking', () => {
  const records = [
    createRecord({ id: 'b', sourceChatTitle: 'B', counts: [5] }),
    createRecord({ id: 'a', sourceChatTitle: 'A', counts: [10] }),
    createRecord({ id: 'c', sourceChatTitle: 'C', counts: [10], visible: false }),
    createRecord({ id: 'd', sourceChatTitle: 'D', counts: [7] }),
  ]

  it('sorts by value desc and skips hidden', () => {
    const values = new Map([
      ['a', 10],
      ['b', 5],
      ['c', 99],
      ['d', 7],
    ])
    const ranked = rankRecords(records, values)
    expect(ranked.map((r) => r.recordId)).toEqual(['a', 'd', 'b'])
    expect(ranked.map((r) => r.rank)).toEqual([0, 1, 2])
  })

  it('breaks ties by record id', () => {
    const values = new Map([
      ['a', 10],
      ['b', 10],
      ['d', 10],
    ])
    const ranked = rankRecords(records, values)
    expect(ranked.map((r) => r.recordId)).toEqual(['a', 'b', 'd'])
  })

  it('takeTopN slices', () => {
    const values = new Map([
      ['a', 10],
      ['b', 5],
      ['d', 7],
    ])
    expect(takeTopN(rankRecords(records, values), 2).map((r) => r.recordId)).toEqual(['a', 'd'])
  })
})

describe('axis ceiling', () => {
  it('rounds up to nice numbers', () => {
    expect(niceCeiling(0)).toBe(1)
    expect(niceCeiling(3)).toBe(5)
    expect(niceCeiling(10)).toBe(10)
    expect(niceCeiling(12)).toBe(20)
    expect(niceCeiling(100)).toBe(100)
    expect(niceCeiling(120)).toBe(200)
    expect(niceCeiling(251)).toBe(500)
  })

  it('uses max of values', () => {
    expect(axisCeilingForValues([10, 40, 25])).toBe(50)
  })

  it('lerps upward and holds while shrinking', () => {
    expect(lerpAxisCeiling(100, 200, 0.5)).toBe(150)
    expect(lerpAxisCeiling(200, 100, 0.5)).toBe(200)
    expect(lerpAxisCeiling(200, 100, 1)).toBe(100)
  })
})

describe('duration + playback time', () => {
  it('totalLength mode includes delays', () => {
    const project = createEngineFixtureProject()
    project.settings.speedMode = 'totalLength'
    project.settings.speedValue = 10
    project.settings.startDelay = 2
    project.settings.finishDelay = 3
    const d = computeProjectDuration(project)
    expect(d.animationSeconds).toBe(10)
    expect(d.totalSeconds).toBe(15)
    expect(d.tickCount).toBe(12)
  })

  it('daysPerSecond mode scales with tick span', () => {
    const project = createEngineFixtureProject()
    project.settings.speedMode = 'daysPerSecond'
    project.settings.speedValue = 2
    project.settings.startDelay = 0
    project.settings.finishDelay = 0
    // 12 ticks → 11 steps; 11/2 = 5.5s
    const d = computeProjectDuration(project)
    expect(d.animationSeconds).toBe(5.5)
    expect(d.totalSeconds).toBe(5.5)
  })

  it('freezes at start/end delays', () => {
    const project = createEngineFixtureProject()
    project.settings.speedValue = 10
    project.settings.startDelay = 2
    project.settings.finishDelay = 2
    const atStart = playbackPositionAt(project, 1)
    expect(atStart.raceProgress).toBe(0)
    expect(atStart.tickIndexA).toBe(0)

    const mid = playbackPositionAt(project, 2 + 5)
    expect(mid.raceProgress).toBeCloseTo(0.5, 5)

    const atEnd = playbackPositionAt(project, 2 + 10 + 1)
    expect(atEnd.raceProgress).toBe(1)
  })
})

describe('playback ticks window', () => {
  it('applies dates interval and smoothing', () => {
    const project = createEngineFixtureProject()
    project.settings.datesInterval = { start: '2020-03-01', end: '2020-09-01' }
    project.settings.smoothingInterval = 2
    const ticks = resolvePlaybackTicks(project)
    expect(ticks[0]).toBe('2020-03-01')
    expect(ticks[ticks.length - 1]).toBe('2020-09-01')
    // Step 2 over Mar..Sep inclusive months
    expect(ticks.length).toBeGreaterThan(1)
  })
})

describe('format helpers', () => {
  it('formats timer dates', () => {
    expect(formatTimerDate('2020-06-15', 'MMM YYYY')).toBe('Jun 2020')
    expect(formatTimerDate('2020-06-15', 'DD/MM/YY')).toBe('15/06/20')
    expect(formatTimerDate('2020-06-15', 'Q# YYYY')).toBe('Q2 2020')
  })

  it('formats values', () => {
    expect(formatValue(1280, { format: 'compact', decimals: 1, thousandsSeparator: true })).toBe(
      '1.3k',
    )
    expect(
      formatValue(1_280_000, { format: 'compact', decimals: 1, thousandsSeparator: true }),
    ).toBe('1.3M')
    expect(formatValue(42, { format: 'compact', decimals: 1, thousandsSeparator: true })).toBe('42')
    expect(formatValue(42.67, { format: 'compact', decimals: 1, thousandsSeparator: true })).toBe(
      '42.7',
    )
    expect(formatValue(128000, { format: 'raw', decimals: 0, thousandsSeparator: true })).toBe(
      '128,000',
    )
  })

  it('picks stable palette colors and initials', () => {
    const a = colorForRecordId('rec-alpha', ['#111111', '#222222'], '#000')
    const b = colorForRecordId('rec-alpha', ['#111111', '#222222'], '#000')
    expect(a).toBe(b)
    expect(initialsFromTitle('Alpha Chat')).toBe('AC')
    expect(initialsFromTitle('Solo')).toBe('SO')
  })
})

describe('frame layout', () => {
  it('produces topN bars at t=0 and respects hidden records', () => {
    const project = createEngineFixtureProject()
    const layout = computeFrameLayout(project, 0)
    expect(layout.bars.length).toBe(5)
    expect(layout.bars.every((b) => b.recordId !== 'rec-hidden')).toBe(true)
    expect(layout.timerDate).toBe('2020-01-01')
    // Highest at t=0 among visible: gamma(20), epsilon(15), alpha(10), beta(5), delta(1)
    const byRank = [...layout.bars].sort((a, b) => a.rank - b.rank)
    expect(byRank[0]?.recordId).toBe('rec-gamma')
  })

  it('lerps ranks between ticks and stays deterministic', () => {
    const project = createEngineFixtureProject()
    const a = computeFrameLayout(project, 5)
    const b = computeFrameLayout(project, 5)
    expect(a).toEqual(b)
    expect(a.bars.length).toBeGreaterThan(0)
    expect(a.axisCeiling).toBeGreaterThan(0)
  })

  it('end frame uses final tick', () => {
    const project = createEngineFixtureProject()
    const { totalSeconds } = computeProjectDuration(project)
    const layout = computeFrameLayout(project, totalSeconds)
    expect(layout.timerDate).toBe('2020-12-01')
    const byRank = [...layout.bars].sort((a, b) => a.rank - b.rank)
    // delta ends at 700 — first place
    expect(byRank[0]?.recordId).toBe('rec-delta')
  })

  it('empty project yields no bars', () => {
    const project = createProject({
      id: 'empty',
      ownerId: 'x',
      title: 'Empty',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
      ticks: [],
      records: [],
      settings: createDefaultTotalSettings(),
      theme: createDefaultTheme(),
    })
    const layout = computeFrameLayout(project, 0)
    expect(layout.bars).toEqual([])
  })
})
