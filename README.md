# Telegraphic

Browser app that turns **Telegram Desktop** chat exports into customizable **bar-chart-race** videos (live preview + MP4 in the browser), with a Figma-like editor, Drive-like home page, and view-only share links.

> **Status:** Phases 0–8 on `main` when this release lands (parser, engine, editor, export, backend, sharing & polish). See [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## Quick start (users)

1. Sign up → **New rating**.
2. **Data → Add record** — drop a Telegram Desktop `result.json` / ZIP.
3. Tune **Total** / **Design**; preview with the bottom player.
4. **Share → Make a link** for a view-only `/p/:slug` page, or **Download a video**.

Full walkthrough: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md).

**Privacy:** raw chat messages never leave the browser. The API stores daily aggregates + theme + metadata only.

**Browsers:** Chrome/Edge preferred for MP4 (WebCodecs). Firefox/Safari may download WebM when MP4 isn’t available — the player shows a fallback notice.

## Stack

| Area     | Choice                                           |
| -------- | ------------------------------------------------ |
| Monorepo | pnpm workspaces                                  |
| Web      | Vite + React + TypeScript (`apps/web`)           |
| API      | Hono (`apps/api`) — SQLite local / Turso prod    |
| Shared   | Types, parser, canvas engine (`packages/shared`) |
| State    | Zustand                                          |
| Tests    | Vitest (unit), Playwright (e2e)                  |
| Deploy   | Vercel                                           |

## Prerequisites

- Node.js **≥ 22**
- [pnpm](https://pnpm.io) **10.x** (`corepack enable` or `npm i -g pnpm`)

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Runs:

- Web — http://localhost:5173 (proxies `/api` → API)
- API — http://localhost:8787 (`GET /api/health`)

## Scripts

| Command          | Description                           |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | Web + API locally                     |
| `pnpm typecheck` | TypeScript across workspaces          |
| `pnpm lint`      | ESLint + Prettier check               |
| `pnpm test`      | Vitest unit tests                     |
| `pnpm build`     | Production build                      |
| `pnpm e2e`       | Playwright e2e (builds/preview + API) |

## Layout

```
apps/web          Vite + React UI
apps/api          Hono API (local Node server)
packages/shared   Shared types / parser / bar-race engine
api/              Vercel catch-all serverless entry (generated at build)
docs/             PRD, development plan, user guide, Stitch guide
```

## Environment

Copy examples when wiring production backends:

- `apps/api/.env.example` — Turso / session secrets

Do not commit secrets. Configure production values in the Vercel project and GitHub Environments.

## Deploy (Vercel)

1. Import this GitHub repo in the [Vercel dashboard](https://vercel.com/new).
2. Framework preset: **Other** (root `vercel.json` sets install/build/output).
3. Root directory: repository root.
4. Set `DATABASE_URL` (Turso) and session secret for production.
5. Enable Git integration so every PR gets a preview deploy.

`vercel.json` builds the web app and serves `GET /api/*` via the Hono serverless entry in `api/`.

### Lighthouse / performance

Target a green Lighthouse pass on the public player and Home (performance / accessibility / best practices / SEO). Shared pages set `noindex`. Prefer light DOM chrome around the canvas player; keep assets token-driven (no heavy hero media on app surfaces).

## Docs for agents

- [`AGENTS.md`](AGENTS.md) — standing instructions
- [`docs/PRD.md`](docs/PRD.md) — product spec
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — phases, DAG, quality gate, automation roles
- [`docs/AUTOMATIONS_SETUP.md`](docs/AUTOMATIONS_SETUP.md) — configure dispatcher / builder / babysit / review + auto-merge
- [`docs/STITCH_DESIGN_GUIDE.md`](docs/STITCH_DESIGN_GUIDE.md) — design authority (Stitch)
- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — end-user guide
