# Plan: Generated app template with tests, aligned CLI

Slug: `template-tests-alignment` · Status: DONE · Estimate: 125 minutes

## Goal
Generated apps ship with a working test setup and a SHA-reporting health check, and the dashboard and `npm run create-app` produce the same app.

## Source
Issue: None (repository investigation, 2026-11-07).

## Acceptance criteria
- [x] **AC1** — Given a new app created from the dashboard, when CI runs, then `npm run verify` runs Biome, TypeScript, and Vitest, and the included sample test passes.
- [x] **AC2** — Given a deployed generated app, when `GET /api/health` is called, then it returns `status`, `env`, and `sha`.
- [x] **AC3** — Given `npm run create-app` completes, when the new local directory is inspected, then it contains the template files only (no factory dashboard, `proxy.ts`, or `lib/server/`), and its production deployment loads without Basic Auth.
- [x] **AC4** — Given the factory's `npm run verify`, when it runs, then a test asserts every template JSON file parses, required files exist, and `package.json` has `test`, `test:e2e`, and `verify` scripts.
- [x] **AC5** — Given a generated app, when `npm run test:e2e` runs locally, then a Playwright smoke test loads the home page and health endpoint.

## Tasks
- [x] **T1** — Add Vitest config, `tests/unit/health.test.ts`, and `test` in `verify` to the template · files: `lib/server/app-template.ts` · ~25 min
- [x] **T2** — Health route returns `env` and `sha`; template `next.config.ts` exposes them like the factory's · files: `lib/server/app-template.ts` · ~15 min
- [x] **T3** — Add Playwright config and smoke test to the template (local only; not wired into the template CI) · files: `lib/server/app-template.ts` · ~20 min
- [x] **T4** — Rewrite `create-app` to write `appTemplateFiles` instead of copying the factory tree; keep the existing GitHub/Vercel CLI steps · files: `scripts/factory/create-app.ts` · ~30 min
- [x] **T5** — Template validation unit test · files: `tests/unit/app-template.test.ts` · ~20 min
- [x] **T6** — Update the template README and the factory README to describe the generated app and CLI accurately · files: `lib/server/app-template.ts`, `README.md` · ~15 min

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Template files | Real | Validated statically by unit test |
| CLI provisioning | Real | Not exercised in CI; uses `gh` and the Vercel CLI |

## New env vars, services, migrations, seed data
None. New template devDependencies: `vitest`, `@playwright/test` (Builder: pin versions that exist on npm and are compatible with the template's Next and React versions).

## Follow-on features
- Upgrade existing apps to the latest template from the dashboard.

## Open questions
None.
