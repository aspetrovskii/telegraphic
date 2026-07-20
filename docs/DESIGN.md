# Telegraphic design tokens

Derived from `docs/STITCH_DESIGN_GUIDE.md` §4 (Stitch MCP unavailable in this environment).
Coding agents map these to CSS variables — do not hard-code hex in components.

Implemented in `apps/web/src/styles/tokens.css` (imported by `styles.css`).

## Colors

| Token | CSS variable | Value | Use |
|---|---|---|---|
| `color.bg.app` | `--color-bg-app` | `#F0F2F5` | Editor chrome |
| `color.bg.canvas` | `--color-bg-canvas` | `#E8ECF0` | App / home / infinite canvas |
| `color.bg.panel` | `--color-bg-panel` | `#FFFFFF` | Panels, auth card |
| `color.bg.surface` | `--color-bg-surface` | `#F7F9FB` | Subtle surfaces, thumbnails |
| `color.text.primary` | `--color-text-primary` | `#1A1D21` | Headings, titles |
| `color.text.secondary` | `--color-text-secondary` | `#5C6570` | Meta, placeholders |
| `color.text.on-accent` | `--color-text-on-accent` / `--color-on-accent` | `#FFFFFF` | Text on accent buttons |
| `color.accent` | `--color-accent` | `#2AABEE` | Primary actions (Telegram-adjacent) |
| `color.accent.hover` | `--color-accent-hover` | `#1E96D5` | Accent hover |
| `color.danger` | `--color-danger` | `#D94A4A` | Destructive |
| `color.border` | `--color-border` | `#D5DBE1` | Hairlines / inputs |
| `color.border.strong` | `--color-border-strong` | `#98A2B3` | Stronger borders |
| `color.selection` | `--color-selection` | `#2AABEE` | Rating rectangle selection |

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
| Toolbar | `--shadow-toolbar`: `0 1px 3px color-mix(in srgb, #1A1D21 8%, transparent)` |

## Editor IA (Phase 3–4)

- Top-left: back, title, `Total` / `Data` / `Share` toggles
- Top-right: `Design` toggle
- Center: infinite canvas (dot grid) + one rating rectangle
- Bottom: preview player (play/pause, scrub, time)
- Zoom controls: canvas bottom-right (percent + fit)
- **Total panel** (`editor-total`): Top N, Dates interval, Scale, Screen size, Speed mode/value, Start/finish delay, Smoothing interval — live-bound to engine
- **Data panel** (`editor-data`): search, record rows (visibility, avatar upload, rename, delete), Add record → import modal (`editor-import-modal`)
- Share / Design panels remain stubs until later phases

Adapt layouts to PRD behavior; do not pixel-copy Stitch frames. Stitch project: Telegraphic Design (fetched via MCP for Phase 4).

## Rating defaults (engine / Theme)

See `DEFAULT_BAR_PALETTE` / `createDefaultTheme` in `@telegraphic/shared`.
