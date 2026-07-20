import type { Theme } from '../types/theme.js'
import type { EngineCanvasContext } from './canvas.js'
import { formatTimerDate, formatValue, initialsFromTitle } from './format.js'
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
    const x = layout.padLeft + (value / layout.axisCeiling) * layout.trackWidth
    if (mode === 'stripes' && i % 2 === 1) {
      const prev = ticks[i - 1] ?? 0
      const x0 = layout.padLeft + (prev / layout.axisCeiling) * layout.trackWidth
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
    const rankLabel = String(Math.round(bar.rank) + 1)
    ctx.fillText(rankLabel, textLeft, y + h / 2)
    textLeft += ctx.measureText(rankLabel).width + 8
  }

  // Name
  if (card.nameLabel.show) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `${card.typography.nameFontWeight} ${card.typography.nameFontSize}px ${card.typography.nameFontFamily}, Arial, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const name = ellipsize(ctx, bar.title, card.nameLabel.maxWidth)
    if (card.nameLabel.position === 'inside-end') {
      if (w > 40) {
        ctx.fillText(name, Math.max(textLeft, x + 8), y + h / 2)
      }
    } else {
      ctx.fillStyle = bar.color
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
  if (!timer.show || !layout.timerDate) return

  const text = formatTimerDate(layout.timerDate, timer.format)
  ctx.save()
  ctx.globalAlpha = timer.opacity
  ctx.font = `${timer.fontWeight} ${timer.fontSize}px ${timer.fontFamily}, Arial, sans-serif`
  ctx.textBaseline = 'middle'
  const metrics = ctx.measureText(text)
  const padX = 16
  const padY = 10
  const boxW = metrics.width + padX * 2
  const boxH = timer.fontSize + padY * 2

  const { x, y, align } = timerAnchor(layout, timer, boxW, boxH)
  if (timer.backdrop !== 'none') {
    ctx.fillStyle = withOpacity(timer.backdropColor, timer.backdropOpacity)
    if (timer.backdrop === 'pill') {
      roundRectPath(ctx, x, y, boxW, boxH, boxH / 2)
      ctx.fill()
    } else {
      roundRectPath(ctx, x, y, boxW, boxH, 8)
      ctx.fill()
    }
  }

  ctx.fillStyle = timer.color
  ctx.textAlign = align
  const textX = align === 'left' ? x + padX : align === 'right' ? x + boxW - padX : x + boxW / 2
  ctx.fillText(text, textX, y + boxH / 2)
  ctx.restore()
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
