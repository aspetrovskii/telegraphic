---
name: Telegram Bar Race
overview: "Браузерное приложение для создания видео-рейтингов (bar chart race) чатов Telegram по количеству сообщений: Figma-подобный редактор с live-кастомизацией, превью и MP4 в браузере, главная страница проектов как Google Drive, шаринг по ссылкам (view-only)."
todos:
  - id: phase-0-setup
    content: "Phase 0: репозиторий, monorepo-скелет, tooling, CI, AGENTS.md, rules, Vercel"
    status: pending
  - id: phase-1-parser
    content: "Phase 1: парсер Telegram export (1 экспорт = 1 Record) + Web Worker + fixtures + unit-тесты"
    status: pending
  - id: phase-2-engine
    content: "Phase 2: детерминированный Canvas bar-race движок render(ctx, project, tSec) + визуальные тесты"
    status: pending
  - id: phase-3-editor-shell
    content: "Phase 3: оболочка редактора — бесконечная плоскость, панели, топ-бар (дизайн из Stitch)"
    status: pending
  - id: phase-4-total-data
    content: "Phase 4: панели Total (Settings) и Data (Record[]), live-связка с движком через Zustand"
    status: pending
  - id: phase-5-design-panels
    content: "Phase 5: панель Design — Theme.background / Theme.card / Theme.timer"
    status: pending
  - id: phase-6-player-export
    content: "Phase 6: плеер предпросмотра + Download a video (WebCodecs, fallback MediaRecorder)"
    status: pending
  - id: phase-7-backend
    content: "Phase 7: Hono API — auth (email+password), CRUD Project, ShareLink; главная страница"
    status: pending
  - id: phase-8-public-polish
    content: "Phase 8: публичная страница /p/:slug, e2e-полировка, деплой на Vercel"
    status: pending
isProject: true
---

# Telegram Chat Bar Race

Корень проекта: `C:\Projects\telegraphic`

Документы-источники истины:

- `docs/PRD.md` — полная продуктовая спецификация + **канонические имена полей** (`Project`, `Record`, `Settings`, `Theme`, `ShareLink`)
- `docs/STITCH_DESIGN_GUIDE.md` — задание для дизайн-агента в Google Stitch
- `docs/DEVELOPMENT_PLAN.md` — пошаговый план автономной разработки и тестирования

## Решения (зафиксировано, обновлено 17.07.2026)

- Данные: экспорт Telegram Desktop (`result.json` / ZIP); **один экспорт = один `Record`**, записи добавляются по одной через Data → Add record
- `settings.topN` настраиваемый (дефолт 15), `settings.smoothingDays` настраиваемое
- Аватары: ручная загрузка → `Record.avatarDataUrl` (ресайз до ~128px на клиенте)
- Превью + MP4 в браузере (WebCodecs, fallback MediaRecorder), один canvas: `render(ctx, project, tSec)`
- Auth: email + password, cookie sessions; без OAuth в MVP
- Шаринг: view-only `ShareLink` с длинным `slug`, URL `/p/:slug` (не project `id`); create / list / revoke
- Главная страница: проекты пользователя в стиле Google Drive
- Редактор: Figma-подобная бесконечная плоскость (pan/zoom); панели Total / Data / Share слева, Design справа; плеер снизу
- Backend: Hono + SQLite локально / Turso (libSQL) в проде
- Деплой: Vercel (фронт — static, API — functions), preview-деплои на PR
- Язык интерфейса: английский; UI-лейблы экспорта: **Download a video**
- Дизайн: Google Stitch через Stitch MCP; UI-токены из DESIGN.md; рейтинг потребляет `project.theme`

## Архитектура

```mermaid
flowchart TB
  subgraph client [Browser]
    upload[Add_record_upload_export]
    parse[Parse_worker]
    agg[Aggregate_by_day]
    theme[Design_panels_live]
    engine[Canvas_bar_race_engine]
    player[Preview_player]
    encode[WebCodecs_MP4]
    upload --> parse --> agg --> engine
    theme --> engine
    engine --> player
    engine --> encode
  end
  subgraph server [Hono_API]
    auth[Auth_email_password]
    api[Projects_CRUD]
    links[Share_links]
    db[(SQLite_Turso)]
    auth --> db
    api --> db
    links --> db
  end
  engine -->|save_aggregates_settings_theme| api
  api -->|GET_p_slug| engine
```

**Клиент** — единственный источник правды для анимации и экспорта (один canvas-движок).
**Сервер** — auth, CRUD `Project` (агрегаты + `settings` + `theme` + метаданные, без сырых сообщений), `ShareLink`.

## Стек

| Часть | Выбор |
|-------|--------|
| Repo | pnpm monorepo: `apps/web`, `apps/api`, `packages/shared` (типы, парсер, движок) |
| Frontend | Vite + React + TypeScript |
| State | Zustand (`project` incl. `settings`/`theme`/`records`, `playback`, `editorCanvas`) |
| Анимация | Canvas 2D bar-race, `render(ctx, project, tSec)` |
| Парсинг | Web Worker (ZIP/JSON → дневные cumulative серии) |
| MP4 | WebCodecs + `mp4-muxer`; fallback `canvas.captureStream` + MediaRecorder |
| Backend | Hono; SQLite (dev) / Turso libSQL (prod); сессии в cookie |
| Тесты | Vitest (unit), Playwright (e2e + visual snapshots канваса) |
| Деплой | Vercel: static frontend + serverless API; preview на PR |

## Модель данных проекта

Канон — в `docs/PRD.md` §2. Кратко:

```ts
type Project = {
  id: string
  ownerId: string
  title: string
  createdAt: string
  updatedAt: string
  ticks: string[] // ISO dates
  records: Record[] // title, sourceChatTitle, color?, nameColor?, avatarDataUrl?, visible, counts[]
  settings: Settings // topN, dateStart, dateEnd, scalePercent, screenWidth/Height,
                     // speedMode: "totalLength"|"daysPerSecond", speedValue,
                     // startDelaySec, finishDelaySec, smoothingDays
  theme: Theme // background, timer, card — см. PRD
}

type ShareLink = {
  id: string
  projectId: string
  slug: string // публичный URL: /p/:slug
  createdAt: string
  revokedAt?: string
}
```

Сырые сообщения на сервер **не** уходят — только агрегаты.

## Главные риски

| Риск | Решение |
|------|----------|
| Огромный export | Worker, только агрегаты, предупреждение о больших ZIP |
| Safari без WebCodecs | MediaRecorder fallback, честный UI-нотис |
| Расхождение preview/export | Один canvas-движок для обоих |
| Тяжёлые аватары | Ресайз до ~128px WebP/JPEG на клиенте |
| Privacy | Только агрегаты, секретные длинные `slug`, noindex |
| Figma-подобный canvas UX сложен | Ограничить: один объект на плоскости, только pan/zoom/select |

## Вне MVP

- MTProto / логин в Telegram, автоподтягивание аватаров из экспорта
- Совместное редактирование, ссылки с правом записи
- Серверный рендеринг видео (Remotion/FFmpeg)
- Биллинг, публичная галерея
