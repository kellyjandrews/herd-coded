# Build log: feature-approval

## T1: Server and mock store
Files: `lib/server/feature-queue.ts`, `lib/server/types.ts`, `lib/server/mock-data.ts`
Notes: `submitFeature` creates the issue with only `feature` and no longer dispatches the queue or assigns Copilot. `QueueStatus.pending` lists open `feature` issues that have no `feature-queue` label, no Copilot assignee, and aren't PRs. `approveFeatures` checks every issue first, then adds `feature-queue` in issue order. That label fires the app's queue workflow because the factory uses a PAT. Apps without a queue workflow get Copilot assigned directly. `rejectFeature` closes the issue as `not_planned`. The mock store seeds recipe-box #6 "Recipe ratings" as pending.

## T2: Routes
Files: `app/api/projects/[owner]/[repo]/queue/route.ts`, `app/api/features/route.ts`
Notes: The queue route accepts `approve` (`issues`: 1–100 positive integers) and `reject` (`issue`). An ineligible issue returns 409. The features route returns `{ issue, awaitingApproval: true }`.

## T3: UI
Files: `app/projects/[owner]/[repo]/queue-panel.tsx`, `app/factory-dashboard.tsx`, `app/globals.css`
Notes: The queue panel shows "Awaiting approval" with per-item Approve and Reject buttons, plus Approve all when more than one item is waiting. Both forms now say "Submit for approval". The dashboard result links to "Review and approve". The remote-builds copy describes approval and auto-merge.

## T4: App template
Files: `lib/server/app-template.ts`
Notes: Batch import creates row issues without `feature-queue` and says they await approval. The README and the batch issue form describe the approval step. Existing apps need Repair to get the new import behavior; until then their CSV batches still queue immediately.

## T5: Tests and decision
Files: `tests/unit/queue-route.test.ts`, `tests/unit/features-route.test.ts`, `tests/e2e/project-detail.spec.ts`, `docs/decisions.md`
Notes: `npm run verify` (69 tests), `npm run build`, and Playwright (11, mock server) all pass. Not run against real GitHub.
