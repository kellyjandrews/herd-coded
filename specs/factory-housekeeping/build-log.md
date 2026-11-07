# Build log: factory-housekeeping

## T1 — Track `.env.example`
- Files: `.gitignore`, `lib/server/provision-project.ts` (format only)
- Notes: `.env.example` already existed with every required key and blank placeholders but was ignored by `.env*`; added `!.env.example`. `.env.local` stays ignored. Baseline `npm run verify` failed on a pre-existing Biome format diff in `provision-project.ts`; applied `biome format --write` (whitespace only). Verify green.

## T2 — Shared same-origin guard
- Files: `lib/server/request-guard.ts` (new), `app/api/projects/route.ts`, `app/api/features/route.ts`
- Notes: `crossOriginResponse()` rejects `Sec-Fetch-Site: cross-site`, missing, `null`, malformed, and foreign origins with `403` JSON (`no-store`). URL parsing is inside `try`, so malformed origins no longer throw a 500. The projects route error text changed from "Cross-origin project creation is not allowed." to the shared "Cross-origin requests are not allowed."

## T3 — Deduplicate Basic Auth parsing
- Files: `lib/server/factory-auth.ts`, `proxy.ts`
- Notes: Added `basicAuthCredentialsMatch()`; `factoryRequestAuthorized()` and the proxy both use it, and the proxy reuses the shared 401/503 responses. Behavior unchanged; `npm run build` confirmed the proxy still compiles.

## T4 — Truthful dashboard chrome
- Files: `app/api/projects/route.ts`, `app/factory-dashboard.tsx`, `app/globals.css`
- Notes: `GET /api/projects` now returns `owner` (the configured `FACTORY_GITHUB_OWNER`). Sidebar and topbar show the owner instead of "Kelly"; connection status shows Checking / connected / not configured (`data-testid="connection-status"`). Removed the dead "Templates" link and the non-functional switcher caret; "Settings" became "Setup" and points to a new `#settings` section listing required variable names only. The avatar is now a non-interactive span. All sidebar/notice anchors (`#projects`, `#remote-builds`, `#settings`) resolve.
- Editor format-on-save rewrapped files at 80 columns; reran `biome format --write`. Consider setting Biome as the workspace formatter to avoid this.

## T5 — Route and guard tests
- Files: `tests/unit/request-guard.test.ts`, `tests/unit/projects-route.test.ts`, `tests/unit/features-route.test.ts`
- Notes: 31 new tests. Provider module is mocked; covers origin rejection (missing, null, malformed, foreign, cross-site), Basic Auth 401, input validation 400s, CSV header/fence checks, success paths, owner in GET, and 502 on provider failure.

## T6 — Close out stale plan
- Files: `specs/app-provisioner-cli/plan.md`
- Notes: Ticked met criteria and tasks, marked AC3/AC7/T5 as partial with reasons, corrected file references (`factory-auth.ts`, `request-guard.ts`, inlined `app-template.ts`), noted the slug/title mismatch.

## Follow-up — Formatter conflict
- Files: `.vscode/settings.json`, `.vscode/extensions.json` (new)
- Notes: The Prettier extension reformatted saved files at 80 columns, breaking `biome check` again. Disabled Prettier for this workspace and set Biome as the default formatter; recommended the `biomejs.biome` extension. Reformatted and verify is green (34 tests).
