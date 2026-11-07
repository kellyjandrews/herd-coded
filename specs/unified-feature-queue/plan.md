# Plan: Unified feature queue

Slug: `unified-feature-queue` · Status: DONE · Estimate: 160 minutes

## Goal
Every feature, single or CSV, goes through one ordered queue per app so Copilot works one issue at a time, and the dashboard shows and controls that queue.

## Source
Issue: None (repository investigation, 2026-11-07). Depends on `project-detail-page`.

## Acceptance criteria
- [x] **AC1** — Given an app with the Feature queue workflow, when the user submits a single feature, then an issue is created with `feature` and `feature-queue` labels, it is not assigned directly, the queue workflow is dispatched, and the dashboard shows "Queued, position N".
- [x] **AC2** — Given an app without the Feature queue workflow, when the user submits a single feature, then it is assigned to Copilot directly as today and the dashboard says "Assigned directly".
- [x] **AC3** — Given queued features, when the project detail page loads, then a queue panel lists them in order with position, which one Copilot is working on, and whether the queue is paused.
- [x] **AC4** — Given the user clicks Pause, when the next queue run happens, then no new issue is assigned; given the user clicks Resume, then the queue is unpaused and the workflow is dispatched.
- [x] **AC5** — Given a stalled queue, when the user clicks Retry, then the Feature queue workflow is dispatched and the panel confirms it.
- [x] **AC6** — Given the factory repository, when the template's queue script changes, then there is only one source of truth for it (the template).

## Tasks
- [x] **T1** — Template queue: honor a `FEATURE_QUEUE_PAUSED` repository variable passed by the workflow; remove the factory's duplicate queue workflow and script (Builder: confirm with the user before deleting files) · files: `lib/server/app-template.ts`, `.github/workflows/feature-queue.yml`, `.github/scripts/feature-queue.mjs` · ~30 min
- [x] **T2** — Single-feature submission: queue when the workflow exists and dispatch it; otherwise keep direct assignment; return queue position · files: `lib/server/provision-project.ts`, `app/api/features/route.ts` · ~25 min
- [x] **T3** — Queue service and API: GET queue; POST `pause`, `resume`, `retry` via the Actions variables and workflow dispatch endpoints; mock implementation · files: `lib/server/feature-queue.ts`, `app/api/projects/[owner]/[repo]/queue/route.ts`, `lib/server/mock-data.ts` · ~30 min
- [x] **T4** — Queue panel client component on the detail page with Pause/Resume/Retry · files: `app/projects/[owner]/[repo]/queue-panel.tsx`, `app/projects/[owner]/[repo]/page.tsx`, `app/globals.css` · ~30 min
- [x] **T5** — Dashboard feature result text for queued vs direct assignment · files: `app/factory-dashboard.tsx` · ~15 min
- [x] **T6** — Tests: queue ordering and pause logic, queue route validation and origin guard, e2e queue panel with mocks · files: `tests/unit/feature-queue.test.ts`, `tests/unit/queue-route.test.ts`, `tests/e2e/project-detail.spec.ts` · ~30 min

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Queue execution | Real | Runs in each app's GitHub Actions with `COPILOT_ASSIGN_TOKEN` |
| Queue control | Real (mock with `USE_MOCKS`) | Repo variables and workflow dispatch via `FACTORY_GITHUB_TOKEN` |

## New env vars, services, migrations, seed data
- Generated apps: repository variable `FEATURE_QUEUE_PAUSED` (`true`/`false`), read in `feature-queue.yml` via `vars`.
- `FACTORY_GITHUB_TOKEN` additionally needs Actions read/write and Variables read/write on factory repos.
- Seed queue data in `lib/server/mock-data.ts`.

## Follow-on features
- Reorder queued features (needs a priority label or field).
- Upgrade existing apps to the latest template workflow from the dashboard.

## Open questions
None.
