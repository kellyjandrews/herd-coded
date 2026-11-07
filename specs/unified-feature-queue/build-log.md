# Build log: unified-feature-queue

## T1 — Template pause support; single source
- Files: `lib/server/app-template.ts`; deleted `.github/workflows/feature-queue.yml`, `.github/scripts/feature-queue.mjs` (user approved)
- Notes: Template workflow passes `vars.FEATURE_QUEUE_PAUSED` as `PAUSED`; script `next` exits early when `"true"`. Existing apps get the new workflow via Repair (`workflow` step).

## T2 — Single features use the queue
- Files: `lib/server/feature-queue.ts`, `app/api/features/route.ts`, `tests/unit/features-route.test.ts`
- Notes: When the app has `feature-queue.yml`, the issue gets `feature` + `feature-queue` labels and the workflow is dispatched; response includes `queued` and `position`. Older apps fall back to direct assignment. Feature issue functions moved out of `provision-project.ts`.

## T3 — Queue API
- Files: `app/api/projects/[owner]/[repo]/queue/route.ts`, `lib/server/feature-queue.ts`, `lib/server/mock-data.ts`
- Notes: GET status; POST `pause` / `resume` / `retry` (repo variable PATCH-or-create, workflow dispatch). Same auth and origin guard as other routes.

## T4 — Queue panel
- Files: `app/projects/[owner]/[repo]/queue-panel.tsx`, `page.tsx`, `app/globals.css`
- Notes: Ordered list with Copilot marker, Paused badge, Pause/Resume/Retry, and an inline "Add to queue" form.

## T5 — Dashboard messages
- Files: `app/factory-dashboard.tsx`
- Notes: "Queued issue #N at position P", "Assigned directly…" for legacy apps, and a "Track progress →" link. Buttons renamed to "Add to Copilot queue" / "Queue batch for Copilot".

## T6 — Tests
- Files: `tests/unit/queue-route.test.ts`, `tests/e2e/project-detail.spec.ts`, `tests/unit/app-template.test.ts`
