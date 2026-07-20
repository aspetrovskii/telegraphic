# Telegraphic design tokens

Derived from `docs/STITCH_DESIGN_GUIDE.md` §4 (Stitch MCP unavailable in this environment).
Coding agents map these to CSS variables — do not hard-code hex in components.

## Colors

| Token | CSS variable | Value | Use |
|---|---|---|---|
| `color.bg.canvas` | `--color-bg-canvas` | `#E8ECF0` | App / home canvas |
| `color.bg.panel` | `--color-bg-panel` | `#FFFFFF` | Panels, auth card |
| `color.bg.surface` | `--color-bg-surface` | `#F7F9FB` | Subtle surfaces, thumbnails |
| `color.text.primary` | `--color-text-primary` | `#1A1D21` | Headings, titles |
| `color.text.secondary` | `--color-text-secondary` | `#5C6570` | Meta, placeholders |
| `color.accent` | `--color-accent` | `#2AABEE` | Primary actions (Telegram-adjacent) |
| `color.accent.hover` | `--color-accent-hover` | `#1E96D5` | Accent hover |
| `color.danger` | `--color-danger` | `#D94A4A` | Destructive |
| `color.border` | `--color-border` | `#D5DBE1` | Hairlines / inputs |

## Radii

| Token | CSS variable | Value |
|---|---|---|
| `radius.panel` | `--radius-panel` | `12px` |
| `radius.control` | `--radius-control` | `8px` |
| `radius.card` | `--radius-card` | `12px` |

## Typography

| Token | CSS variable | Value |
|---|---|---|
| `font.ui` | `--font-ui` | `"Segoe UI", "Helvetica Neue", system-ui, sans-serif` |
| `font.numeric` | `--font-numeric` | `"Segoe UI", system-ui, sans-serif` |
| `text.xs` … `text.xl` | `--text-xs` … `--text-xl` | 12 / 14 / 16 / 20 / 28 px |

## Spacing

8pt grid: `--space-1` (4px) … `--space-8` (32px).

## Shadows

| Token | CSS variable |
|---|---|
| Panel | `--shadow-panel`: `0 4px 24px color-mix(in srgb, #1A1D21 8%, transparent)` |
| Card | `--shadow-card`: `0 1px 3px color-mix(in srgb, #1A1D21 10%, transparent)` |
