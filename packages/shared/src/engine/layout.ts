import type { Project } from '../types/project.js'
import type { Record as ProjectRecord } from '../types/record.js'
import { axisCeilingForValues, lerpAxisCeiling } from './axis.js'
import { colorForRecordId } from './format.js'
import { lerp } from './interpolate.js'
import { rankRecords, takeTopN } from './ranking.js'
import { countAtTick, resolvePlaybackTicks, tickIndexInProject } from './ticksWindow.js'
import { playbackPositionAt } from './time.js'

export type BarLayout = {
  recordId: string
  title: string
  color: string
  avatarDataUrl?: string
  /** Display value (lerped). */
  value: number
  /** Target rank slot 0..topN-1 (may be >= topN while exiting). */
  rank: number
  /** Pixel Y of the bar top (after enter/exit offset). */
  y: number
  /** Bar width in pixels. */
  width: number
  /** 0–1 opacity for enter/exit. */
  opacity: number
  /** Whether this bar is entering (from below). */
  entering: boolean
  /** Whether this bar is exiting (to below). */
  exiting: boolean
}

export type FrameLayout = {
  width: number
  height: number
  /** Plot area insets. */
  padLeft: number
  padRight: number
  padTop: number
  padBottom: number
  axisCeiling: number
  /** Max bar track width in px (before scale). */
  trackWidth: number
  bars: BarLayout[]
  timerDate: string | null
  topN: number
  rowStride: number
}

const FALLBACK_BAR_COLOR = '#4E79A7'

/**
 * Compute the full frame layout at `tSec`. Pure function of `(project, tSec)`.
 */
export function computeFrameLayout(project: Project, tSec: number): FrameLayout {
  const { width, height } = project.settings.screenSize
  const card = project.theme.card
  const topN = Math.max(0, Math.floor(project.settings.topN))
  const scale = Math.max(0, project.settings.scale) / 100

  const padLeft = 72
  const padRight = 96
  const padTop = 48
  const padBottom = 96
  const trackWidth = Math.max(0, width - padLeft - padRight)
  const rowStride = card.barHeight + card.barGap

  const playbackTicks = resolvePlaybackTicks(project)
  const pos = playbackPositionAt(project, tSec)

  if (playbackTicks.length === 0 || topN === 0) {
    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      axisCeiling: 1,
      trackWidth,
      bars: [],
      timerDate: pos.timerDate,
      topN,
      rowStride,
    }
  }

  const isoA = playbackTicks[pos.tickIndexA]!
  const isoB = playbackTicks[pos.tickIndexB]!
  const projectIdxA = tickIndexInProject(project, isoA)
  const projectIdxB = tickIndexInProject(project, isoB)
  const t = pos.tickT

  const valuesA = new Map<string, number>()
  const valuesB = new Map<string, number>()
  for (const record of project.records) {
    if (!record.visible) continue
    valuesA.set(record.id, countAtTick(record, projectIdxA))
    valuesB.set(record.id, countAtTick(record, projectIdxB))
  }

  const rankedA = takeTopN(rankRecords(project.records, valuesA), topN)
  const rankedB = takeTopN(rankRecords(project.records, valuesB), topN)

  const rankA = new Map(rankedA.map((e) => [e.recordId, e.rank]))
  const rankB = new Map(rankedB.map((e) => [e.recordId, e.rank]))
  const valueA = new Map(rankedA.map((e) => [e.recordId, e.value]))
  const valueB = new Map(rankedB.map((e) => [e.recordId, e.value]))

  const ids = new Set<string>([...rankA.keys(), ...rankB.keys()])
  const recordById = new Map(project.records.map((r) => [r.id, r]))

  const ceilingA = axisCeilingForValues(rankedA.map((e) => e.value))
  const ceilingB = axisCeilingForValues(rankedB.map((e) => e.value))
  const axisCeiling = Math.max(1e-9, lerpAxisCeiling(ceilingA, ceilingB, t))

  const exitRank = topN // slot just below the visible list
  const bars: BarLayout[] = []

  for (const id of ids) {
    const record = recordById.get(id)
    if (!record) continue

    const inA = rankA.has(id)
    const inB = rankB.has(id)
    const rA = inA ? rankA.get(id)! : exitRank
    const rB = inB ? rankB.get(id)! : exitRank

    const entering = !inA && inB
    const exiting = inA && !inB
    // Outside Top N: treat value as 0 so enter/exit grow/shrink without
    // exceeding the Top-N axis ceiling mid-transition.
    const vA = inA ? (valueA.get(id) ?? 0) : 0
    const vB = inB ? (valueB.get(id) ?? 0) : 0

    // PRD §3: linear interpolation of bar widths and Y positions (rank swaps).
    const rank = lerp(rA, rB, t)
    const value = lerp(vA, vB, t)

    let opacity = 1
    if (entering) opacity = t
    else if (exiting) opacity = 1 - t

    const y = padTop + rank * rowStride
    const capped = Math.min(value, axisCeiling)
    const widthPx = Math.max(0, (capped / axisCeiling) * trackWidth * scale)

    bars.push({
      recordId: id,
      title: record.title,
      color: resolveBarColor(record, project.theme.card.palette),
      ...(record.avatarDataUrl !== undefined ? { avatarDataUrl: record.avatarDataUrl } : {}),
      value,
      rank,
      y,
      width: widthPx,
      opacity,
      entering,
      exiting,
    })
  }

  // Stable paint order: lower opacity first, then by rank (top bars on top when overlapping).
  bars.sort((a, b) => {
    if (a.opacity !== b.opacity) return a.opacity - b.opacity
    if (a.rank !== b.rank) return b.rank - a.rank
    return a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0
  })

  return {
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    axisCeiling,
    trackWidth,
    bars,
    timerDate: pos.timerDate,
    topN,
    rowStride,
  }
}

function resolveBarColor(record: ProjectRecord, palette: readonly string[]): string {
  if (record.color) return record.color
  return colorForRecordId(record.id, palette, FALLBACK_BAR_COLOR)
}
