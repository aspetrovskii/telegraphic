import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  PACKAGE_NAME,
  ParseError,
  alignCountsToTicks,
  createDefaultTheme,
  createDefaultTotalSettings,
  createEngineFixtureProject,
  createProject,
  createRecord,
  dayKeyFromTelegramDate,
  enumerateDays,
  health,
  parseTelegramChatExport,
  parseTelegramChatExportJson,
  parseTelegramChatExportZip,
  parseTelegramExportBytes,
  parsedExportToRecord,
  render,
  unionTicks,
} from './index.js'

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

function readFixture(...parts: string[]): string {
  return readFileSync(join(fixturesRoot, ...parts), 'utf8')
}

function readFixtureBytes(...parts: string[]): Uint8Array {
  return new Uint8Array(readFileSync(join(fixturesRoot, ...parts)))
}

describe('data model defaults', () => {
  it('creates Project / Record / TotalSettings / Theme per PRD field names', () => {
    const settings = createDefaultTotalSettings()
    expect(settings.topN).toBe(15)
    expect(settings.scale).toBe(100)
    expect(settings.speedMode).toBe('totalLength')
    expect(settings.screenSize.width).toBe(1920)
    expect(settings.smoothingInterval).toBe(1)

    const theme = createDefaultTheme()
    expect(theme.background.valueFrontiers).toBe('lines')
    expect(theme.background.timer.format).toBe('MMM YYYY')
    expect(theme.card.palette.length).toBeGreaterThanOrEqual(10)

    const record = createRecord({
      id: 'r1',
      sourceChatTitle: 'Alice',
      counts: [1, 2],
    })
    expect(record.title).toBe('Alice')
    expect(record.visible).toBe(true)

    const project = createProject({
      id: 'p1',
      ownerId: 'u1',
      title: 'My rating',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      ticks: ['2024-01-01', '2024-01-02'],
      records: [record],
    })
    expect(project.settings.topN).toBe(15)
    expect(project.theme.card.barHeight).toBe(36)
    expect(project.records[0]?.counts).toEqual([1, 2])
  })
})

describe('ticks helpers', () => {
  it('enumerates inclusive days and unions ticks', () => {
    expect(enumerateDays('2024-03-01', '2024-03-04')).toEqual([
      '2024-03-01',
      '2024-03-02',
      '2024-03-03',
      '2024-03-04',
    ])
    expect(unionTicks(['2024-01-03'], ['2024-01-01', '2024-01-02'])).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
    ])
  })

  it('aligns cumulative counts onto a wider tick grid', () => {
    const aligned = alignCountsToTicks(
      ['2024-01-02', '2024-01-04'],
      [5, 9],
      ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
    )
    expect(aligned).toEqual([0, 5, 5, 9, 9])
  })

  it('rejects unsorted fromTicks', () => {
    expect(() =>
      alignCountsToTicks(['2024-01-03', '2024-01-01'], [1, 2], ['2024-01-01', '2024-01-03']),
    ).toThrow(/sorted ascending/)
  })
})

describe('parseTelegramChatExportJson — valid fixtures', () => {
  it('parses a tiny personal chat into cumulative daily series', () => {
    const stages: string[] = []
    const parsed = parseTelegramChatExportJson(readFixture('valid-tiny', 'result.json'), (p) => {
      stages.push(p.stage)
    })
    expect(parsed.sourceChatTitle).toBe('Alice')
    expect(parsed.messageTotal).toBe(3)
    expect(parsed.ticks).toEqual(['2024-01-01', '2024-01-02'])
    expect(parsed.counts).toEqual([2, 3])
    expect(stages).toContain('reading')
    expect(stages).toContain('aggregating')
    expect(stages.at(-1)).toBe('done')

    const record = parsedExportToRecord(parsed, { id: 'rec-alice' })
    expect(record.id).toBe('rec-alice')
    expect(record.sourceChatTitle).toBe('Alice')
    expect(record.counts).toEqual([2, 3])
  })

  it('fills empty days by carrying cumulative totals forward', () => {
    const parsed = parseTelegramChatExportJson(readFixture('empty-days', 'result.json'))
    expect(parsed.ticks).toEqual(['2024-03-01', '2024-03-02', '2024-03-03', '2024-03-04'])
    expect(parsed.counts).toEqual([2, 2, 2, 3])
    expect(parsed.messageTotal).toBe(3)
  })

  it('ignores service messages when counting', () => {
    const parsed = parseTelegramChatExportJson(readFixture('service-messages', 'result.json'))
    expect(parsed.sourceChatTitle).toBe('Group with services')
    expect(parsed.messageTotal).toBe(3)
    expect(parsed.ticks).toEqual(['2024-05-01', '2024-05-02'])
    expect(parsed.counts).toEqual([1, 3])
  })

  it('buckets by local date string, not UTC from date_unixtime', () => {
    const parsed = parseTelegramChatExportJson(readFixture('timezone-edge', 'result.json'))
    expect(dayKeyFromTelegramDate('2024-06-15T23:30:00')).toBe('2024-06-15')
    expect(parsed.ticks).toEqual(['2024-06-15', '2024-06-16'])
    expect(parsed.counts).toEqual([1, 2])

    // date_unixtime 1718494200 is 2024-06-15T23:30:00Z — same calendar day in UTC,
    // but the contract is: always use the `date` field prefix (exporter local time).
    expect(dayKeyFromTelegramDate('2024-06-15T23:30:00')).toBe(parsed.ticks[0])
  })
})

describe('parseTelegramChatExportJson — malformed fixtures', () => {
  it('rejects truncated JSON', () => {
    expect(() => parseTelegramChatExportJson(readFixture('malformed', 'truncated.json'))).toThrow(
      ParseError,
    )
    try {
      parseTelegramChatExportJson(readFixture('malformed', 'truncated.json'))
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).code).toBe('INVALID_JSON')
    }
  })

  it('rejects full-account exports', () => {
    expect(() =>
      parseTelegramChatExportJson(readFixture('malformed', 'full-account.json')),
    ).toThrow(ParseError)
    try {
      parseTelegramChatExportJson(readFixture('malformed', 'full-account.json'))
    } catch (err) {
      expect((err as ParseError).code).toBe('NOT_SINGLE_CHAT')
    }
  })

  it('rejects objects that are not a chat export', () => {
    expect(() => parseTelegramChatExportJson(readFixture('malformed', 'not-a-chat.json'))).toThrow(
      ParseError,
    )
    try {
      parseTelegramChatExportJson(readFixture('malformed', 'not-a-chat.json'))
      expect.unreachable('expected parse to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).code).toBe('MISSING_MESSAGES')
    }
  })

  it('rejects service-only chats with no countable messages', () => {
    expect(() =>
      parseTelegramChatExportJson(readFixture('malformed', 'service-only.json')),
    ).toThrow(ParseError)
    try {
      parseTelegramChatExportJson(readFixture('malformed', 'service-only.json'))
      expect.unreachable('expected parse to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).code).toBe('NO_COUNTABLE_MESSAGES')
    }
  })

  it('rejects empty messages array', () => {
    expect(() => parseTelegramChatExport({ name: 'Empty', messages: [] })).toThrow(ParseError)
  })

  it('rejects countable messages with missing or impossible dates', () => {
    expect(() =>
      parseTelegramChatExport({
        name: 'Bad dates',
        messages: [{ id: 1, type: 'message', text: 'no date' }],
      }),
    ).toThrow(ParseError)

    expect(() =>
      parseTelegramChatExport({
        name: 'Impossible',
        messages: [{ id: 1, type: 'message', date: '2024-02-30T12:00:00', text: 'x' }],
      }),
    ).toThrow(ParseError)

    try {
      parseTelegramChatExport({
        name: 'Impossible',
        messages: [{ id: 1, type: 'message', date: '2024-02-30T12:00:00', text: 'x' }],
      })
      expect.unreachable('expected parse to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).code).toBe('INVALID_MESSAGE_DATE')
    }
  })

  it('accepts single-chat exports that include an empty chats.list', () => {
    const parsed = parseTelegramChatExport({
      name: 'Alice',
      chats: { list: [] },
      messages: [{ id: 1, type: 'message', date: '2024-01-01T10:00:00', text: 'hi' }],
    })
    expect(parsed.sourceChatTitle).toBe('Alice')
    expect(parsed.messageTotal).toBe(1)
  })
})

describe('ZIP parsing', () => {
  it('parses result.json at ZIP root', () => {
    const parsed = parseTelegramChatExportZip(readFixtureBytes('zip-valid', 'export.zip'))
    expect(parsed.sourceChatTitle).toBe('Alice')
    expect(parsed.counts).toEqual([2, 3])
  })

  it('finds nested result.json and auto-detects ZIP bytes', () => {
    const parsed = parseTelegramExportBytes(readFixtureBytes('zip-valid', 'nested-export.zip'))
    expect(parsed.sourceChatTitle).toBe('Alice')
    expect(parsed.messageTotal).toBe(3)
  })

  it('auto-detects raw JSON bytes', () => {
    const parsed = parseTelegramExportBytes(readFixtureBytes('valid-tiny', 'result.json'))
    expect(parsed.sourceChatTitle).toBe('Alice')
  })
})

describe('shared package — engine', () => {
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
