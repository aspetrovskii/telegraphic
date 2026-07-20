import type { Theme, TimerChangeAnimation } from '../types/theme.js'
import type { EngineCanvasContext } from './canvas.js'
import { formatTimerClock, formatTimerDate, formatValue, initialsFromTitle } from './format.js'
import { clamp01 } from './interpolate.js'
import type { BarLayout, FrameLayout } from './layout.js'

const AXIS_LABEL_COLOR = 'rgba(0,0,0,0.45)'
const STRIPE_COLOR = 'rgba(0,0,0,0.04)'
const LINE_COLOR = 'rgba(0,0,0,0.12)'

/**
 * Draw a computed frame layout. Pure w.r.t. inputs (no wall clock / random).
 * Mutates only the provided canvas context.
 */
export function drawFrame(ctx: EngineCanvasContext, layout: FrameLayout, theme: Theme): void {
  const { width, height } = layout
  ctx.save()
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
  ctx.clearRect(0, 0, width, height)
  drawBackground(ctx, layout, theme)
  drawFrontiers(ctx, layout, theme)
  for (const bar of layout.bars) {
    drawBar(ctx, layout, theme, bar)
  }
  drawTimer(ctx, layout, theme)
  ctx.restore()
}

function drawBackground(ctx: EngineCanvasContext, layout: FrameLayout, theme: Theme): void {
  const fill = theme.background.filling
  if (fill.mode === 'solid' || !fill.imageDataUrl) {
    ctx.fillStyle = fill.color
    ctx.fillRect(0, 0, layout.width, layout.height)
    return
  }
  // Image fills require an ImageBitmap/HTMLImageElement from the host.
  // Phase 2: fall back to solid color so the engine stays DOM-free.
  ctx.fillStyle = fill.color
  ctx.fillRect(0, 0, layout.width, layout.height)
}

function drawFrontiers(ctx: EngineCanvasContext, layout: FrameLayout, theme: Theme): void {
  const mode = theme.background.valueFrontiers
  if (mode === 'off') return

  const ticks = axisTickValues(layout.axisCeiling)
  const plotBottom = layout.padTop + layout.topN * layout.rowStride

  for (let i = 0; i < ticks.length; i++) {
    const value = ticks[i]!
    const x = layout.padLeft + (value / layout.axisCeiling) * layout.trackWidth * layout.barScale
    if (mode === 'stripes' && i % 2 === 1) {
      const prev = ticks[i - 1] ?? 0
      const x0 = layout.padLeft + (prev / layout.axisCeiling) * layout.trackWidth * layout.barScale
      ctx.fillStyle = STRIPE_COLOR
      ctx.fillRect(x0, layout.padTop, Math.max(0, x - x0), Math.max(0, plotBottom - layout.padTop))
    }
    if (mode === 'lines' || mode === 'stripes') {
      ctx.strokeStyle = LINE_COLOR
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, layout.padTop - 8)
      ctx.lineTo(x, plotBottom)
      ctx.stroke()
    }
    ctx.fillStyle = AXIS_LABEL_COLOR
    ctx.font = '12px Inter, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(formatAxisLabel(value), x, layout.padTop - 10)
  }
}

function axisTickValues(ceiling: number): number[] {
  const steps = 4
  const out: number[] = []
  for (let i = 1; i <= steps; i++) {
    out.push((ceiling * i) / steps)
  }
  return out
}

function formatAxisLabel(value: number): string {
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`
  if (value >= 1_000) return `${trim(value / 1_000)}k`
  return String(Math.round(value))
}

function trim(n: number): string {
  const s = n.toFixed(1)
  return s.replace(/\.0$/, '')
}

function drawBar(
  ctx: EngineCanvasContext,
  layout: FrameLayout,
  theme: Theme,
  bar: BarLayout,
): void {
  if (bar.opacity <= 0.001) return
  const card = theme.card
  const x = layout.padLeft
  const y = bar.y
  const h = card.barHeight
  const w = bar.width

  ctx.save()
  ctx.globalAlpha = bar.opacity

  if (card.shadow === 'soft') {
    ctx.shadowColor = 'rgba(0,0,0,0.18)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
  }

  // Bar fill
  if (card.barFillStyle === 'horizontal-gradient') {
    const grad = ctx.createLinearGradient(x, y, x + Math.max(w, 1), y)
    grad.addColorStop(0, shade(bar.color, 0.85))
    grad.addColorStop(1, bar.color)
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = bar.color
  }

  roundRectPath(ctx, x, y, Math.max(w, 0), h, card.barCornerRadius)
  ctx.fill()

  if (card.barFillStyle === 'texture' && w > 0) {
    ctx.save()
    roundRectPath(ctx, x, y, Math.max(w, 0), h, card.barCornerRadius)
    ctx.clip()
    ctx.strokeStyle = shade(bar.color, 0.7)
    ctx.globalAlpha = bar.opacity * 0.35
    ctx.lineWidth = 1
    const step = 6
    for (let dx = -h; dx < w + h; dx += step) {
      ctx.beginPath()
      ctx.moveTo(x + dx, y)
      ctx.lineTo(x + dx + h, y + h)
      ctx.stroke()
    }
    ctx.restore()
    ctx.globalAlpha = bar.opacity
  }

  if (card.barOutline) {
    ctx.shadowBlur = 0
    ctx.strokeStyle = shade(bar.color, 0.7)
    ctx.lineWidth = 1
    roundRectPath(ctx, x, y, Math.max(w, 0), h, card.barCornerRadius)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Avatar
  const avatar = card.avatar
  let contentLeft = x + 8
  if (avatar.show) {
    const cx = x - avatar.size / 2 - 8
    const cy = y + h / 2
    drawAvatar(ctx, cx, cy, avatar, bar)
    contentLeft = x + 8
  }

  // Rank
  let textLeft = contentLeft
  if (card.rankShow) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `600 12px ${card.typography.nameFontFamily}, Arial, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const rankLabel = String(bar.displayRank > 0 ? bar.displayRank : Math.floor(bar.rank) + 1)
    ctx.fillText(rankLabel, textLeft, y + h / 2)
    textLeft += ctx.measureText(rankLabel).width + 8
  }

  // Name
  if (card.nameLabel.show) {
    const insideNameColor = bar.nameColor ?? '#FFFFFF'
    const outsideNameColor = bar.nameColor ?? bar.color
    ctx.font = `${card.typography.nameFontWeight} ${card.typography.nameFontSize}px ${card.typography.nameFontFamily}, Arial, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const name = ellipsize(ctx, bar.title, card.nameLabel.maxWidth)
    if (card.nameLabel.position === 'inside-end') {
      if (w > 40) {
        ctx.fillStyle = insideNameColor
        ctx.fillText(name, Math.max(textLeft, x + 8), y + h / 2)
      }
    } else {
      ctx.fillStyle = outsideNameColor
      ctx.fillText(name, x + Math.max(w, 0) + 8, y + h / 2)
    }
  }

  // Value
  if (card.valueLabel.show) {
    const label = formatValue(bar.value, {
      format: card.valueLabel.format,
      decimals: card.valueLabel.decimals,
      thousandsSeparator: card.valueLabel.thousandsSeparator,
    })
    ctx.font = `${card.typography.valueFontWeight} ${card.typography.valueFontSize}px ${card.typography.valueFontFamily}, Arial, sans-serif`
    ctx.textBaseline = 'middle'
    if (card.valueLabel.position === 'inside-end') {
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'right'
      if (w > 48) {
        ctx.fillText(label, x + Math.max(w, 0) - 8, y + h / 2)
      }
    } else {
      ctx.fillStyle = shade(bar.color, 0.85)
      ctx.textAlign = 'left'
      ctx.fillText(label, x + Math.max(w, 0) + 8, y + h / 2)
    }
  }

  ctx.restore()
}

function drawAvatar(
  ctx: EngineCanvasContext,
  cx: number,
  cy: number,
  avatar: Theme['card']['avatar'],
  bar: BarLayout,
): void {
  const r = avatar.size / 2
  ctx.save()
  ctx.beginPath()
  if (avatar.shape === 'circle') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  } else if (avatar.shape === 'rounded') {
    roundRectPath(ctx, cx - r, cy - r, avatar.size, avatar.size, r * 0.35)
  } else {
    ctx.rect(cx - r, cy - r, avatar.size, avatar.size)
  }
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = shade(bar.color, 0.75)
  ctx.fillRect(cx - r, cy - r, avatar.size, avatar.size)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `600 ${Math.max(10, avatar.size * 0.4)}px Inter, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initialsFromTitle(bar.title), cx, cy)
  ctx.restore()

  if (avatar.borderWidth > 0) {
    ctx.beginPath()
    if (avatar.shape === 'circle') {
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
    } else if (avatar.shape === 'rounded') {
      roundRectPath(ctx, cx - r, cy - r, avatar.size, avatar.size, r * 0.35)
    } else {
      ctx.rect(cx - r, cy - r, avatar.size, avatar.size)
    }
    ctx.strokeStyle = avatar.borderColor
    ctx.lineWidth = avatar.borderWidth
    ctx.stroke()
  }
}

function drawTimer(ctx: EngineCanvasContext, layout: FrameLayout, theme: Theme): void {
  const timer = theme.background.timer
  const fromIso = layout.timerDateFrom ?? layout.timerDate
  const toIso = layout.timerDateTo ?? layout.timerDate
  if (!timer.show || (!fromIso && !toIso)) return

  const textFrom = fromIso ? formatTimerDate(fromIso, timer.format) : ''
  const textTo = toIso ? formatTimerDate(toIso, timer.format) : textFrom
  const progress = clamp01(layout.timerTransition)
  const clock =
    timer.showTime && layout.timerShowClock ? formatTimerClock(layout.timerDayFraction) : null

  ctx.save()
  ctx.globalAlpha = timer.opacity
  ctx.font = `${timer.fontWeight} ${timer.fontSize}px ${timer.fontFamily}, Arial, sans-serif`
  if (ctx.letterSpacing !== undefined) {
    ctx.letterSpacing = `${timer.letterSpacing}px`
  }
  ctx.textBaseline = 'middle'

  const measurePrimary = Math.max(ctx.measureText(textFrom).width, ctx.measureText(textTo).width)
  const clockSize = Math.max(12, Math.round(timer.fontSize * 0.45))
  const clockWidth = clock ? (() => {
    const prev = ctx.font
    ctx.font = `${timer.fontWeight} ${clockSize}px ${timer.fontFamily}, Arial, sans-serif`
    const w = ctx.measureText(clock).width
    ctx.font = prev
    return w
  })() : 0
  const padX = 16
  const padY = 10
  const lineGap = clock ? Math.round(timer.fontSize * 0.2) : 0
  const boxW = Math.max(measurePrimary, clockWidth) + padX * 2
  const boxH = timer.fontSize + (clock ? clockSize + lineGap : 0) + padY * 2

  const { x, y, align } = timerAnchor(layout, timer, boxW, boxH)
  if (timer.backdrop !== 'none') {
    ctx.save()
    if (timer.backdropBlur > 0 && ctx.filter !== undefined) {
      ctx.filter = `blur(${timer.backdropBlur}px)`
    }
    ctx.fillStyle = withOpacity(timer.backdropColor, timer.backdropOpacity)
    if (timer.backdrop === 'pill') {
      roundRectPath(ctx, x, y, boxW, boxH, boxH / 2)
      ctx.fill()
    } else {
      roundRectPath(ctx, x, y, boxW, boxH, 8)
      ctx.fill()
    }
    ctx.restore()
  }

  ctx.fillStyle = timer.color
  ctx.textAlign = align
  const textX = align === 'left' ? x + padX : align === 'right' ? x + boxW - padX : x + boxW / 2
  const primaryY = clock ? y + padY + timer.fontSize / 2 : y + boxH / 2

  drawTimerPrimary(ctx, {
    textFrom,
    textTo,
    progress,
    animation: timer.changeAnimation,
    textX,
    primaryY,
    fontSize: timer.fontSize,
    baseAlpha: timer.opacity,
  })

  if (clock) {
    ctx.globalAlpha = timer.opacity
    ctx.font = `${timer.fontWeight} ${clockSize}px ${timer.fontFamily}, Arial, sans-serif`
    ctx.fillStyle = timer.color
    ctx.fillText(clock, textX, y + padY + timer.fontSize + lineGap + clockSize / 2)
  }

  if (ctx.letterSpacing !== undefined) {
    ctx.letterSpacing = '0px'
  }
  if (ctx.filter !== undefined) {
    ctx.filter = 'none'
  }
  ctx.restore()
}

function drawTimerPrimary(
  ctx: EngineCanvasContext,
  opts: {
    textFrom: string
    textTo: string
    progress: number
    animation: TimerChangeAnimation
    textX: number
    primaryY: number
    fontSize: number
    baseAlpha: number
  },
): void {
  const { textFrom, textTo, progress, animation, textX, primaryY, fontSize, baseAlpha } = opts
  if (textFrom === textTo || animation === 'none' || progress >= 1 - 1e-9) {
    ctx.globalAlpha = baseAlpha
    ctx.fillText(textTo || textFrom, textX, primaryY)
    return
  }
  if (progress <= 1e-9) {
    ctx.globalAlpha = baseAlpha
    ctx.fillText(textFrom, textX, primaryY)
    return
  }

  if (animation === 'fade') {
    ctx.globalAlpha = baseAlpha * (1 - progress)
    ctx.fillText(textFrom, textX, primaryY)
    ctx.globalAlpha = baseAlpha * progress
    ctx.fillText(textTo, textX, primaryY)
    return
  }

  if (animation === 'slide-up') {
    const travel = fontSize * 0.85
    ctx.globalAlpha = baseAlpha * (1 - progress)
    ctx.fillText(textFrom, textX, primaryY - travel * progress)
    ctx.globalAlpha = baseAlpha * progress
    ctx.fillText(textTo, textX, primaryY + travel * (1 - progress))
    return
  }

  // odometer — roll differing characters upward
  drawOdometerText(ctx, textFrom, textTo, progress, textX, primaryY, fontSize, baseAlpha)
}

function drawOdometerText(
  ctx: EngineCanvasContext,
  from: string,
  to: string,
  progress: number,
  textX: number,
  primaryY: number,
  fontSize: number,
  baseAlpha: number,
): void {
  const len = Math.max(from.length, to.length)
  const fromPad = from.padStart(len, ' ')
  const toPad = to.padStart(len, ' ')
  const widths: number[] = []
  let total = 0
  for (let i = 0; i < len; i++) {
    const ch = toPad[i] === ' ' ? fromPad[i]! : toPad[i]!
    const w = ctx.measureText(ch === ' ' ? '0' : ch).width
    widths.push(w)
    total += w
  }

  let cursor =
    ctx.textAlign === 'right' ? textX - total : ctx.textAlign === 'center' ? textX - total / 2 : textX
  const travel = fontSize * 0.9
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'

  for (let i = 0; i < len; i++) {
    const a = fromPad[i]!
    const b = toPad[i]!
    const w = widths[i]!
    if (a === b) {
      ctx.globalAlpha = baseAlpha
      ctx.fillText(b === ' ' ? '' : b, cursor, primaryY)
    } else {
      ctx.globalAlpha = baseAlpha * (1 - progress)
      ctx.fillText(a === ' ' ? '' : a, cursor, primaryY - travel * progress)
      ctx.globalAlpha = baseAlpha * progress
      ctx.fillText(b === ' ' ? '' : b, cursor, primaryY + travel * (1 - progress))
    }
    cursor += w
  }
  ctx.textAlign = prevAlign
}

function timerAnchor(
  layout: FrameLayout,
  timer: Theme['background']['timer'],
  boxW: number,
  boxH: number,
): { x: number; y: number; align: 'left' | 'right' | 'center' } {
  const ox = timer.offsetX
  const oy = timer.offsetY
  switch (timer.position) {
    case 'top-left':
      return { x: ox, y: oy, align: 'left' }
    case 'top-right':
      return { x: layout.width - boxW - ox, y: oy, align: 'right' }
    case 'bottom-left':
      return { x: ox, y: layout.height - boxH - oy, align: 'left' }
    case 'bottom-right':
    default:
      return { x: layout.width - boxW - ox, y: layout.height - boxH - oy, align: 'right' }
  }
}

function roundRectPath(
  ctx: EngineCanvasContext,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number,
): void {
  const r = Math.max(0, Math.min(radii, w / 2, h / 2))
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
  ctx.lineTo(x + w, y + h - r)
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
  ctx.lineTo(x + r, y + h)
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, (Math.PI * 3) / 2)
  ctx.closePath()
}

function ellipsize(ctx: EngineCanvasContext, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  const ellipsis = '…'
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const candidate = text.slice(0, mid) + ellipsis
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return lo <= 0 ? ellipsis : text.slice(0, lo) + ellipsis
}

/** Darken/lighten a hex color by multiplying RGB (factor &lt; 1 → darker). */
function shade(hex: string, factor: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1]!, 16)
  const r = Math.round(((n >> 16) & 255) * factor)
  const g = Math.round(((n >> 8) & 255) * factor)
  const b = Math.round((n & 255) * factor)
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
}

function withOpacity(hex: string, opacity: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1]!, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${clampOpacity(opacity)})`
}

function clampOpacity(o: number): number {
  if (o <= 0) return 0
  if (o >= 1) return 1
  return o
}
