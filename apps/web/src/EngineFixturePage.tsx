import { useLayoutEffect, useMemo, useRef } from 'react'
import { computeProjectDuration, createEngineFixtureProject, render } from '@telegraphic/shared'

type Props = {
  /** Explicit tSec; when omitted, read from `?t=` (default 0). */
  tSec?: number
}

/**
 * Minimal host page for Phase 2 visual snapshots.
 * Renders the shared engine once into a canvas sized to the fixture screen.
 */
export function EngineFixturePage({ tSec }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const project = useMemo(() => createEngineFixtureProject(), [])
  const totalSeconds = useMemo(() => computeProjectDuration(project).totalSeconds, [project])

  const resolvedT = useMemo(() => {
    if (tSec !== undefined) return tSec
    const raw = new URLSearchParams(window.location.search).get('t')
    if (raw === 'mid') return totalSeconds / 2
    if (raw === 'end') return totalSeconds
    const n = raw === null ? 0 : Number(raw)
    return Number.isFinite(n) ? n : 0
  }, [tSec, totalSeconds])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = project.settings.screenSize
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    render(ctx, project, resolvedT)
  }, [project, resolvedT])

  return (
    <main className="engine-fixture">
      <h1 className="engine-fixture__title">Engine fixture</h1>
      <p className="engine-fixture__meta" data-testid="engine-t">
        t={resolvedT}
      </p>
      <canvas
        ref={canvasRef}
        data-testid="engine-canvas"
        className="engine-fixture__canvas"
        width={project.settings.screenSize.width}
        height={project.settings.screenSize.height}
      />
    </main>
  )
}
