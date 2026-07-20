/**
 * Minimal Canvas 2D surface consumed by the engine.
 * Callers pass a real `CanvasRenderingContext2D` (browser) or a compatible stub.
 * The engine never touches `document` / `window`.
 */

export type EngineTextMetrics = {
  width: number
}

export type EngineCanvasGradient = {
  addColorStop(offset: number, color: string): void
}

export type EngineCanvasContext = {
  canvas: { width: number; height: number }
  save(): void
  restore(): void
  beginPath(): void
  closePath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  rect(x: number, y: number, w: number, h: number): void
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void
  fill(): void
  stroke(): void
  clip(): void
  fillRect(x: number, y: number, w: number, h: number): void
  clearRect(x: number, y: number, w: number, h: number): void
  roundRect?(x: number, y: number, w: number, h: number, radii?: number | number[]): void
  fillText(text: string, x: number, y: number, maxWidth?: number): void
  measureText(text: string): EngineTextMetrics
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): EngineCanvasGradient
  scale(x: number, y: number): void
  translate(x: number, y: number): void
  globalAlpha: number
  /** Browser ctx also allows CanvasPattern; engine only assigns string/gradient. */
  fillStyle: string | EngineCanvasGradient | object
  strokeStyle: string | object
  lineWidth: number
  font: string
  textAlign: string
  textBaseline: string
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
}
