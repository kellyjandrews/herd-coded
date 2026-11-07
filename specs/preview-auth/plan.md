# Plan: Authenticate preview tests

Slug: `preview-auth` · Status: READY · Estimate: 45 minutes

## Goal
Ensure preview deployments and Playwright use the same configured Basic Auth credentials, and report configuration failures clearly.

## Source
Issue: None

## Acceptance criteria
- [x] **AC1** — A preview deploy uses the configured CI Basic Auth credentials; missing credentials fail before deployment.
- [x] **AC2** — Playwright can load the protected dashboard with matching credentials; unauthenticated access remains denied.
- [x] **AC3** — A non-successful home response reports its HTTP status rather than only a missing UI element.
- [x] **AC4** — Setup documentation explains the required preview secrets.

## Tasks
- [x] **T1** — Wire and validate preview credentials in the workflow.
- [x] **T2** — Improve smoke-test diagnostics and document preview configuration.
- [x] **T3** — Verify authentication and the preview-targeted tests against a local production server.

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Basic Auth | Real | Uses existing credentials and proxy |
| Providers | Mocked for local verification | Deployed previews retain their existing provider settings |

## New env vars, services, migrations, seed data
None; existing GitHub Actions secrets are required for previews.

## Follow-on features
None

## Open questions
None
