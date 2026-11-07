# Test report: factory-housekeeping

Commands: `npm run verify` (Biome, tsc, Vitest — 34 passed), `npx playwright test` (desktop + mobile — 6 passed), `npm run build` (passed).

| AC | Test | Result |
|----|------|--------|
| AC1 | `git check-ignore .env.example` exits 1 (tracked); file lists all factory keys with blank values | Pass |
| AC2 | `tests/unit/request-guard.test.ts`, `projects-route.test.ts`, `features-route.test.ts` — missing / `null` / malformed / foreign origin → 403 | Pass |
| AC3 | Same files — `Sec-Fetch-Site: cross-site` → 403 on both routes | Pass |
| AC4 | `tests/unit/projects-route.test.ts` (owner in GET); `tests/e2e/dashboard.spec.ts` (connection status text, no hardcoded name) | Pass |
| AC5 | `tests/e2e/dashboard.spec.ts` — `#projects`, `#remote-builds`, `#settings` exist; Setup lists variable names | Pass |
| AC6 | 31 new unit tests in `npm run verify` | Pass |

Notes: Playwright Chromium was installed locally to run e2e. The local dev server had no Basic Auth configured, so the Basic Auth challenge is covered by unit tests only.
