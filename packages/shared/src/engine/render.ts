import type { Project } from '../types/project.js'
import type { EngineCanvasContext } from './canvas.js'
import { drawFrame } from './draw.js'
import { computeFrameLayout } from './layout.js'

/**
 * Deterministic bar-race renderer.
 * Identical `(project, tSec)` → identical pixels (given the same canvas implementation).
 *
 * Contract (AGENTS.md): pure function of `(project, tSec)` — no `Date.now()`,
 * `Math.random()`, DOM, or React in this path.
 *
 * The caller must size the canvas to `project.settings.screenSize` before calling.
 */
export function render(ctx: EngineCanvasContext, project: Project, tSec: number): void {
  const layout = computeFrameLayout(project, tSec)
  drawFrame(ctx, layout, project.theme)
}
