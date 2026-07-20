import { createProject } from '../types/project.js'
import { createRecord } from '../types/record.js'
import { createDefaultTotalSettings } from '../types/settings.js'
import { createDefaultTheme } from '../types/theme.js'
import type { Project } from '../types/project.js'

/**
 * Fixed fixture project for engine unit tests and Playwright visual snapshots.
 * Compact screen (960×540) keeps snapshots small and deterministic.
 */
export function createEngineFixtureProject(): Project {
  const ticks = [
    '2020-01-01',
    '2020-02-01',
    '2020-03-01',
    '2020-04-01',
    '2020-05-01',
    '2020-06-01',
    '2020-07-01',
    '2020-08-01',
    '2020-09-01',
    '2020-10-01',
    '2020-11-01',
    '2020-12-01',
  ]

  // Diverging cumulative series so ranks swap mid-race.
  const alpha = [10, 40, 80, 120, 160, 200, 240, 280, 300, 310, 320, 330]
  const beta = [5, 30, 90, 150, 220, 260, 290, 330, 380, 420, 450, 480]
  const gamma = [20, 35, 50, 70, 100, 140, 190, 250, 320, 400, 490, 580]
  const delta = [1, 8, 20, 45, 80, 130, 200, 280, 370, 470, 580, 700]
  const epsilon = [15, 25, 45, 60, 75, 95, 110, 130, 160, 200, 250, 310]

  const settings = createDefaultTotalSettings()
  settings.topN = 5
  settings.screenSize = { preset: 'custom', width: 960, height: 540 }
  settings.speedMode = 'totalLength'
  settings.speedValue = 10
  settings.startDelay = 0
  settings.finishDelay = 0
  settings.smoothingInterval = 1
  settings.scale = 100
  settings.datesInterval = { start: null, end: null }

  const theme = createDefaultTheme()
  theme.background.timer.format = 'MMM YYYY'
  theme.background.timer.fontSize = 36
  theme.background.timer.fontFamily = 'Arial'
  theme.card.typography.nameFontFamily = 'Arial'
  theme.card.typography.valueFontFamily = 'Arial'
  theme.card.avatar.show = true
  theme.card.barHeight = 40
  theme.card.barGap = 10

  return createProject({
    id: 'fixture-engine-phase2',
    ownerId: 'fixture',
    title: 'Phase 2 engine fixture',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ticks,
    settings,
    theme,
    records: [
      createRecord({
        id: 'rec-alpha',
        sourceChatTitle: 'Alpha Chat',
        title: 'Alpha',
        counts: alpha,
      }),
      createRecord({ id: 'rec-beta', sourceChatTitle: 'Beta Chat', title: 'Beta', counts: beta }),
      createRecord({
        id: 'rec-gamma',
        sourceChatTitle: 'Gamma Chat',
        title: 'Gamma',
        counts: gamma,
      }),
      createRecord({
        id: 'rec-delta',
        sourceChatTitle: 'Delta Chat',
        title: 'Delta',
        counts: delta,
      }),
      createRecord({
        id: 'rec-epsilon',
        sourceChatTitle: 'Epsilon Chat',
        title: 'Epsilon',
        counts: epsilon,
      }),
      createRecord({
        id: 'rec-hidden',
        sourceChatTitle: 'Hidden Chat',
        title: 'Hidden',
        counts: [999, 999, 999, 999, 999, 999, 999, 999, 999, 999, 999, 999],
        visible: false,
      }),
    ],
  })
}
