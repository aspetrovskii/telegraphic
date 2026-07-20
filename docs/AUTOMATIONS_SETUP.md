# Automations setup — autonomous phase chain

One-time setup so remaining phases (3–8) run without manually creating agents or clicking Merge, while keeping **one phase = one PR**, GitHub CI, and parallel work where the DAG allows.

Product plan and phase specs: [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md).

## Goals

| Goal | Mechanism |
| --- | --- |
| No manual “New agent” per phase | Cursor Automations (event-triggered cloud agents) |
| No manual Merge click | GitHub **auto-merge** + branch protection (required checks) |
| Quality preserved | CI + Vercel preview + review/smoke automations |
| Parallelism | Dispatcher starts every phase whose dependencies are merged |
| Task split | Separate automations: dispatcher, phase-builder, babysit, review/smoke |

Do **not** put phases 3–8 into a single agent session.

---

## Prerequisites

1. Cursor account with Cloud Agents + Automations enabled.
2. GitHub App / Cursor GitHub integration connected to `aspetrovskii/telegraphic` (or your fork).
3. Repo Secrets / Vercel project already working for preview deploys (Phase 0).
4. Stitch MCP available to cloud agents for UI phases (3–5, 7–8 home/public).

---

## Step 1 — Branch protection and auto-merge

In GitHub → **Settings → Branches → Branch protection rule** for `main`:

1. Require a pull request before merging (squash merge preferred).
2. Require status checks to pass: whatever your CI workflow reports (e.g. the job names from `.github/workflows/ci.yml`).
3. Do **not** allow direct pushes to `main`.
4. Optionally require conversation resolution.

Then enable auto-merge for the repository:

1. **Settings → General → Pull Requests** → enable **Allow auto-merge**.
2. Prefer **Squash and merge** as the default merge method (matches Conventional Commits / linear history).

Phase-builder agents (and babysit) must call **Enable auto-merge** on their PR once it is opened and CI is expected to pass. Humans do not click Merge.

If you want an extra safety gate before trust is established, require one approving review from the `cursor` review automation (Step 5) instead of a human.

---

## Step 2 — Labels and phase issues (state machine)

### Labels to create

| Label | Purpose |
| --- | --- |
| `phase-3` … `phase-8` | Identifies which phase an issue/PR belongs to |
| `phase-ready` | Issue is eligible for a phase-builder run |
| `phase-in-progress` | A phase-builder agent has claimed the issue |
| `phase-blocked` | Waiting on dependency or design |
| `automation` | Opened/updated by Automations (filter noise) |

### Create tracking issues (once)

Open one GitHub Issue per remaining phase (titles like `Phase 3 — Editor shell`). Body must include:

- Link to the phase section in `docs/DEVELOPMENT_PLAN.md`
- Acceptance checklist (copy verbatim)
- Dependencies (e.g. Phase 4 depends on Phase 3)
- Labels: `phase-N`, and either `phase-ready` (if deps already on `main`) or `phase-blocked`

Suggested dependency edges for the dispatcher:

```
Phase 3 ← Phase 2 (done)
Phase 4 ← Phase 3
Phase 5 ← Phase 4
Phase 6 ← Phase 5   (export needs design/player shell; tighten if you split earlier)
Phase 7 ← Phase 1   (can run parallel with 5/6 once types exist — already true)
Phase 8 ← Phase 6 AND Phase 7
```

Mark Phase 3 and Phase 7 with `phase-ready` first (both unblocked after Phases 0–2).

Use issue template [`.github/ISSUE_TEMPLATE/phase.yml`](../.github/ISSUE_TEMPLATE/phase.yml) when available.

### One-shot script / workflow

If labels cannot be created from the cloud agent (Cursor GitHub App lacks label write), finish Step 2 with either:

```bash
# as a repo owner / triage+ identity
./scripts/setup-automations-step2.sh
```

or **Actions → Setup Automations Step 2 → Run workflow** (`.github/workflows/setup-automations-step2.yml`). The script is idempotent: creates missing labels, upserts phase issues 3–8, applies status labels, and closes permission-probe issues.

---

## Step 3 — Automation: Phase dispatcher

Create at [cursor.com/automations](https://cursor.com/automations) (or `/automate` in Cursor).

**Name:** `Telegraphic — phase dispatcher`

**Triggers (any of):**

- GitHub → **Pull request merged** (base `main`)
- GitHub → **Push to branch** (`main`) — backup if merge events are missed
- Optional: GitHub → **Issue label changed** when `phase-ready` is added (manual unblock / re-run)

**Repository:** this repo (required).

**Tools:** Pull request creation **off** (dispatcher should not code). Enable Comment on issue / MCP GitHub as needed. Memories **on** (track last dispatched phase).

**Instructions (paste and adapt):**

```text
You are the Telegraphic phase dispatcher. Do not write application code.

Read docs/DEVELOPMENT_PLAN.md § Parallelization map and docs/AUTOMATIONS_SETUP.md.

1. List open issues labeled phase-3 … phase-8.
2. For each issue, decide if dependencies are satisfied (those phase PRs are merged to main).
3. If deps are met and the issue has phase-blocked, remove phase-blocked and add phase-ready.
4. For each issue with phase-ready and NOT phase-in-progress:
   - Comment on the issue with: "Dispatching phase-builder" and the standing phase prompt from DEVELOPMENT_PLAN § Standing prompts (fill phase number, goal, acceptance checklist).
   - Add label phase-in-progress; keep phase-ready until the PR opens, then remove phase-ready.
   - Start work by opening a cloud-agent-style task ONLY via the configured follow-up mechanism:
     preferred: ensure a sibling automation "phase-builder" is triggered by Issue comment / label;
     if you can only comment, post a top-level issue comment that begins with:
     `/phase-build Phase N` plus the full standing prompt so the phase-builder automation matches it.
5. Never dispatch two builders for the same phase. Never start Phase 4 before Phase 3 is merged, etc., except Phase 7 which may run parallel with 5/6.
6. If nothing to do, exit without comments.
```

**Wire builder trigger:** either

- **A (recommended):** separate automation “phase-builder” on **Issue comment** matching `/phase-build`, or on **Issue label changed** → `phase-in-progress`, or  
- **B:** webhook from dispatcher (advanced).

Until Automations can nest launches cleanly, **label + issue-comment** is the reliable handoff.

---

## Step 4 — Automation: Phase builder

**Name:** `Telegraphic — phase builder`

**Triggers:**

- GitHub → **Issue comment** (filter: body starts with `/phase-build`), **or**
- GitHub → **Issue label changed** → label `phase-in-progress` added

**Repository:** this repo. Model: pick your strongest available coding model.

**Tools:** PR creation **on**, Computer use **on**, Memories optional.

**Instructions:**

```text
You implement exactly ONE Telegraphic phase.

1. Parse the phase number from the issue title/labels/comment.
2. Read AGENTS.md, docs/PRD.md, docs/DEVELOPMENT_PLAN.md (your phase only), docs/STITCH_DESIGN_GUIDE.md.
3. For UI phases: fetch Stitch via MCP before coding. Adapt layouts; do not pixel-copy.
4. Branch: cursor/phase-N-<slug>-…. Stay inside this phase — no out-of-phase features.
5. Implement until the phase acceptance checklist is met. Run pnpm typecheck, lint, test, build; for UI phases also e2e / browser smoke.
6. Open a draft PR using .github/PULL_REQUEST_TEMPLATE.md: check the phase box, paste acceptance checklist, attach screenshots/recordings.
7. Enable GitHub auto-merge (squash) on the PR.
8. Comment on the tracking issue with the PR URL; remove phase-ready if still present; keep phase-in-progress until merge (dispatcher/babysit clear it after merge).
9. Definition of done: PR open, CI running or green, auto-merge enabled, checklist + screenshots in the PR body.
```

---

## Step 5 — Automation: CI babysit

**Name:** `Telegraphic — CI babysit`

**Triggers:**

- GitHub → **CI completed** (failure on a PR), and/or
- GitHub → **Workflow run completed** (failure)

**Tools:** PR creation not needed (push to existing PR branch). Comment on PR **on**.

**Instructions:**

```text
You babysit Telegraphic phase PRs only (branches cursor/phase-* or titles containing "Phase N").

If CI failed on the PR:
1. Read failing logs; fix root cause on the PR branch; push.
2. Do not weaken tests to go green unless the test is clearly wrong for this phase — prefer fixing product code.
3. Re-enable auto-merge if it was cancelled.
4. Comment a short summary of the fix.

If the failure is flaky infra (transient Vercel/network), retry once; if still red, comment and stop.
Ignore non-phase PRs.
```

---

## Step 6 — Automation: PR review + browser smoke

**Name:** `Telegraphic — PR review & smoke`

**Triggers:**

- GitHub → **Pull request opened** (and optionally **Pull request pushed**)
- Optional: **Draft opened** — skip heavy smoke until ready-for-review if you prefer cost control

**Tools:** Comment on PR **on**, approvals **on** (approve when checklist satisfied), Computer use **on**.

**Instructions:**

```text
Review Telegraphic phase PRs.

1. Confirm the PR stays within its phase (DEVELOPMENT_PLAN).
2. Check hard rules in AGENTS.md (determinism, privacy, tokens, one engine).
3. For UI phases: open the Vercel preview (or local if preview missing), walk the acceptance checklist, attach screenshots/recording to a PR comment.
4. If blocking issues: request changes with concrete fix list.
5. If checklist met and no blockers: approve the PR (so auto-merge can proceed when required reviews are configured).
```

---

## Step 7 — Optional nightly regression

**Name:** `Telegraphic — nightly e2e`

**Trigger:** Scheduled (e.g. `0 6 * * *` UTC).

**Instructions:** On `main`, run `pnpm e2e` (and unit tests). If red, open a bug issue labeled `automation` with logs summary. Do not open drive-by fix PRs unless you also enable a separate fixer automation.

---

## Step 8 — Kick off remaining work

After Steps 1–6 are saved and **enabled**:

1. Confirm Phases 0–2 are on `main` (already done for this repo).
2. Ensure Issues for Phase 3 and Phase 7 exist with `phase-ready`.
3. Either:
   - Add a one-line comment `/phase-build Phase 3` on the Phase 3 issue (and same for 7), **or**
   - Push a no-op docs commit / re-run dispatcher by toggling `phase-ready`.
4. Watch: builder opens PR → babysit keeps CI green → review/smoke approves → **auto-merge** lands → dispatcher unblocks Phase 4 (and keeps 7 if still running).

Human involvement after setup: only design approval (if you require Stitch sign-off), billing/quota, and incident response when an automation loops or conflicts.

---

## Conflict and parallelism rules

- UI chain **3 → 4 → 5 → 6** is serial (same surfaces).
- **Phase 7** may run beside 5/6; if both touch `packages/shared` types, prefer 7 only after 1 (done) and avoid drive-by type renames.
- **Phase 8** waits for **6 and 7**.
- If two PRs conflict: babysit rebases the newer PR onto `main` after the other merges; dispatcher must not start the dependent phase until the dependency PR is merged.

---

## Verification checklist (setup done)

- [ ] Branch protection requires CI on `main`
- [ ] Repository auto-merge enabled; squash default
- [ ] Labels created; phase issues 3–8 exist
- [ ] Four automations enabled: dispatcher, builder, babysit, review/smoke
- [ ] Test: label or `/phase-build` on Phase 3 creates a PR without a manual agent
- [ ] Test: failing CI on that PR gets a fix push from babysit
- [ ] Test: green + approve → PR merges without a human Merge click

---

## Cost and safety notes

- Automations bill as cloud agents; start with comment-only review, then enable approve.
- Prefer draft PRs until the builder finishes the checklist, then mark ready-for-review so smoke/approve run once.
- Never give automations permission to bypass branch protection.
- Rotate webhook API keys if you promote an automation to Team Owned.
