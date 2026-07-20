/** Curated font list for Design panel typography controls (PRD §2.2). */
export const CURATED_FONTS = [
  'Inter',
  'Arial',
  'Helvetica Neue',
  'Georgia',
  'Courier New',
  'system-ui',
] as const

export const FONT_WEIGHTS: { value: number; label: string }[] = [
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
]
