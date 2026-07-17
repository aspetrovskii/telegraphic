# Stitch Design Guide — Telegraphic

Instructions for the AI design agent working in **Google Stitch**. The output of this work (screens + `DESIGN.md` + generated code) will be consumed by coding agents in Cursor via the **Stitch MCP server**, so structure and naming discipline matter as much as visuals.

## 0. Product context (read first)

Telegraphic is a web app that turns a user's Telegram chat history into an animated **bar chart race video** ("Top chats by message count"), customized live in a Figma-like editor, previewed in-browser, shared via view-only links, and downloaded as MP4.

Full functional spec: `docs/PRD.md`. Reference materials:

- Reference 1 — target look of the rating video itself: a classic "Top Countries by GDP" bar race (bars with avatars/flags, value labels, big timer bottom-right).
- Reference 2 — hand-drawn editor mockup: top-left buttons `Total | Data | Share`, top-right `Design`, back arrow top-left, rating rectangle in the center of an infinite canvas, player at the bottom.

Important separation of concerns:

- **The rating video itself is rendered by our own Canvas engine, not by Stitch.** Stitch must design the *chrome* around it (panels, controls, player, pages) and define the *default theme tokens* the engine will use (colors, radii, fonts for bars/timer). In every editor screen, represent the rating rectangle as a static placeholder image/frame styled like Reference 1.

## 1. Deliverables

1. Desktop screens (1440×900 baseline) for every screen in section 3.
2. A project-wide **`DESIGN.md`** (design system export): color tokens, typography scale, spacing, radii, shadows, component specs. This file will be imported into the codebase and mapped to Tailwind/CSS variables — use token names from section 4.
3. Clickable prototype linking the main flow: Home → Editor → panels → Share dialog → Public view.
4. Generated frontend code per screen (React/Tailwind) — used as reference by coding agents, not copied verbatim.

## 2. Design direction

- Style: modern, minimal, "pro tool" feel — closer to Figma/Linear than to a consumer landing page. Light theme primary; provide a dark variant of the editor canvas area if cheap to do.
- The workspace canvas (infinite plane) should be a neutral gray so the rating rectangle pops.
- Panels: floating cards docked to screen edges with subtle shadow, 12px radius, comfortable 8pt-grid spacing.
- Typography: one grotesque family for UI (e.g. Inter); the rating video defaults may use a heavier condensed face for numbers.
- Accent color: single confident accent (suggest a Telegram-adjacent blue, but you decide); use sparingly — primary buttons, active states, sliders.
- All UI copy in **English**. Keep labels exactly as in the PRD: `Total`, `Data`, `Share`, `Design`, `Add record`, `Make a link`, `Manage links`, `Download a video`, etc.

## 3. Screens to design

Design them in this order; reuse components aggressively.

### 3.1 Editor — default state (core screen, do it first)

- Top-left: back arrow, project title (inline-editable), buttons `Total`, `Data`, `Share` (toggle buttons; active state visible)
- Top-right: `Design` button, user avatar menu
- Center: infinite-canvas area (subtle dot grid), one rating rectangle placeholder (16:9), selected state with a thin accent outline; zoom controls bottom-right of the canvas (zoom %, fit)
- Bottom: preview player bar — play/pause, elapsed/total time, scrubber, export (download) button, fullscreen

### 3.2 Editor — Total panel open

Left docked panel (~320px) with the controls listed in PRD 2.2/Total: Top N stepper, dates-interval range picker, Scale slider (0–500%), Screen size preset select + custom W×H, Speed segmented control ("Total length" / "Days per second") with a number input, Start/finish delay inputs, Smoothing interval input. Group related controls with section headers.

### 3.3 Editor — Data panel open

Left docked panel: search field on top, `Add record` primary button, list of record rows (visibility eye toggle, 32px avatar, editable name, message count, kebab menu with Rename/Delete). Include states: empty list (CTA to add first record), a row in rename mode, and an import-in-progress row with a progress bar.

### 3.4 Editor — Add record (import) modal

Modal with a drag&drop zone for `result.json` / ZIP, short instruction text ("Export a single chat from Telegram Desktop → Export chat history → JSON"), parsing progress state, error state (wrong file), success state.

### 3.5 Editor — Share panel open

Left docked panel: `Make a link` primary button, list of active links (truncated URL, created date, copy icon-button, revoke icon-button), `Download a video` secondary button. Include an empty state.

### 3.6 Editor — Design panel open (right side)

Right docked panel (~340px) with an element selector on top: two large tiles `Background` / `Card`.

- **Background tab**: Value frontiers segmented (`Lines / Stripes / Off`), Filling (color swatch + image upload), collapsible **Timer** section: show toggle, position (4-corner picker + offsets), format dropdown, typography controls (font, size, weight, color, opacity), backdrop style (none/pill/rectangle + color/opacity/blur), change-animation dropdown (none/fade/slide/odometer).
- **Card tab**: two sub-sections — "All cards" (corner radius, bar height, gap, value format raw/compact, label positions, avatar shape/size/toggle, rank toggle, typography, bar fill style, shadow, entrance animation) and "Selected card" (color override, name color, avatar upload). Show a small live thumbnail of a single card at the top of the panel.

This panel is dense — prioritize clear grouping, collapsible sections, compact controls (Figma-style property rows).

### 3.7 Home page

Google Drive-like: header (logo, search, user menu), "New rating" primary button, responsive grid of project cards (16:9 thumbnail, title, "Edited 2d ago", kebab menu: Open/Rename/Duplicate/Share/Delete). States: empty (first-run CTA), list view toggle optional.

### 3.8 Public view page (`/p/:slug`)

Centered player on a quiet background: video frame, player controls, project title, `Download MP4` button, `Duplicate to my projects` secondary button, tiny "Made with Telegraphic" footer link. No editor chrome.

### 3.9 Auth pages

Sign in and Sign up: minimal centered card, email + password, single accent button, link between the two pages.

## 4. Token naming contract (for DESIGN.md)

Use these prefixes so the codebase mapping is mechanical:

- Colors: `color.bg.canvas`, `color.bg.panel`, `color.bg.surface`, `color.text.primary`, `color.text.secondary`, `color.accent`, `color.accent.hover`, `color.danger`, `color.border`
- Radii: `radius.panel`, `radius.control`, `radius.card`
- Typography: `font.ui`, `font.numeric`, sizes `text.xs..xl`
- Rating defaults (consumed by the Canvas engine): `rating.bar.palette` (10+ distinct colors), `rating.bar.radius`, `rating.timer.font`, `rating.timer.color`, `rating.axis.color`, `rating.bg.color`

## 5. Working process in Stitch

1. Generate a `DESIGN.md` first (design system), then design screen 3.1, iterate until approved, then propagate the system to the rest.
2. One Stitch screen per state listed above — do not merge states into one frame; coding agents will fetch screens individually via MCP.
3. Name screens exactly: `editor-default`, `editor-total`, `editor-data`, `editor-import-modal`, `editor-share`, `editor-design-background`, `editor-design-card`, `home`, `home-empty`, `public-view`, `auth-sign-in`, `auth-sign-up`.
4. After approval, keep the project stable: additive changes only, no renaming screens (MCP consumers reference them by name).
