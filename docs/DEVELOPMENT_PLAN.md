# Telegraphic — Autonomous Development Plan

How the project is built end-to-end by **event-driven Cursor Automations** and GitHub quality gates, with minimal human intervention. Product spec: `docs/PRD.md`. Design source: Google Stitch via MCP (`docs/STITCH_DESIGN_GUIDE.md`). Fixed technical decisions: `.cursor/plans/telegram_bar_race_mvp_28875287.plan.md`.

**Setup playbook (labels, branch protection, automation prompts):** [`docs/AUTOMATIONS_SETUP.md`](./AUTOMATIONS_SETUP.md).

## 1. Development model (chosen approach)

**One phase = one cloud agent run = one PR.** Phases are **not** started by hand. A **dispatcher** automation watches `main` / phase issues and starts the next eligible **phase-builder** run. Each builder opens a PR, enables **GitHub auto-merge**, and stops when the PR is merge-ready. Separate automations **babysit CI** and **review / browser-smoke**. Humans do not create agents per phase and do not click Merge once auto-merge + required checks are configured.

### Progress

| Phase | Status |
| --- | --- |
| 0 — Scaffold | Merged |
| 1 — Parser & data model | Merged |
| 2 — Bar race engine | Merged |
| 3 — Editor shell | Next (ready to dispatch) |
| 4 — Total & Data panels | Blocked on 3 |
| 5 — Design panels | Blocked on 4 |
| 6 — Player & MP4 export | Blocked on 5 |
| 7 — Backend, auth & home | Ready in parallel with 5/6 |
| 8 — Sharing & polish | Blocked on 6 **and** 7 |

### Rejected alternatives

- *Single long-running agent for all remaining phases* — no parallelism, huge context, no review boundaries, weak GitHub/agent checks per phase.
- *Best-of-N parallel attempts per phase* — useful fallback for the riskiest phases (engine done; MP4 export later) if the first attempt fails review; not the default because of cost.
- *Agent merges its own PR by bypassing protection* — unsafe; use GitHub auto-merge after required checks (and optional bot approve).

### Quality gate (every PR)

1. **CI (GitHub Actions):** typecheck, ESLint + Prettier check, Vitest unit tests, build, Playwright e2e + visual snapshots. Branch protection on `main` requires all checks green.
2. **Vercel preview** on every PR; the phase-builder and/or **review & smoke** automation walk the phase acceptance checklist (browser-use / computer use).
3. **Merge:** GitHub **auto-merge** (squash) when checks are green and, if configured, the review automation has approved. No human Merge click in the steady state.

### Autonomy chain (roles)

| Role | How it runs | Responsibility |
| --- | --- | --- |
| **Dispatcher** | Automation on PR merged / push to `main` / `phase-ready` | Unblock issues by DAG; comment `/phase-build` or set labels; never writes app code |
| **Phase builder** | Automation on `/phase-build` or `phase-in-progress` | Implements one phase, opens PR, enables auto-merge |
| **CI babysit** | Automation on CI / workflow failure | Fixes red CI on phase PRs, restores auto-merge |
| **Review & smoke** | Automation on PR opened / pushed | AGENTS.md rules check, preview smoke, approve or request changes |
| **Nightly e2e** (optional) | Cron automation | Regression on `main`; file issue if red |

Standing repo mechanics (unchanged):

- **AGENTS.md** — stack, commands, hard rules, definition of done.
- **`.cursor/rules/`** — engine determinism, API privacy, UI tokens.
- **Stitch MCP** — UI phases fetch screens/tokens before coding; adapt layouts, do not pixel-copy.
- **Hooks** (when configured) — lint/typecheck on edit so builders self-correct before commit.

## 2. Repository & GitHub setup (best practices)

- **Monorepo (pnpm workspaces):**
  - `apps/web` — Vite + React + TS frontend
  - `apps/api` — Hono backend (SQLite dev / Turso prod)
  - `packages/shared` — Project/Theme types, parser, bar-race engine (framework-free, fully unit-tested)
- **Branching:** trunk-based; `cursor/phase-N-<slug>-…` (or `feat/phase-N-<slug>`) branches; **squash-merge** to `main`; linear history.
- **Conventional Commits** + PR title lint; CHANGELOG later via release-please if needed.
- **Branch protection on `main`:** required status checks (ci, e2e), no direct pushes; **auto-merge** allowed.
- **Phase state:** GitHub Issues + labels (`phase-N`, `phase-ready`, `phase-in-progress`, `phase-blocked`) — see Automations setup.
- **Templates:** `.github/PULL_REQUEST_TEMPLATE.md`, issue templates (bug/feature/**phase**).
- **CI** (`.github/workflows/ci.yml`): install → typecheck → lint → unit → build → Playwright; visual snapshots in-repo, updated only deliberately.
- **CD:** Vercel Git integration — preview per PR, production on `main`. Secrets in Vercel + GitHub environments, never in repo.
- **Security:** Dependabot, secret scanning; `SECURITY.md` optional later.

## 3. Phases

Each phase lists: goal, key outputs, and the acceptance checklist that the browser-test / smoke automation verifies. A phase agent must not start work outside its phase.

### Phase 0 — Scaffold & infrastructure — DONE

Monorepo skeleton, tooling (TS strict, ESLint, Prettier, Vitest, Playwright), CI workflow, Vercel project, AGENTS.md, `.cursor/rules/`, PR/issue templates, README.
**Accept:** CI green on a trivial PR; `pnpm dev` runs web+api; preview deploy works.

### Phase 1 — Parser & data model (`packages/shared`) — DONE

Telegram Desktop export parser (single-chat `result.json` / ZIP → record with daily cumulative series), Web Worker wrapper in `apps/web`, fixtures (small dummy exports committed to repo), edge cases (service messages, empty days, timezone). Project/Record/Settings/Theme types finalized per PRD.
**Accept:** unit tests cover fixtures incl. malformed input; parsing 50MB JSON stays off the main thread.

### Phase 2 — Bar race engine (`packages/shared`) — DONE

Deterministic `render(ctx, project, tSec)`: Top N, rank/width lerp, enter/exit animation, dynamic axis, timer label, all theme tokens applied. No DOM/React dependencies.
**Accept:** unit tests for layout math (ranking, interpolation, axis ceiling); Playwright visual snapshots of fixed frames (t=0, mid, end) on a fixture project; identical output across two runs (determinism test).

### Phase 3 — Editor shell (design from Stitch)

Fetch `editor-default` screen + DESIGN.md via Stitch MCP, map tokens to CSS variables/Tailwind. Infinite canvas (pan/zoom/fit), rating rectangle rendering live via engine, top toolbars with panel toggle buttons (panels empty for now), bottom player bar (play/pause/scrub wired to engine time).
**Accept:** browser test — pan/zoom works, playback runs at 30fps on fixture project, panel buttons toggle empty panels.
**Depends on:** Phase 2.

### Phase 4 — Total & Data panels

All Total controls live-bound via Zustand → engine (Top N, dates interval, scale, screen size, speed modes, delays, smoothing). Data panel: list, search, rename, delete, visibility, Add record → import modal → worker parsing → record appears. Avatar upload with client-side resize.
**Accept:** browser test — add fixture export, tweak every Total control, changes visible immediately; rename/hide/delete flows work.
**Depends on:** Phase 3.

### Phase 5 — Design panels

Design panel per Stitch screens: Background (frontiers, filling, full timer customization) and Card (global settings + per-card overrides) as specified in PRD 2.2. Every control maps to a Theme field consumed by the engine.
**Accept:** visual snapshot matrix — each theme control changes exactly its target; timer formats and animations verified frame-by-frame.
**Depends on:** Phase 4.

### Phase 6 — Player polish & MP4 export

Export pipeline: engine → WebCodecs frames → mp4-muxer → download, with progress UI; MediaRecorder/WebM fallback + browser notice. Start/finish delays honored.
**Accept:** exported MP4 duration/fps/size match settings; export of a 30s 1080p fixture completes in Chrome; fallback path produces a playable file.
**Depends on:** Phase 5.

### Phase 7 — Backend, auth & home page

Hono API: email+password auth (argon2, cookie sessions), projects CRUD (aggregates+theme only, payload limit), share links (create/list/revoke, long slugs). Home page per Stitch design: grid, search, rename/duplicate/delete, thumbnails. SQLite dev / Turso prod wiring.
**Accept:** API integration tests; e2e — sign up, save project, see it on home, reload persists.
**Depends on:** Phase 1 (types). May run **in parallel** with Phases 5–6.

### Phase 8 — Sharing, public page & release polish

`/p/:slug` public player page (view-only, Download MP4, Duplicate to my projects, noindex), Share panel wired to API, empty states, error states, oversized-payload UX, cross-browser pass (Chrome/Firefox/Safari fallback notice), Lighthouse pass, README/user docs.
**Accept:** full e2e journey — import → customize → save → share link in incognito → download MP4 → duplicate; production deploy green.
**Depends on:** Phase 6 **and** Phase 7.

## 4. Parallelization map (DAG)

```text
0 ──► 1 ──► 2 ──► 3 ──► 4 ──► 5 ──► 6 ──► 8
              │                      ▲      ▲
              └──────► 7 ────────────┴──────┘
```

- Phases **1** and **2** could run in parallel after 0 (both merged).
- Phase **7** starts when Phase **1** is on `main`; preferred parallel window is beside **5/6**.
- UI phases **3 → 4 → 5 → 6** are sequential (same surfaces).
- Phase **8** only after **6** and **7** are merged.
- Stitch: screens for phase N should exist before that phase is marked `phase-ready`. Optional human design approval is the only intentional non-automation gate.

Dispatchers must not start a phase until every listed dependency is merged to `main`. If two open PRs conflict, babysit rebases the newer branch after the older merges.

## 5. Standing prompts

### 5.1 Phase builder (used by Automations)

Each phase-builder run receives:

1. Role and phase number; links to `docs/PRD.md`, `docs/DEVELOPMENT_PLAN.md` (this file), `AGENTS.md`, `docs/AUTOMATIONS_SETUP.md`.
2. Phase goal, outputs, acceptance checklist, and **Depends on** verbatim from §3.
3. Instruction to fetch relevant Stitch screens via MCP before writing UI code.
4. Branch naming `cursor/phase-N-<slug>-…`; stay inside the phase.
5. Definition of done: quality gate from §1, PR opened with checklist + screenshots/recordings, **auto-merge enabled**, babysit may continue until merge.

### 5.2 Dispatcher / babysit / review

Canonical instruction blocks live in [`docs/AUTOMATIONS_SETUP.md`](./AUTOMATIONS_SETUP.md) (copy into each automation’s prompt field). Do not invent a second set of rules in chat.

## 6. Human residual duties

After Automations are enabled:

1. One-time setup from `docs/AUTOMATIONS_SETUP.md` (protection, labels, four automations).
2. Optional Stitch screen approval before marking a UI phase `phase-ready`.
3. Billing / quota and stopping runaway automation loops.
4. Incidents (secret leak, production outage) — not handled by phase builders.

Steady-state coding, CI repair, review smoke, and merge are automated.
