# Build log: template-tests-alignment

## T1–T3 — Template tests and health SHA
- Files: `lib/server/app-template.ts`
- Notes: Template adds `vitest.config.ts`, `tests/unit/health.test.ts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `test` / `test:e2e` scripts, and `verify` now runs Vitest. Pinned `vitest@3.2.7` and `@playwright/test@1.64.1` (the factory's installed versions). Health returns `status`, `env`, `sha`; `next.config.ts` exposes them. Proved by writing the template to a temp dir: `npm install`, `npm run verify` (1 test), and `npm run build` all pass.

## T4 — CLI uses the dashboard's provisioning
- Files: `scripts/factory/create-app.ts`
- Notes: Replaced the copy-the-factory flow with prompts → `provisionProject()` → `gh repo clone`. Loads `.env.local` via `@next/env`; falls back to `gh auth token` and prompts for the Vercel token. Not run end-to-end (it creates real repos).

## T5 — Template validation test
- Files: `tests/unit/app-template.test.ts`

## T6 — Docs
- Files: `lib/server/app-template.ts` (template README), `README.md`, `.env.example`
