import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  computeProjectDuration,
  createEngineFixtureProject,
  render,
  type Project,
  type Theme,
} from '@telegraphic/shared'

type Props = {
  /** Explicit tSec; when omitted, read from `?t=` (default 0). */
  tSec?: number
}

/**
 * Minimal host page for Phase 2/5 visual snapshots.
 * Renders the shared engine once into a canvas sized to the fixture screen.
 * Optional `?theme=` JSON patch deep-merges into the fixture theme (Phase 5 matrix).
 */
export function EngineFixturePage({ tSec }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const project = useMemo(() => buildFixtureProject(), [])
  const duration = useMemo(() => computeProjectDuration(project), [project])

  const resolvedT = useMemo(() => {
    if (tSec !== undefined) return tSec
    const raw = new URLSearchParams(window.location.search).get('t')
    // Mid = halfway through the animated race (delays excluded).
    if (raw === 'mid') {
      return Math.max(0, project.settings.startDelay) + duration.animationSeconds / 2
    }
    if (raw === 'end') return duration.totalSeconds
    const n = raw === null ? 0 : Number(raw)
    return Number.isFinite(n) ? n : 0
  }, [tSec, project, duration])

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

function buildFixtureProject(): Project {
  const base = createEngineFixtureProject()
  const params = new URLSearchParams(window.location.search)
  const themeRaw = params.get('theme')
  if (!themeRaw) return base
  try {
    const patch = JSON.parse(themeRaw) as DeepPartialTheme
    return { ...base, theme: mergeTheme(base.theme, patch) }
  } catch {
    return base
  }
}

type DeepPartialTheme = {
  background?: {
    valueFrontiers?: Theme['background']['valueFrontiers']
    filling?: Partial<Theme['background']['filling']>
    timer?: Partial<Theme['background']['timer']>
  }
  card?: Partial<Omit<Theme['card'], 'valueLabel' | 'nameLabel' | 'avatar' | 'typography'>> & {
    valueLabel?: Partial<Theme['card']['valueLabel']>
    nameLabel?: Partial<Theme['card']['nameLabel']>
    avatar?: Partial<Theme['card']['avatar']>
    typography?: Partial<Theme['card']['typography']>
  }
}

function mergeTheme(base: Theme, patch: DeepPartialTheme): Theme {
  return {
    background: {
      valueFrontiers: patch.background?.valueFrontiers ?? base.background.valueFrontiers,
      filling: { ...base.background.filling, ...patch.background?.filling },
      timer: { ...base.background.timer, ...patch.background?.timer },
    },
    card: {
      ...base.card,
      ...patch.card,
      valueLabel: { ...base.card.valueLabel, ...patch.card?.valueLabel },
      nameLabel: { ...base.card.nameLabel, ...patch.card?.nameLabel },
      avatar: { ...base.card.avatar, ...patch.card?.avatar },
      typography: { ...base.card.typography, ...patch.card?.typography },
      palette: patch.card?.palette ?? base.card.palette,
    },
  }
}
