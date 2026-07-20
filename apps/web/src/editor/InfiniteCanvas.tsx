import { useEffect, useRef, type ReactNode } from 'react'
import { useEditorStore, useEditorStoreApi } from './useEditorStore'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

type Props = {
  children: ReactNode
}

/**
 * Infinite workspace: pan (space+drag / middle mouse), zoom (ctrl/meta+wheel), fit.
 */
export function InfiniteCanvas({ children }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const spaceDown = useRef(false)
  const dragging = useRef<{
    pointerId: number
    startX: number
    startY: number
    originPanX: number
    originPanY: number
  } | null>(null)

  const canvas = useEditorStore((s) => s.canvas)
  const setCanvas = useEditorStore((s) => s.setCanvas)
  const setViewport = useEditorStore((s) => s.setViewport)
  const setRatingSelected = useEditorStore((s) => s.setRatingSelected)
  const fitCanvas = useEditorStore((s) => s.fitCanvas)
  const store = useEditorStoreApi()

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setViewport(width, height)
    })
    ro.observe(el)
    setViewport(el.clientWidth, el.clientHeight)
    requestAnimationFrame(() => fitCanvas())
    return () => ro.disconnect()
  }, [setViewport, fitCanvas])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        spaceDown.current = true
        if (viewportRef.current) viewportRef.current.dataset.panMode = 'true'
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false
        if (viewportRef.current) delete viewportRef.current.dataset.panMode
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const { canvas: c } = store.getState()
      const factor = Math.exp(-e.deltaY * 0.0015)
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor))
      const scale = nextZoom / c.zoom
      setCanvas({
        zoom: nextZoom,
        panX: mx - (mx - c.panX) * scale,
        panY: my - (my - c.panY) * scale,
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setCanvas, store])

  // Capture-phase pan so Space/middle-drag works even over the rating rectangle.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const onPointerDown = (e: PointerEvent) => {
      const middle = e.button === 1
      const space = spaceDown.current && e.button === 0
      if (!middle && !space) {
        const target = e.target as HTMLElement
        if (target === el || target.classList.contains('canvas-world')) {
          setRatingSelected(false)
        }
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const { canvas: c } = store.getState()
      dragging.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originPanX: c.panX,
        originPanY: c.panY,
      }
      el.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      const d = dragging.current
      if (!d || d.pointerId !== e.pointerId) return
      setCanvas({
        panX: d.originPanX + (e.clientX - d.startX),
        panY: d.originPanY + (e.clientY - d.startY),
      })
    }

    const endPan = (e: PointerEvent) => {
      if (dragging.current?.pointerId === e.pointerId) {
        dragging.current = null
      }
    }

    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }

    el.addEventListener('pointerdown', onPointerDown, true)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endPan)
    el.addEventListener('pointercancel', endPan)
    el.addEventListener('auxclick', onAuxClick)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown, true)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endPan)
      el.removeEventListener('pointercancel', endPan)
      el.removeEventListener('auxclick', onAuxClick)
    }
  }, [setCanvas, setRatingSelected, store])

  const zoomPercent = Math.round(canvas.zoom * 100)

  return (
    <div className="infinite-canvas" data-testid="infinite-canvas">
      <div ref={viewportRef} className="infinite-canvas__viewport" data-testid="canvas-viewport">
        <div
          className="canvas-world"
          data-testid="canvas-world"
          style={{
            transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
          }}
        >
          {children}
        </div>
      </div>
      <div className="zoom-controls" data-testid="zoom-controls">
        <button
          type="button"
          className="zoom-controls__btn"
          aria-label="Zoom out"
          onClick={() => {
            const z = Math.max(MIN_ZOOM, canvas.zoom / 1.15)
            setCanvas({ zoom: z })
          }}
        >
          −
        </button>
        <span className="zoom-controls__label" data-testid="zoom-percent">
          {zoomPercent}%
        </span>
        <button
          type="button"
          className="zoom-controls__btn"
          aria-label="Zoom in"
          onClick={() => {
            const z = Math.min(MAX_ZOOM, canvas.zoom * 1.15)
            setCanvas({ zoom: z })
          }}
        >
          +
        </button>
        <button
          type="button"
          className="zoom-controls__btn zoom-controls__fit"
          data-testid="zoom-fit"
          onClick={() => fitCanvas()}
        >
          Fit
        </button>
      </div>
    </div>
  )
}
