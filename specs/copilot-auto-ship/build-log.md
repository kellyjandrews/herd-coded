# Build log: copilot-auto-ship

## T1 — Ship command and triggers
Files: `lib/server/app-template.ts`
Notes: `feature-queue.mjs ship` sweeps open Copilot PRs. It waits for `copilot_work_finished` (falls back to a non-`[WIP]` title), marks drafts ready over GraphQL, and ignores `action_required` CI runs. It dispatches CI on the branch, or updates the branch from base when its `ci.yml` predates `workflow_dispatch`. It squash-merges on green and deletes the branch. On a failure or conflict it posts one `@copilot` comment per commit, three per PR at most. Triggers: `pull_request_target` (review_requested, ready_for_review), Vercel bot PR comments, CI `workflow_run`, and dispatch, so the dashboard's Retry also ships. The job checks out the default branch only.

## T2 — CI dispatch and README
Files: `lib/server/app-template.ts`
Notes: `ci.yml` adds `workflow_dispatch`. The README describes the automatic flow and the `FEATURE_AUTO_MERGE=false` opt-out.

## T3 — Repair pushes CI
Files: `lib/server/provision-project.ts`
Notes: `ci.yml` is now a queue file, so existing apps show the "workflow" repair step until updated.

## T4 — Tests and decision
Files: `tests/unit/feature-queue-ship.test.ts`, `tests/unit/app-template.test.ts`, `docs/decisions.md`
Notes: The ship tests run the generated script under Node with `fetch` stubbed. `npm run verify` passes 65 tests. The generated script passes `node --check`, and both workflows parse as YAML.
