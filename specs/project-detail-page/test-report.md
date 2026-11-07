# Test and review: dashboard-iteration features

Covers `project-detail-page`, `unified-feature-queue`, `provisioning-hardening`, `template-tests-alignment`.

Commands: `npm run verify` (58 unit tests), `npx playwright test` (10 e2e, mock server), `npm run build`, template materialized to a temp dir with `npm install && npm run verify && npm run build`, detail-page GraphQL query run read-only against real factory repos.

| Plan | AC coverage | Gaps |
|------|-------------|------|
| project-detail-page | e2e: navigation, feature states, PR checks, preview link, production, 404; unit: state derivation, deployment summary | Live Vercel API not exercised; per-section error rendering not tested |
| unified-feature-queue | unit: route queued/position, queue route pause/resume/400/403/404, template pause; e2e: add, pause, resume | Real workflow dispatch and variable API not exercised; legacy direct-assign path untested |
| provisioning-hardening | unit: resume/reuse, foreign repo refusal, label 422, sealed secret round-trip, no plaintext token; e2e: repair | Pagination and live repair untested against GitHub |
| template-tests-alignment | unit: template structure/scripts; temp-dir verify + build pass | CLI not run end-to-end; template Playwright smoke not run |

## Review

Verdict: **SHIP** (hackathon scope; auth/token hardening deferred per user).

- No secrets in the diff. The copied token is sealed client-side and never logged or returned.
- `COPILOT_ASSIGN_TOKEN` defaults to `FACTORY_GITHUB_TOKEN`, a broad PAT, as the user requested; each generated repo's workflows can read it. Set `FACTORY_COPILOT_ASSIGN_TOKEN` to a narrower token later.
- `FACTORY_GITHUB_TOKEN` now needs Variables and Secrets write; without them, pause/resume and secret copy fail with a visible error.
- Dashboard listing makes ~6 API calls per project; fine for tens of projects.

Nits: dashboard is still one large client component; consider moving the list to a server component.
