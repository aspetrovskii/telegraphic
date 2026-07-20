#!/usr/bin/env bash
# Step 2 from docs/AUTOMATIONS_SETUP.md — labels + phase tracking issues.
# Run with a GitHub identity that can manage labels/issues (repo owner PAT or
# `gh auth login` as a user with triage+). The Cursor GitHub App cannot create
# or apply labels.
#
# Usage:
#   ./scripts/setup-automations-step2.sh
#   REPO=owner/name ./scripts/setup-automations-step2.sh

set -euo pipefail

REPO="${REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
DOC_BASE="https://github.com/${REPO}/blob/main/docs/DEVELOPMENT_PLAN.md"

echo "==> Repo: ${REPO}"

ensure_label() {
  local name="$1" color="$2" description="$3"
  if gh label list --repo "$REPO" --limit 200 --json name -q '.[].name' | grep -qx "$name"; then
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$description" >/dev/null
    echo "  updated label: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$description"
    echo "  created label: $name"
  fi
}

echo "==> Labels"
ensure_label "phase-3" "98bf8a" "Identifies phase 3 work"
ensure_label "phase-4" "98bf8a" "Identifies phase 4 work"
ensure_label "phase-5" "98bf8a" "Identifies phase 5 work"
ensure_label "phase-6" "98bf8a" "Identifies phase 6 work"
ensure_label "phase-7" "98bf8a" "Identifies phase 7 work"
ensure_label "phase-8" "98bf8a" "Identifies phase 8 work"
ensure_label "phase-ready" "0E8A16" "Issue is eligible for a phase-builder run"
ensure_label "phase-in-progress" "FBCA04" "A phase-builder agent has claimed the issue"
ensure_label "phase-blocked" "D93F0B" "Waiting on dependency or design"
ensure_label "automation" "5319E7" "Opened/updated by Automations"

find_issue_by_title() {
  local title="$1"
  gh issue list --repo "$REPO" --state open --limit 100 --json number,title \
    -q ".[] | select(.title == \"$title\") | .number" | head -n1
}

create_or_update_phase_issue() {
  local title="$1"
  local phase_label="$2"
  local status_label="$3"
  local depends="$4"
  local body="$5"

  local number
  number="$(find_issue_by_title "$title" || true)"

  if [[ -n "${number}" ]]; then
    gh issue edit "$number" --repo "$REPO" --body "$body" \
      --add-label "automation,${phase_label},${status_label}" >/dev/null
    echo "  updated issue #${number}: ${title} [${phase_label}, ${status_label}]"
  else
    local url
    url="$(gh issue create --repo "$REPO" --title "$title" --body "$body" \
      --label "automation" --label "$phase_label" --label "$status_label")"
    echo "  created: ${url} [${phase_label}, ${status_label}] (depends: ${depends})"
  fi
}

echo "==> Phase tracking issues"

create_or_update_phase_issue \
  "Phase 3 — Editor shell" \
  "phase-3" \
  "phase-ready" \
  "Phase 2 (done)" \
  "$(cat <<EOF
## Phase

Phase 3 — Editor shell

## Spec

- Plan: [\`docs/DEVELOPMENT_PLAN.md\` § Phase 3](${DOC_BASE}#phase-3--editor-shell-design-from-stitch)
- Automations: [\`docs/AUTOMATIONS_SETUP.md\`](https://github.com/${REPO}/blob/main/docs/AUTOMATIONS_SETUP.md)

## Depends on (must be merged to main)

Phase 2 (done — Phases 0–2 on main)

## Acceptance checklist

- [ ] Browser test — pan/zoom works
- [ ] Playback runs at 30fps on fixture project
- [ ] Panel buttons toggle empty panels

## Goal (from DEVELOPMENT_PLAN)

Fetch \`editor-default\` screen + DESIGN.md via Stitch MCP, map tokens to CSS variables/Tailwind. Infinite canvas (pan/zoom/fit), rating rectangle rendering live via engine, top toolbars with panel toggle buttons (panels empty for now), bottom player bar (play/pause/scrub wired to engine time).

## Initial automation status

\`phase-ready\` — dependencies already on main.
EOF
)"

create_or_update_phase_issue \
  "Phase 4 — Total & Data panels" \
  "phase-4" \
  "phase-blocked" \
  "Phase 3" \
  "$(cat <<EOF
## Phase

Phase 4 — Total & Data panels

## Spec

- Plan: [\`docs/DEVELOPMENT_PLAN.md\` § Phase 4](${DOC_BASE}#phase-4--total--data-panels)
- Automations: [\`docs/AUTOMATIONS_SETUP.md\`](https://github.com/${REPO}/blob/main/docs/AUTOMATIONS_SETUP.md)

## Depends on (must be merged to main)

Phase 3

## Acceptance checklist

- [ ] Browser test — add fixture export
- [ ] Tweak every Total control; changes visible immediately
- [ ] Rename/hide/delete flows work

## Goal (from DEVELOPMENT_PLAN)

All Total controls live-bound via Zustand → engine (Top N, dates interval, scale, screen size, speed modes, delays, smoothing). Data panel: list, search, rename, delete, visibility, Add record → import modal → worker parsing → record appears. Avatar upload with client-side resize.

## Initial automation status

\`phase-blocked\` until Phase 3 is merged.
EOF
)"

create_or_update_phase_issue \
  "Phase 5 — Design panels" \
  "phase-5" \
  "phase-blocked" \
  "Phase 4" \
  "$(cat <<EOF
## Phase

Phase 5 — Design panels

## Spec

- Plan: [\`docs/DEVELOPMENT_PLAN.md\` § Phase 5](${DOC_BASE}#phase-5--design-panels)
- Automations: [\`docs/AUTOMATIONS_SETUP.md\`](https://github.com/${REPO}/blob/main/docs/AUTOMATIONS_SETUP.md)

## Depends on (must be merged to main)

Phase 4

## Acceptance checklist

- [ ] Visual snapshot matrix — each theme control changes exactly its target
- [ ] Timer formats and animations verified frame-by-frame

## Goal (from DEVELOPMENT_PLAN)

Design panel per Stitch screens: Background (frontiers, filling, full timer customization) and Card (global settings + per-card overrides) as specified in PRD 2.2. Every control maps to a Theme field consumed by the engine.

## Initial automation status

\`phase-blocked\` until Phase 4 is merged.
EOF
)"

create_or_update_phase_issue \
  "Phase 6 — Player polish & MP4 export" \
  "phase-6" \
  "phase-blocked" \
  "Phase 5" \
  "$(cat <<EOF
## Phase

Phase 6 — Player polish & MP4 export

## Spec

- Plan: [\`docs/DEVELOPMENT_PLAN.md\` § Phase 6](${DOC_BASE}#phase-6--player-polish--mp4-export)
- Automations: [\`docs/AUTOMATIONS_SETUP.md\`](https://github.com/${REPO}/blob/main/docs/AUTOMATIONS_SETUP.md)

## Depends on (must be merged to main)

Phase 5

## Acceptance checklist

- [ ] Exported MP4 duration/fps/size match settings
- [ ] Export of a 30s 1080p fixture completes in Chrome
- [ ] Fallback path produces a playable file

## Goal (from DEVELOPMENT_PLAN)

Export pipeline: engine → WebCodecs frames → mp4-muxer → download, with progress UI; MediaRecorder/WebM fallback + browser notice. Start/finish delays honored.

## Initial automation status

\`phase-blocked\` until Phase 5 is merged.
EOF
)"

create_or_update_phase_issue \
  "Phase 7 — Backend, auth & home page" \
  "phase-7" \
  "phase-ready" \
  "Phase 1 (done)" \
  "$(cat <<EOF
## Phase

Phase 7 — Backend, auth & home page

## Spec

- Plan: [\`docs/DEVELOPMENT_PLAN.md\` § Phase 7](${DOC_BASE}#phase-7--backend-auth--home-page)
- Automations: [\`docs/AUTOMATIONS_SETUP.md\`](https://github.com/${REPO}/blob/main/docs/AUTOMATIONS_SETUP.md)

## Depends on (must be merged to main)

Phase 1 (types) — done. May run **in parallel** with Phases 5–6.

## Acceptance checklist

- [ ] API integration tests
- [ ] e2e — sign up, save project, see it on home, reload persists

## Goal (from DEVELOPMENT_PLAN)

Hono API: email+password auth (argon2, cookie sessions), projects CRUD (aggregates+theme only, payload limit), share links (create/list/revoke, long slugs). Home page per Stitch design: grid, search, rename/duplicate/delete, thumbnails. SQLite dev / Turso prod wiring.

## Initial automation status

\`phase-ready\` — Phase 1 already on main; can run parallel with 5/6.
EOF
)"

create_or_update_phase_issue \
  "Phase 8 — Sharing, public page & release polish" \
  "phase-8" \
  "phase-blocked" \
  "Phase 6 AND Phase 7" \
  "$(cat <<EOF
## Phase

Phase 8 — Sharing, public page & release polish

## Spec

- Plan: [\`docs/DEVELOPMENT_PLAN.md\` § Phase 8](${DOC_BASE}#phase-8--sharing-public-page--release-polish)
- Automations: [\`docs/AUTOMATIONS_SETUP.md\`](https://github.com/${REPO}/blob/main/docs/AUTOMATIONS_SETUP.md)

## Depends on (must be merged to main)

Phase 6 **and** Phase 7

## Acceptance checklist

- [ ] Full e2e journey — import → customize → save → share link in incognito → download MP4 → duplicate
- [ ] Production deploy green

## Goal (from DEVELOPMENT_PLAN)

\`/p/:slug\` public player page (view-only, Download MP4, Duplicate to my projects, noindex), Share panel wired to API, empty states, error states, oversized-payload UX, cross-browser pass (Chrome/Firefox/Safari fallback notice), Lighthouse pass, README/user docs.

## Initial automation status

\`phase-blocked\` until Phase 6 and Phase 7 are merged.
EOF
)"

echo "==> Close permission-probe issues (if present)"
for n in 7 8 9; do
  title="$(gh issue view "$n" --repo "$REPO" --json title -q .title 2>/dev/null || true)"
  case "$title" in
    test-permission-probe|Phase\ 3\ —\ Editor\ shell\ \(probe\ labels\)|probe-with-labels-json)
      gh issue close "$n" --repo "$REPO" --comment "Closing permission probe from Automations Step 2 setup." || true
      echo "  closed #$n ($title)"
      ;;
    *)
      echo "  skip #$n (${title:-missing})"
      ;;
  esac
done

echo "==> Done"
echo "Verify: gh label list --repo $REPO | grep -E 'phase-|automation'"
echo "Verify: gh issue list --repo $REPO --label automation"
