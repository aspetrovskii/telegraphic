import { useLayoutEffect, useRef } from 'react'
import { render } from '@telegraphic/shared'
import { useEditorStore } from './useEditorStore'

/**
 * Rating rectangle — single object on the infinite canvas.
 * Hosts the shared engine canvas; size comes from project.settings.screenSize.
 */
export function RatingRectangle() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const project = useEditorStore((s) => s.project)
  const tSec = useEditorStore((s) => s.tSec)
  const selected = useEditorStore((s) => s.ratingSelected)
  const setRatingSelected = useEditorStore((s) => s.setRatingSelected)
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
      onPointerDown={(e) => {
        // Allow space/middle-button pan to bubble to the canvas viewport.
        if (e.button !== 0) return
        e.stopPropagation()
        setRatingSelected(true)
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
