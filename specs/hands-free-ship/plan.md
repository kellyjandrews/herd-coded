# Plan: Ship approved features without GitHub approvals

Slug: `hands-free-ship` · Status: READY · Estimate: 60

## Goal
After a feature is approved on the dashboard, its Copilot PR is marked ready, tested, merged, and deployed without anyone opening GitHub. The project page also gets a Merge button for PRs.

## Source
Issue: None. Reported in chat: calculator PR #2 needed manual "Approve workflows" clicks and a manual merge.
Evidence: every run whose actor is Copilot is held for approval. That covers `pull_request` CI, the `pull_request_target` ship trigger, and the `workflow_run` that follows a Copilot CI run. Runs started by the PAT (`issues` assigned, `workflow_dispatch`) and by vercel[bot] comments ran without approval.

## Acceptance criteria
- [x] **AC1**: Given an approved feature, when the queue assigns Copilot, then a ship run starts (not gated). It waits for Copilot to finish, marks the PR ready, dispatches CI, waits for it, and merges.
- [x] **AC2**: Given a CI run started by Copilot is still pending or running, when ship evaluates the PR, then it ignores that run and dispatches its own CI.
- [x] **AC3**: The app workflow no longer uses `pull_request_target` or `workflow_run` triggers, so they create no approval prompts.
- [x] **AC4**: Given an open PR on the project page, when I click Merge, then the factory marks it ready and merges it if CI passed. Otherwise it starts the ship run and says it merges when CI passes.

## Tasks
- [x] **T1**: Ship script: loop until each PR is merged or needs a person (`SHIP_WAIT_MINUTES`, default 25, polling every 30s). Ignore Copilot-started CI runs that haven't finished. Treat fix requests as waiting. · files: `lib/server/app-template.ts` · ~20
- [x] **T2**: Workflow triggers: drop `pull_request_target` and `workflow_run`, add `issues: assigned` (Copilot) for ship, and set `timeout-minutes`. · files: `lib/server/app-template.ts` · ~5
- [x] **T3**: `mergeFeaturePullRequest` (real and mock) and a `merge` queue-route action. · files: `lib/server/feature-queue.ts`, `lib/server/mock-data.ts`, `app/api/projects/[owner]/[repo]/queue/route.ts` · ~20
- [x] **T4**: Merge button on open PRs in the feature list. · files: `app/projects/[owner]/[repo]/merge-button.tsx`, `feature-table.tsx`, `page.tsx` · ~10
- [x] **T5**: Tests. · files: `tests/unit/feature-queue-ship.test.ts`, `tests/unit/app-template.test.ts`, `tests/unit/queue-route.test.ts`, `tests/e2e/project-detail.spec.ts` · ~15

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Merge from dashboard | Real | `FACTORY_GITHUB_TOKEN` needs Pull requests and Contents write |
| Demo | Mocked | The Merge button merges the mock PR |

## New env vars, services, migrations, seed data
Optional app variable `SHIP_WAIT_MINUTES`.

## Follow-on features
None

## Open questions
None
