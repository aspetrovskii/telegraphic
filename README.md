# Telegraphic

Browser app that turns **Telegram Desktop** chat exports into customizable **bar-chart-race** videos (live preview + MP4 in the browser), with a Figma-like editor, Drive-like home page, and view-only share links.

> **Status:** Phase 0 scaffold. Product features (parser, engine, editor, auth) land in later phases — see [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## Stack

| Area     | Choice                                              |
| -------- | --------------------------------------------------- |
| Monorepo | pnpm workspaces                                     |
| Web      | Vite + React + TypeScript (`apps/web`)              |
| API      | Hono (`apps/api`) — SQLite local / Turso prod later |
| Shared   | Types, parser, canvas engine (`packages/shared`)    |
| State    | Zustand (Phase 3+)                                  |
| Tests    | Vitest (unit), Playwright (e2e)                     |
| Deploy   | Vercel                                              |

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
packages/shared   Shared types / parser / engine (placeholder in Phase 0)
api/              Vercel catch-all serverless entry (generated at build)
docs/             PRD, development plan, Stitch guide
```

## Environment

Copy examples when wiring real backends (Phase 7+):

- `apps/api/.env.example` — Turso / session secrets (placeholders only in Phase 0)

Do not commit secrets. Configure production values in the Vercel project and GitHub Environments.

## Deploy (Vercel)

1. Import this GitHub repo in the [Vercel dashboard](https://vercel.com/new).
2. Framework preset: **Other** (root `vercel.json` sets install/build/output).
3. Root directory: repository root.
4. Add secrets later (Turso URL/token, session secret) when Phase 7 lands — none required for Phase 0 health stubs.
5. Enable Git integration so every PR gets a preview deploy.

`vercel.json` builds the web app and serves `GET /api/*` via the Hono serverless entry in `api/`.

## Docs for agents

- [`AGENTS.md`](AGENTS.md) — standing instructions
- [`docs/PRD.md`](docs/PRD.md) — product spec
- [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — phases & quality gate
- [`docs/STITCH_DESIGN_GUIDE.md`](docs/STITCH_DESIGN_GUIDE.md) — design authority (Stitch)
