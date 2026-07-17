# Telegraphic — Product Requirements Document

Browser app for creating interactive **bar chart race videos** of a user's Telegram chats ranked by message count. Reference visual: classic "Top Countries by GDP" bar race videos.

- Live customization applied in real time on the site
- Projects can be saved, shared via view-only links, previewed on-site, and downloaded as MP4
- UI language: **English**
- Design source of truth: Google Stitch project (accessed via Stitch MCP server), see `docs/STITCH_DESIGN_GUIDE.md`
- Technical decisions: `.cursor/plans/telegram_bar_race_mvp_28875287.plan.md`

## Naming contract

Use these terms consistently across code, UI, and docs:

| Term | Meaning |
|---|---|
| **Project** | A saved rating (title, records, settings, theme) |
| **Record** | One chat entry in a project (one Telegram export = one record) |
| **Card** | Visual bar-row for a record in the rating video |
| **Settings** | Global playback/layout options (Total panel) — field `project.settings` |
| **Theme** | Visual design options (Design panel) — field `project.theme` |
| **Share link** | View-only public URL `/p/:slug` (`slug`, not project `id`) |

Canonical engine signature (same in preview, export, and tests):

```ts
render(ctx: CanvasRenderingContext2D, project: Project, tSec: number): void
```

## 1. Users and auth

- Simple auth: email + password, cookie sessions. No OAuth in MVP.
- A user owns projects. Anonymous visitors can only open shared view-only links.

## 2. Data model (canonical field names)

```ts
type Project = {
  id: string
  ownerId: string
  title: string
  createdAt: string // ISO
  updatedAt: string // ISO
  ticks: string[] // ISO dates, daily grid
  records: Record[]
  settings: Settings
  theme: Theme
}

type Record = {
  id: string
  title: string // user-renamable display name
  sourceChatTitle: string // original name from export
  color?: string // per-card bar color override
  nameColor?: string // per-card name text color override
  avatarDataUrl?: string
  visible: boolean
  counts: number[] // cumulative per tick; length === ticks.length
}

type Settings = {
  topN: number // default 15
  dateStart: string // ISO date, inclusive
  dateEnd: string // ISO date, inclusive
  scalePercent: number // 0–500
  screenWidth: number
  screenHeight: number
  speedMode: "totalLength" | "daysPerSecond"
  speedValue: number // seconds if totalLength; days-per-second if daysPerSecond
  startDelaySec: number
  finishDelaySec: number
  smoothingDays: number // aggregate granularity over k-day windows
}

type Theme = {
  background: {
    valueFrontiers: "lines" | "stripes" | "off"
    fill: { type: "color"; color: string } | { type: "image"; dataUrl: string; fit: "cover" | "contain" | "tile" }
  }
  timer: {
    visible: boolean
    corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
    offsetX: number
    offsetY: number
    format: "DD/MM/YY" | "DD MMM YYYY" | "MMM YYYY" | "YYYY" | "Q YYYY"
    showTime: boolean // second line HH:MM when useful
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    opacity: number
    letterSpacing: number
    backdrop: "none" | "pill" | "rectangle"
    backdropColor: string
    backdropOpacity: number
    backdropBlur: number
    changeAnimation: "none" | "fade" | "slideUp" | "odometer"
  }
  card: {
    // global (all cards)
    barRadius: number
    barHeight: number
    barGap: number
    valueVisible: boolean
    valueFormat: "raw" | "compact" // compact → 128k, 1.2M
    valueDecimals: number
    valueThousandsSeparator: boolean
    valuePosition: "outsideEnd" | "insideEnd"
    nameVisible: boolean
    namePosition: "insideEnd" | "outside"
    nameMaxWidth: number
    avatarVisible: boolean
    avatarShape: "circle" | "rounded" | "square"
    avatarSize: number
    avatarBorderWidth: number
    avatarBorderColor: string
    rankVisible: boolean
    nameFontFamily: string
    nameFontSize: number
    nameFontWeight: number
    valueFontFamily: string
    valueFontSize: number
    valueFontWeight: number
    barFillStyle: "solid" | "gradient" | "texture"
    barOutline: boolean
    shadow: "none" | "soft"
    entranceAnimation: "fade" | "slideFromEdge"
  }
}

type ShareLink = {
  id: string
  projectId: string
  slug: string // long unguessable; public URL /p/:slug
  createdAt: string
  revokedAt?: string
}
```

Raw Telegram messages never leave the browser. The API stores aggregates + settings + theme + metadata only.

## 3. Pages

### 3.1 Home page (`/`)

Google Drive-like management of the user's rating projects:

- Grid/list of project cards: thumbnail (last rendered frame), `title`, `updatedAt`
- Actions: create new project, open, rename, duplicate, delete, open share UI
- Search by `title`, sort by `updatedAt` / `title`
- Empty state CTA label: **"Create your first rating"**
- Primary button (non-empty): **"New rating"**
- Header: app logo, user menu (sign out)

### 3.2 Editor page (`/edit/:projectId`)

Figma-like workspace:

- **Infinite canvas**: pan (space+drag / middle mouse), zoom (ctrl+wheel, pinch), zoom-to-fit. Exactly one object on the plane — the **rating rectangle** (video frame). Selectable; size comes from `settings.screenWidth` / `settings.screenHeight` (Total panel), not free drag handles in MVP.
- **Top-left toolbar**: buttons `Total`, `Data`, `Share`. Toggle the matching left docked panel; only one left panel open at a time. Back arrow → Home.
- **Top-right toolbar**: button `Design` → right Design panel.
- **Bottom player**: preview player (see 3.4).
- All changes apply to the canvas preview immediately (live), without re-parsing data.

#### Panel: Total → binds to `project.settings`

| UI label | Field | Control | Notes |
|---|---|---|---|
| Top N | `topN` | stepper / slider | positions on screen; default 15 |
| Dates interval | `dateStart`, `dateEnd` | date range picker | clamps to available data |
| Scale | `scalePercent` | slider 0–500% | bar length vs auto-fit |
| Screen size | `screenWidth`, `screenHeight` | presets (1920×1080, 1080×1920, 1080×1080) + custom W×H | rating rectangle size |
| Speed | `speedMode`, `speedValue` | segmented: **"Total length"** / **"Days per second"** + number | `totalLength` → video length in seconds; `daysPerSecond` → each video second = k days |
| Start/finish delay | `startDelaySec`, `finishDelaySec` | two number inputs (seconds) | freeze at start/end |
| Smoothing interval | `smoothingDays` | number input (days) | aggregate over k-day windows |

#### Panel: Data → binds to `project.records`

A **record** = one chat. One Telegram Desktop export = one record (added one by one via Add record).

- Search records by `title`
- List rows: visibility toggle (`visible`), avatar, editable `title`, message total, delete
- **Add record**: import modal — drop single-chat `result.json` / ZIP; parsing progress; on success append a `Record`
- Per-record avatar upload → `avatarDataUrl` (client resize ~128px)

#### Panel: Share → binds to `ShareLink[]` for this project

- **Make a link**: create view-only `/p/:slug`
- **Manage links**: list active links (truncated URL, `createdAt`, copy, revoke)
- **Download a video**: same MP4 export as the player export action

#### Panel: Design → binds to `project.theme`

On open, pick element: **Background** or **Card**. Clicking the background or a card on the canvas also selects it.

**Background** → `theme.background` + `theme.timer`

- Value frontiers: UI `Lines` / `Stripes` / `Off` → `valueFrontiers: "lines" | "stripes" | "off"`
- Filling: color / image (`fill`)
- **Timer** (`theme.timer`): visibility, corner + offsets, `format`, optional time line, typography, backdrop, `changeAnimation` (`none` / `fade` / `slideUp` / `odometer`)

**Card** → `theme.card` (global) + selected `Record` overrides (`color`, `nameColor`, `avatarDataUrl`)

Global controls map 1:1 to `theme.card` fields listed in the data model. Per-card overrides: bar color, name text color, avatar image.

### 3.3 Public view page (`/p/:slug`)

- Same player component, view-only: play/pause, scrub, fullscreen
- Buttons: **"Download a video"**, **"Duplicate to my projects"** (requires sign-in)
- No editor UI; `noindex` meta

### 3.4 Preview player (editor bottom + public page)

- Play/pause, current time / total duration, scrubber
- Live: setting/theme changes re-render the current frame; playback calls `render(ctx, project, tSec)`
- Export action label: **"Download a video"** → MP4 encode with progress → file download

### 3.5 Auth pages

- Sign in / Sign up (email + password); redirect to Home

## 4. Rating engine (functional requirements)

- Input: per-record cumulative series from `ticks` / `counts`, clipped by `dateStart`/`dateEnd`, smoothed by `smoothingDays`
- Each tick: sort by cumulative count desc → take `topN`
- Between ticks: lerp bar widths and Y positions (rank swaps)
- Enter/exit top N: fade + slide from/to bottom edge
- X axis with dynamic max (smoothed ceiling)
- Deterministic: identical `(project, tSec)` → identical pixels

## 5. Non-functional

- Parsing in a Web Worker; raw messages never leave the browser
- MP4 via WebCodecs + mp4-muxer; MediaRecorder/WebM fallback with a UI notice
- Target: smooth 30 fps preview at 1080p on a mid-range laptop
- Project payload limit (avatars resized client-side); API rejects oversized payloads clearly
