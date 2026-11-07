# Build log: hands-free-ship

## T1: Ship polls instead of waiting for events
Files: `lib/server/app-template.ts`
Notes: `ship` loops every 30s until each Copilot PR is merged or needs a person, or until `SHIP_WAIT_MINUTES` (default 25) runs out. `shipPull` returns working, waiting, or done. Unfinished CI runs whose actor is Copilot are ignored. Even after someone approves one, the `workflow_run` it triggers is gated again, so ship dispatches its own CI with the PAT. A pending fix request counts as waiting so the loop keeps watching for Copilot's push.

## T2: Triggers
Files: `lib/server/app-template.ts`
Notes: Removed `pull_request_target` and `workflow_run`, both held for approval on calculator #2. Ship now starts on `issues: assigned` to Copilot (done by the PAT, so not gated), Vercel bot PR comments, and dispatch. Added `timeout-minutes: 30`.

## T3: Dashboard merge on the server
Files: `lib/server/feature-queue.ts`, `lib/server/mock-data.ts`, `app/api/projects/[owner]/[repo]/queue/route.ts`
Notes: The queue route's `merge` action (`pullRequest`) marks the PR ready. If CI passed on the head commit it squash-merges with the factory token and deletes the branch. Otherwise it dispatches the app's queue workflow so ship runs CI and merges. A closed PR returns 409.

## T4: Merge button
Files: `app/projects/[owner]/[repo]/merge-button.tsx`, `feature-table.tsx`, `page.tsx`, `app/globals.css`
Notes: Shown on features in the "PR open" state.

## T5: Tests
Files: `tests/unit/feature-queue-ship.test.ts`, `tests/unit/app-template.test.ts`, `tests/unit/queue-route.test.ts`, `tests/e2e/project-detail.spec.ts`
Notes: `npm run verify` (71 tests), Playwright (12, mock server), and `npm run build` pass. The generated script passes `node --check`, and the workflow parses as YAML.
