import { useLayoutEffect, useRef } from 'react'
import { computeFrameLayout, render } from '@telegraphic/shared'
import { useEditorStore } from './useEditorStore'

/**
 * Rating rectangle — single object on the infinite canvas.
 * Hosts the shared engine canvas; size comes from project.settings.screenSize.
 * Pointer hits select Background vs Card (per-record) for the Design panel.
 */
export function RatingRectangle() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const project = useEditorStore((s) => s.project)
  const tSec = useEditorStore((s) => s.tSec)
  const selected = useEditorStore((s) => s.ratingSelected)
  const selectedRecordId = useEditorStore((s) => s.selectedRecordId)
  const setRatingSelected = useEditorStore((s) => s.setRatingSelected)
  const setDesignElement = useEditorStore((s) => s.setDesignElement)
  const setSelectedRecordId = useEditorStore((s) => s.setSelectedRecordId)
  const { width, height } = project.settings.screenSize

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    render(ctx, project, tSec)
  }, [project, tSec, width, height])

  return (
    <div
      className={`rating-rect${selected ? ' rating-rect--selected' : ''}`}
      style={{ width, height }}
      data-testid="rating-rectangle"
      data-selected-record={selectedRecordId ?? ''}
      onPointerDown={(e) => {
        // Allow space/middle-button pan to bubble to the canvas viewport.
        if (e.button !== 0) return
        e.stopPropagation()
        setRatingSelected(true)

        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const layout = computeFrameLayout(project, tSec)
        const hit = hitTestBar(layout, project.theme.card.barHeight, project.theme.card.avatar, x, y)
        if (hit) {
          setSelectedRecordId(hit)
          setDesignElement('card')
        } else {
          setDesignElement('background')
        }
      }}
    >
      <canvas
        ref={canvasRef}
        className="rating-rect__canvas"
        data-testid="editor-engine-canvas"
        width={width}
        height={height}
      />
    </div>
  )
}

function hitTestBar(
  layout: ReturnType<typeof computeFrameLayout>,
  barHeight: number,
  avatar: { show: boolean; size: number },
  x: number,
  y: number,
): string | null {
  const avatarPad = avatar.show ? avatar.size + 16 : 0
  for (const bar of layout.bars) {
    if (bar.opacity <= 0.05) continue
    const top = bar.y
    const bottom = bar.y + barHeight
    const left = layout.padLeft - avatarPad
    const right = layout.padLeft + Math.max(bar.width, 40) + 80
    if (x >= left && x <= right && y >= top && y <= bottom) {
      return bar.recordId
    }
  }
  return null
}
