# Telegraphic — Telegraphic

Standing instructions for every AI agent working in this repository.

## What this project is

Browser app that turns Telegram Desktop chat exports into customizable bar-chart-race videos (preview + MP4 in browser), with a Figma-like editor, Drive-like home page, and view-only share links.

Read before coding:

- `docs/PRD.md` — product spec (pages, panels, every customization option)
- `docs/DEVELOPMENT_PLAN.md` — phases, quality gate, your phase's acceptance checklist
- `docs/STITCH_DESIGN_GUIDE.md` — Stitch is the primary design authority (tokens, direction, IA); screen names listed there. Adapt layouts — do not pixel-copy individual Stitch screens

## Stack & layout

pnpm monorepo: `apps/web` (Vite + React + TS), `apps/api` (Hono + SQLite/Turso), `packages/shared` (types, Telegram export parser, canvas bar-race engine — framework-free).

State: Zustand. Tests: Vitest (unit), Playwright (e2e + visual snapshots). Deploy: Vercel.

## Commands

- `pnpm dev` — run web + api locally
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm e2e` — must all pass before opening a PR
- `pnpm build` — production build

## Hard rules

1. **Engine determinism**: everything in `packages/shared` engine is a pure function of `(project, tSec)`. No `Date.now()`, `Math.random()`, DOM access, or React imports in the render path. Preview, MP4 export, and visual tests all rely on this.
2. **Privacy**: raw Telegram messages never leave the browser. The API stores only daily aggregates + theme + metadata. Never log message content.
3. **Design from Stitch, don't clone screens**: UI colors/radii/fonts come from the DESIGN.md-derived tokens (CSS variables). No hard-coded hex values in components. Before building UI, fetch Stitch via MCP for tokens, visual direction, and information architecture — treat screens as the main design reference, then implement the product UI to match PRD behavior. Do not reproduce Stitch page layouts or generated code pixel-for-pixel.
4. **One canvas engine** for preview and export — never fork rendering logic.
5. UI copy in English. Validation at boundaries with zod (file imports, API bodies); trust internal code.
6. Conventional Commits; squash-merge PRs; keep `main` green.

## Definition of done for any PR

CI green (typecheck, lint, unit, build, e2e), Vercel preview smoke-tested against the phase acceptance checklist, PR description includes the checklist and screenshots.

## Cursor Cloud specific instructions

- Toolchain is preinstalled on the VM: Node.js v22.x and pnpm 10.x are on `PATH` (no need to install Node/pnpm or use `nvm`/`corepack`).
- After `pnpm install`, use the commands in the `## Commands` section (`pnpm dev` runs web + api together).
- Scoped agent rules live in `.cursor/rules/` (engine determinism, API privacy, UI tokens).
