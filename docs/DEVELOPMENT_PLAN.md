# Telegraphic — Autonomous Development Plan

How the project is built end-to-end by AI agents in Cursor IDE with minimal human intervention, following GitHub best practices. Product spec: `docs/PRD.md`. Design source: Google Stitch via MCP (`docs/STITCH_DESIGN_GUIDE.md`). Fixed technical decisions: `.cursor/plans/telegram_bar_race_mvp_28875287.plan.md`.

## 1. Development model (chosen approach)

**One phase = one cloud agent = one PR.** Each phase below is dispatched to a Cursor cloud agent (or a local agent for phases needing local browser/GPU checks) with a self-contained prompt referencing this file. The agent works on its own branch, opens a PR, and the PR must pass the full quality gate before merge.

Rejected alternatives (for the record):

- *Single long-running local agent building everything in one session* — no parallelism, huge context, no review boundaries.
- *Best-of-N parallel attempts per phase* — useful fallback for the two riskiest phases (canvas engine, MP4 export) if the first attempt fails review; not the default because of cost.

### Quality gate (every PR)

1. **CI (GitHub Actions)**: typecheck, ESLint + Prettier check, Vitest unit tests, build, Playwright e2e + visual snapshots. Branch protection on `main` requires all checks green.
2. **Cursor Bugbot** review on the PR; agent fixes findings before requesting merge.
3. **Vercel preview deploy** on every PR; the phase agent (or a follow-up `browser-use` agent) smoke-tests the preview URL against the phase's acceptance checklist.
4. Human = final merge click only (or auto-merge once trust is established).

### Autonomy mechanics in Cursor

- **AGENTS.md** (repo root) — standing instructions every agent reads: stack, commands, conventions, testing contract, "definition of done".
- **`.cursor/rules/`** — scoped rules: e.g. an engine rule ("engine must stay deterministic: pure `render(state, t)`, no `Date.now`/`Math.random` in render path"), an API rule (validation with zod, no raw messages stored), a UI rule (tokens from DESIGN.md only, no hard-coded colors).
- **Stitch MCP** — coding agents fetch screens, tokens, and generated markup for each UI phase; the design is never re-invented by hand.
- **Hooks** — post-edit hook running `pnpm lint --fix` + `pnpm typecheck` on changed packages, so agents self-correct before committing.
- **Babysit skill** — after a phase PR is opened, run the babysit loop to keep it merge-ready (CI fixes, review-comment triage, conflict resolution).
- **browser-use subagents** — every UI phase ends with a scripted browser session against the local dev server or Vercel preview: click through the acceptance checklist, screenshot key states, attach results to the PR description.
- **Automations (optional)** — a scheduled automation that re-runs the e2e suite nightly on `main` and files an issue on regression.

## 2. Repository & GitHub setup (best practices)

- **Monorepo (pnpm workspaces)**:
  - `apps/web` — Vite + React + TS frontend
  - `apps/api` — Hono backend (SQLite dev / Turso prod)
  - `packages/shared` — Project/Theme types, parser, bar-race engine (framework-free, fully unit-tested)
- **Branching**: trunk-based; `feat/phase-N-<slug>` branches; squash-merge to `main`; linear history.
- **Conventional Commits** + PR title lint; CHANGELOG later via release-please if needed.
- **Branch protection on `main`**: required status checks (ci, e2e), required Bugbot review pass, no direct pushes.
- **Templates**: `.github/PULL_REQUEST_TEMPLATE.md` (summary, phase checklist, screenshots from browser test), issue templates (bug/feature).
- **CI** (`.github/workflows/ci.yml`): install → typecheck → lint → unit → build → Playwright (with cached browsers); visual snapshots stored in-repo, updated only deliberately.
- **CD**: Vercel Git integration — preview per PR, production on `main`. Secrets (Turso URL/token, session secret) in Vercel + GitHub environments, never in repo.
- **Security**: Dependabot, secret scanning, `SECURITY.md` optional later.

## 3. Phases

Each phase lists: goal, key outputs, and the acceptance checklist that the browser-test agent verifies. A phase agent must not start work outside its phase.

### Phase 0 — Scaffold & infrastructure

Monorepo skeleton, tooling (TS strict, ESLint, Prettier, Vitest, Playwright), CI workflow, Vercel project, AGENTS.md, `.cursor/rules/`, PR/issue templates, README.
**Accept**: CI green on a trivial PR; `pnpm dev` runs web+api; preview deploy works.

### Phase 1 — Parser & data model (`packages/shared`)

Telegram Desktop export parser (single-chat `result.json` / ZIP → record with daily cumulative series), Web Worker wrapper in `apps/web`, fixtures (small dummy exports committed to repo), edge cases (service messages, empty days, timezone). Project/Record/Settings/Theme types finalized per PRD.
**Accept**: unit tests cover fixtures incl. malformed input; parsing 50MB JSON stays off the main thread.

### Phase 2 — Bar race engine (`packages/shared`)

Deterministic `render(ctx, project, tSec)`: Top N, rank/width lerp, enter/exit animation, dynamic axis, timer label, all theme tokens applied. No DOM/React dependencies.
**Accept**: unit tests for layout math (ranking, interpolation, axis ceiling); Playwright visual snapshots of fixed frames (t=0, mid, end) on a fixture project; identical output across two runs (determinism test).

### Phase 3 — Editor shell (design from Stitch)

Fetch `editor-default` screen + DESIGN.md via Stitch MCP, map tokens to CSS variables/Tailwind. Infinite canvas (pan/zoom/fit), rating rectangle rendering live via engine, top toolbars with panel toggle buttons (panels empty for now), bottom player bar (play/pause/scrub wired to engine time).
**Accept**: browser test — pan/zoom works, playback runs at 30fps on fixture project, panel buttons toggle empty panels.

### Phase 4 — Total & Data panels

All Total controls live-bound via Zustand → engine (Top N, dates interval, scale, screen size, speed modes, delays, smoothing). Data panel: list, search, rename, delete, visibility, Add record → import modal → worker parsing → record appears. Avatar upload with client-side resize.
**Accept**: browser test — add fixture export, tweak every Total control, changes visible immediately; rename/hide/delete flows work.

### Phase 5 — Design panels

Design panel per Stitch screens: Background (frontiers, filling, full timer customization) and Card (global settings + per-card overrides) as specified in PRD 2.2. Every control maps to a Theme field consumed by the engine.
**Accept**: visual snapshot matrix — each theme control changes exactly its target; timer formats and animations verified frame-by-frame.

### Phase 6 — Player polish & MP4 export

Export pipeline: engine → WebCodecs frames → mp4-muxer → download, with progress UI; MediaRecorder/WebM fallback + browser notice. Start/finish delays honored.
**Accept**: exported MP4 duration/fps/size match settings; export of a 30s 1080p fixture completes in Chrome; fallback path produces a playable file.

### Phase 7 — Backend, auth & home page

Hono API: email+password auth (argon2, cookie sessions), projects CRUD (aggregates+theme only, payload limit), share links (create/list/revoke, long slugs). Home page per Stitch design: grid, search, rename/duplicate/delete, thumbnails. SQLite dev / Turso prod wiring.
**Accept**: API integration tests; e2e — sign up, save project, see it on home, reload persists.

### Phase 8 — Sharing, public page & release polish

`/p/:slug` public player page (view-only, Download MP4, Duplicate to my projects, noindex), Share panel wired to API, empty states, error states, oversized-payload UX, cross-browser pass (Chrome/Firefox/Safari fallback notice), Lighthouse pass, README/user docs.
**Accept**: full e2e journey — import → customize → save → share link in incognito → download MP4 → duplicate; production deploy green.

## 4. Parallelization map

- Phase 1 and Phase 2 can run **in parallel** (separate packages) after Phase 0.
- Phase 7 (backend) can start in parallel with Phase 5/6 — it only depends on the shared types from Phase 1.
- UI phases 3 → 4 → 5 are sequential (same surfaces).
- Stitch design work runs ahead of the coding phases: screens for phase N must be approved before phase N is dispatched.

## 5. Standing prompt template for phase agents

Each cloud agent is dispatched with:

1. Role and phase number; link to `docs/PRD.md`, `docs/DEVELOPMENT_PLAN.md` (this file), AGENTS.md.
2. Phase goal, outputs, acceptance checklist verbatim.
3. Instruction to fetch relevant Stitch screens via MCP before writing UI code.
4. Definition of done: quality gate from section 1 passed, PR opened with checklist + screenshots, babysit until merge-ready.
