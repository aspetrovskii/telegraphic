# Telegraphic — Product Requirements Document

Browser app for creating interactive **bar chart race videos** of a user's Telegram chats ranked by message count. Reference visual: classic "Top Countries by GDP" bar race videos.

- Live customization applied in real time on the site
- Projects can be saved, shared via view-only links, previewed on-site, and downloaded as MP4
- UI language: **English**
- Design source of truth: Google Stitch project (accessed via Stitch MCP server), see `docs/STITCH_DESIGN_GUIDE.md`
- Technical decisions: `.cursor/plans/telegram_bar_race_mvp_28875287.plan.md`

## 1. Users and auth

- Simple auth: email + password, cookie sessions. No OAuth in MVP.
- A user owns projects. Anonymous visitors can only open shared view-only links.

## 2. Pages

### 2.1 Home page (`/`)

Google Drive-like management of the user's rating projects:

- Grid/list of project cards: thumbnail (last rendered frame), title, updatedAt
- Actions: create new project, open, rename, duplicate, delete, open share dialog
- Search by title, sort by updatedAt/title
- Empty state with a "Create your first rating" CTA
- Header: app logo, user menu (sign out)

### 2.2 Editor page (`/edit/:projectId`)

Figma-like workspace:

- **Infinite canvas**: pan (space+drag / middle mouse), zoom (ctrl+wheel, pinch), zoom-to-fit. Exactly one object lies on the plane — the **rating rectangle** (the video frame being designed). It can be selected; its size is controlled from the Total panel (not by free dragging of handles) in MVP.
- **Top-left toolbar**: buttons `Total`, `Data`, `Share`. Clicking one opens the corresponding panel docked on the left side; clicking again closes it. Only one left panel open at a time. A back arrow returns to Home.
- **Top-right toolbar**: button `Design`. Opens the right-side design panel.
- **Bottom player**: preview player for the rating video (see 2.4).
- All settings changes apply to the canvas preview **immediately** (live), without re-parsing data.

#### Panel: Total (global rating settings)

| Setting | Control | Notes |
|---|---|---|
| Top N | number stepper / slider | how many positions on screen, default 15 |
| Dates interval | date range picker | clamps rating to a sub-range of available data |
| Scale | slider 0–500% | bar length scale relative to auto-fit |
| Screen size | preset select (1920×1080, 1080×1920, 1080×1080) + custom W×H | size of the rating rectangle |
| Speed mode | segmented control: "Total length" / "Days per second" | either total video length k seconds, or each video second = k days |
| Speed value | number input | seconds or days depending on mode |
| Start/finish delay | two number inputs (seconds) | freeze frame at start and end |
| Smoothing interval | number input (days) | aggregate granularity: data smoothed over k-day windows |

#### Panel: Data (records)

A **record** = one chat in the rating. One Telegram export = one record (the user exports each chat separately from Telegram Desktop and adds them one by one).

- Search records by name
- List rows: drag-visibility eye toggle (show/hide in rating), avatar, editable title (rename), message total, delete button
- **Add record**: opens import flow — drop `result.json` / ZIP of a single-chat Telegram Desktop export; parsing progress; on success the record appears in the list
- Per-record avatar upload (image resized client-side to ~128px)

#### Panel: Share (Google Drive-like, view-only)

- **Make a link**: creates a view-only link `/p/:slug` (long unguessable slug)
- **Manage links**: list of active links with created date, copy button, revoke button
- **Download a video**: triggers MP4 export (same as player's export button)

#### Panel: Design (right side)

On open, the user picks the element to style: **Background** or **Card**. (Clicking the background or a card on the canvas also selects it.)

**Background design**

- Value frontiers (vertical gridlines with axis values on top): `lines` / `stripes` / `off`
- Filling: solid color / image upload (cover/contain/tile)
- **Timer design** (the date-time label in the bottom-right):
  - Show/hide; position preset (4 corners) + X/Y offset
  - Format: `DD/MM/YY`, `DD MMM YYYY`, `MMM YYYY`, `YYYY`, `Q# YYYY`, optional second line with time `HH:MM` when smoothing < 1 day
  - Typography: font family (curated list), size, weight, color, opacity, letter spacing
  - Backdrop: none / pill / rectangle; backdrop color and opacity; blur
  - Change animation: none / fade / slide-up / odometer (digits roll)

**Card design** (a card = one bar row: avatar + bar + name + value)

Global (applies to all cards):

- Bar corner radius, bar height, gap between bars
- Value label: show/hide; format raw (`128000`) / compact (`128k`, `1.2M`); decimals; thousands separator; position (outside end of bar / inside bar end)
- Name label: show/hide; position (inside bar end / outside); max width with ellipsis
- Avatar: show/hide; shape circle / rounded / square; size; border width and color; fallback = colored initials
- Rank number: show/hide
- Typography: font family, size, weight for name and value
- Bar fill style: solid / horizontal gradient / subtle texture; bar outline on/off
- Shadow: none / soft; entrance animation of new cards: fade / slide from edge

Per-card overrides (selected via Data list or clicking a card):

- Bar color (default: stable auto palette by record id)
- Name text color
- Avatar image (same as Data panel upload)

### 2.3 Public view page (`/p/:slug`)

- The same player component, view-only: play/pause, scrub, fullscreen
- Buttons: "Download MP4", "Duplicate to my projects" (requires sign-in)
- No editor UI; `noindex` meta

### 2.4 Preview player (bottom of editor, and public page)

- Play/pause, current time / total duration, scrubber with thumbnail-free seek
- Live: any setting change re-renders the current frame immediately; playback uses the same deterministic engine `render(state, t)`
- Export button → MP4 encode with progress bar → file download

### 2.5 Auth pages

- Sign in / sign up (email + password), minimal; redirect to Home

## 3. Rating engine (functional requirements)

- Input: per-record cumulative daily series clipped to the dates interval and smoothed over k-day windows
- Each tick: sort by cumulative count desc → take Top N
- Between ticks: linear interpolation of bar widths and Y positions (rank swaps animate)
- Enter/exit top N: fade + slide from/to bottom edge
- X axis with dynamic max (smoothed ceiling so the scale does not jitter)
- Deterministic: `render(canvasCtx, projectState, timeSec)` produces identical output for identical inputs — this is the contract that preview, export, and visual tests all rely on

## 4. Non-functional

- Parsing in a Web Worker; raw messages never leave the browser; server stores aggregates only
- MP4 via WebCodecs + mp4-muxer; MediaRecorder/WebM fallback with a UI notice on unsupported browsers
- Target: smooth 30 fps preview at 1080p on a mid-range laptop
- Project payload limit (avatars resized client-side); API rejects oversized payloads with a clear error
