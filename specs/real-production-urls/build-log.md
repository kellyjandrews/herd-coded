# Build log: real-production-urls

## T1 — Stop guessing in `productionUrlFor()`
- Files: `lib/server/vercel.ts`, `lib/server/provision-project.ts` (return type only)
- Notes: Uses the shortest non-`-git-` production alias, then `targets.production.url`, otherwise `undefined`. Added `url?: string` to `VercelProject.targets.production`.

## T2 — Optional `productionUrl`
- Files: `lib/server/types.ts`, `lib/server/github.ts`, `lib/server/vercel.ts`
- Notes: `toFactoryProject()` no longer defaults to `https://<repo>.vercel.app`. `summarizeDeployments()` falls back to the production deployment's own URL. `project-activity.ts` needed no change on the real path because it already passes the production URL through.

## T3 — No guessed URL at creation
- Files: `lib/server/provision-project.ts`
- Notes: `ensureVercelProject()` returns `productionUrlFor(existing)` for an existing project and `undefined` for a new one. The next dashboard load resolves the alias from Vercel, so existing apps with a wrong link fix themselves without a repair step (AC5).

## T4 — "Not deployed yet" UI and mock data
- Files: `app/factory-dashboard.tsx`, `app/projects/[owner]/[repo]/page.tsx`, `app/globals.css`, `lib/server/mock-data.ts`, `lib/server/project-activity.ts`
- Notes: The Production link renders only when a URL exists. Otherwise a muted `Not deployed yet` label (`data-testid="not-deployed"`) shows. Mock data changes: `recipe-box` now uses the suffixed alias `recipe-box-demo-factory.vercel.app`, and a new seeded `pet-sitter` project has no production deployment. Mock-created projects no longer get a fake URL or production record. When mock production is missing, the project detail page shows "No production deployment yet.", matching the real path.

## T5 — Tests
- Files: `tests/unit/factory-services.test.ts`, `tests/e2e/project-detail.spec.ts`
- Notes: Differs from the plan. Unit tests went into the existing `factory-services.test.ts`, which already covers `productionUrlFor()`, instead of a new `vercel.test.ts`. The e2e test went into `project-detail.spec.ts` instead of `dashboard.spec.ts`, because `dashboard.spec.ts` also runs against deployed previews without mocks. The new unit cases cover the confirmed `clinic-helper-one.vercel.app` alias, `-git-` filtering, the deployment URL fallback, and `undefined`. Results: verify green with 60 unit tests; desktop e2e 8/8 passed.
- Formatting: before this build, the working tree already had editor-applied 80-column reformatting in files outside this feature (`repo-secrets.ts`, `feature-queue.ts`, `queue/route.ts`, `playwright.config.ts`, `provision-project.test.ts`). I ran `biome format --write` over `lib/`, `app/`, and `tests/`, so review should confirm the diffs in those files are format-only.
