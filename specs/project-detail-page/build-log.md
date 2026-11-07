# Build log: project-detail-page

## T1 — Provider interface and mocks
- Files: `lib/server/types.ts`, `lib/server/github.ts`, `lib/server/vercel.ts`, `lib/server/mock-data.ts`, `lib/server/project-activity.ts`, `lib/server/provision-project.ts`, `app/api/projects/route.ts`, `lib/server/factory-auth.ts`
- Notes: Split GitHub and Vercel clients out of `provision-project.ts`. `USE_MOCKS=true` serves seeded projects (`demo-factory/recipe-box`, `trail-tracker`) from a process-wide in-memory store so pages and route handlers share state in dev. Added `factoryAuthResponse()` for route reuse.

## T2 — Detail route
- Files: `app/projects/[owner]/[repo]/page.tsx`, `not-found.tsx`, `app/factory-dashboard.tsx`
- Notes: Server component with awaited `params` (Next 16). Dashboard project names and "Open project →" link to it. Proxy Basic Auth covers `/projects/*`.

## T3 — GitHub activity
- Files: `lib/server/project-activity.ts`, `lib/server/feature-state.ts`
- Notes: One GraphQL query for issues labeled `feature` or `feature-queue`, assignees, `closedByPullRequestsReferences`, and the last commit's `statusCheckRollup`. Validated read-only against real factory repos; real issues used `feature-queue` without `feature`, so the label filter covers both. Copilot's finished PRs stay drafts, so only `[WIP]` drafts count as "Copilot working"; a closed unmerged PR shows the issue as Open.

## T4 — Vercel deployments
- Files: `lib/server/vercel.ts`
- Notes: Project lookup (`/v9/projects/{name}`), production URL from non-`-git-` aliases, latest production deployment and one preview per `meta.githubPrId` from `/v6/deployments`. Not exercised against the live Vercel API in this session.

## T5 — UI
- Files: `app/projects/[owner]/[repo]/feature-table.tsx`, `production-card.tsx`, `auto-refresh.tsx`, `app/globals.css`
- Notes: Each section renders its own error. Auto-refresh every 30s (toggleable) via `router.refresh()`.

## T6 — Tests
- Files: `tests/unit/factory-services.test.ts`, `tests/e2e/project-detail.spec.ts`, `playwright.config.ts`
- Notes: Local e2e now starts its own `next dev -p 3100` with `USE_MOCKS=true` (never reuses a real server). Mock-data specs run on desktop only because they mutate shared state.
