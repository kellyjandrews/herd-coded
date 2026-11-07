# Plan: Project detail page

Slug: `project-detail-page` · Status: DONE · Estimate: 180 minutes

## Goal
From the dashboard, open any app and see what Copilot is doing: feature issues, linked pull requests, CI check status, preview URLs, and the current production deployment.

## Source
Issue: None (repository investigation, 2026-11-07). Depends on `factory-housekeeping`.

## Acceptance criteria
- [x] **AC1** — Given a factory project, when the user clicks its name on the dashboard, then `/projects/<owner>/<repo>` shows the project name, repository link, production URL, and a list of feature issues each with a state of Queued, Copilot working, PR open, or Done.
- [x] **AC2** — Given a feature issue with a linked pull request, when the page loads, then the row shows the PR number and title, an aggregate check status (passing, failing, pending), and the preview URL when one exists.
- [x] **AC3** — Given the Vercel project exists, when the page loads, then a production card shows deployment state (Ready, Building, Error), short commit SHA, time created, and the real production URL from Vercel.
- [x] **AC4** — Given a repository outside `FACTORY_GITHUB_OWNER`, without the `factory-app` topic, or with an invalid name, when the URL is visited, then a 404 page is shown.
- [x] **AC5** — Given `USE_MOCKS=true` and no provider credentials, when the dashboard and a detail page load, then seeded demo projects, issues, PRs, and deployments appear.
- [x] **AC6** — Given the GitHub or Vercel API fails, when the page loads, then that section shows an inline error and the other section still renders.

## Tasks
- [x] **T1** — Define a `ProjectActivityProvider` interface with a mock implementation and seed data; switch `listFactoryProjects` and the new provider on `USE_MOCKS=true` · files: `lib/server/project-activity.ts`, `lib/server/mock-data.ts`, `app/api/projects/route.ts` · ~30 min
- [x] **T2** — Detail route as a server component with header, `notFound()` handling, and project-name links from the dashboard rows (check `node_modules/next/dist/docs/` for Next 16 dynamic `params`) · files: `app/projects/[owner]/[repo]/page.tsx`, `app/projects/[owner]/[repo]/not-found.tsx`, `app/factory-dashboard.tsx`, `app/globals.css` · ~30 min
- [x] **T3** — GitHub implementation: one GraphQL query for issues labeled `feature` with `closedByPullRequestsReferences` and each PR's `statusCheckRollup`, `assignees`; derive row state · files: `lib/server/project-activity.ts` · ~30 min
- [x] **T4** — Extract Vercel calls to a module supporting GET; look up the project, its latest production deployment, and preview deployments keyed by `meta.githubPrId` · files: `lib/server/vercel.ts`, `lib/server/provision-project.ts` · ~30 min
- [x] **T5** — Render the feature table and production card, each with its own error boundary or inline error · files: `app/projects/[owner]/[repo]/page.tsx`, `app/projects/[owner]/[repo]/feature-table.tsx`, `app/projects/[owner]/[repo]/production-card.tsx`, `app/globals.css` · ~30 min
- [x] **T6** — Tests: unit for state derivation and mock provider; Playwright navigation from dashboard to a detail page with `USE_MOCKS=true` in the dev server env · files: `tests/unit/project-activity.test.ts`, `tests/e2e/project-detail.spec.ts`, `playwright.config.ts` · ~30 min

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Issues, PRs, checks | Real (mock with `USE_MOCKS`) | GitHub GraphQL using `FACTORY_GITHUB_TOKEN` |
| Preview and production deployments | Real (mock with `USE_MOCKS`) | Vercel REST using `VERCEL_ACCESS_TOKEN`; generated apps deploy via Vercel Git integration |
| Live updates | Not included | Page is rendered per request; refresh to update |

## New env vars, services, migrations, seed data
- `USE_MOCKS` (optional, `true` enables mock providers).
- Seed data in `lib/server/mock-data.ts`: two or three projects with issues in every state.
- No migrations or new services. Pages remain behind the Basic Auth proxy.

## Follow-on features
- `unified-feature-queue` (queue panel on this page)
- PR actions from the dashboard (merge, comment `@copilot` for changes, roll back)
- Auto-refresh or polling of activity

## Open questions
None.
