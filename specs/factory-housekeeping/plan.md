# Plan: Factory housekeeping and API hardening

Slug: `factory-housekeeping` · Status: READY · Estimate: 120 minutes

## Goal
Fix the factory's known defects so the dashboard reports its real state, the API rejects bad origins cleanly, and environment setup is documented in a committed `.env.example`.

## Source
Issue: None (repository investigation, 2026-11-07).

## Acceptance criteria
- [x] **AC1** — Given a fresh checkout, when a developer opens `.env.example`, then it exists in git and lists `FACTORY_BASIC_AUTH_USERNAME`, `FACTORY_BASIC_AUTH_PASSWORD`, `FACTORY_GITHUB_OWNER`, `FACTORY_GITHUB_TOKEN`, `VERCEL_ACCESS_TOKEN`, `VERCEL_TEAM_ID`, and `USE_MOCKS` with placeholder values only.
- [x] **AC2** — Given a POST to `/api/projects` or `/api/features` with a missing, `null`, or malformed `Origin` header, when the request is handled, then the API returns `403` JSON and never `500`.
- [x] **AC3** — Given a POST to `/api/features` with `Sec-Fetch-Site: cross-site`, when the request is handled, then the API returns `403` JSON, matching `/api/projects`.
- [x] **AC4** — Given provider credentials are missing, when the dashboard loads, then the sidebar shows "GitHub not configured" instead of a connected check; given they are configured, then it shows "GitHub connected" and the workspace name is the configured `FACTORY_GITHUB_OWNER`, not a hardcoded name.
- [x] **AC5** — Given the dashboard, when the user clicks any sidebar or notice link, then it scrolls to a section that exists on the page; the setup section lists required environment variable names (never values).
- [x] **AC6** — Given `npm run verify`, when it runs, then unit tests cover the origin guard and the input validation of both POST routes.

## Tasks
- [x] **T1** — Replace the blanket `.env*` ignore with rules that keep `.env.example` tracked; add `.env.example` with placeholders · files: `.gitignore`, `.env.example` · ~10 min
- [x] **T2** — Add a shared same-origin guard that safely parses `Origin` and checks `Sec-Fetch-Site`; use it in both POST routes · files: `lib/server/request-guard.ts`, `app/api/projects/route.ts`, `app/api/features/route.ts` · ~25 min
- [x] **T3** — Remove duplicated Basic Auth credential parsing by exporting the comparison from `factory-auth.ts` and using it in the proxy · files: `lib/server/factory-auth.ts`, `proxy.ts` · ~15 min
- [x] **T4** — Return `owner` from `GET /api/projects`; render the real owner, a truthful connection badge, and replace dead `#settings`/`#how-it-works` anchors with an existing "Setup" section or remove them · files: `app/api/projects/route.ts`, `app/factory-dashboard.tsx`, `app/globals.css` · ~30 min
- [x] **T5** — Unit tests for the request guard and both POST routes' validation (mock `@/lib/server/provision-project`) · files: `tests/unit/request-guard.test.ts`, `tests/unit/projects-route.test.ts`, `tests/unit/features-route.test.ts` · ~30 min
- [x] **T6** — Close out the stale plan: tick acceptance criteria that are met, correct file references (`lib/server/factory-auth.ts`, `lib/server/app-template.ts`) · files: `specs/app-provisioner-cli/plan.md` · ~10 min

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Origin and auth checks | Real | Pure functions, unit tested |
| Provider calls in route tests | Mocked | `vi.mock` of the provisioning module |

## New env vars, services, migrations, seed data
`USE_MOCKS` is documented in `.env.example` here and implemented in `project-detail-page`. No services, migrations, or seed data.

## Follow-on features
- `project-detail-page`

## Open questions
None.
