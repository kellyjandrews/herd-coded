# Plan: Provisioning hardening

Slug: `provisioning-hardening` · Status: READY · Estimate: 165 minutes

## Goal
Creating an app is safe to retry, ends fully configured including the queue token secret, and the project list shows accurate visibility and production URLs.

## Source
Issue: None (repository investigation, 2026-11-07). Uses `lib/server/vercel.ts` from `project-detail-page`.

## Acceptance criteria
- [ ] **AC1** — Given the Vercel step failed after the repository was created, when the user creates the same project name again, then provisioning reuses the repository and any existing Vercel project and completes.
- [ ] **AC2** — Given any step after repository creation fails, when the dashboard reloads, then the project appears with a "Needs repair" badge and a Repair button that reruns only the missing steps.
- [ ] **AC3** — Given `FACTORY_COPILOT_ASSIGN_TOKEN` is configured, when an app is provisioned or repaired, then the repository has a `COPILOT_ASSIGN_TOKEN` Actions secret; given it is not configured, then the project shows a warning that CSV batches need the secret.
- [ ] **AC4** — Given the token can see more than 100 repositories, when the dashboard loads, then every factory app is listed.
- [ ] **AC5** — Given the project list, when it renders, then each row shows Private or Public and the production URL from Vercel, falling back to `<name>.vercel.app` only when Vercel is unreachable.
- [ ] **AC6** — Given a label already exists in the repository, when provisioning creates labels, then it is not treated as an error.

## Tasks
- [ ] **T1** — Set the `factory-app` topic immediately after repository creation; tolerate 422 on labels; paginate the repository list; add `visibility` to `FactoryProject` and the row badge · files: `lib/server/provision-project.ts`, `app/factory-dashboard.tsx` · ~25 min
- [ ] **T2** — Make steps idempotent: reuse an owned factory repository, skip the template commit when template files already exist, reuse an existing Vercel project · files: `lib/server/provision-project.ts`, `lib/server/vercel.ts` · ~30 min
- [ ] **T3** — Health check plus repair: compute missing steps (topic, template, labels, Vercel project, secret); `POST /api/projects/[owner]/[repo]/repair`; badge and button · files: `lib/server/provision-project.ts`, `app/api/projects/[owner]/[repo]/repair/route.ts`, `app/factory-dashboard.tsx` · ~30 min
- [ ] **T4** — Set the repository secret by sealing the value with the repo public key (`libsodium-wrappers`) · files: `lib/server/repo-secrets.ts`, `lib/server/provision-project.ts`, `package.json` · ~30 min
- [ ] **T5** — Use the real Vercel production URL in the list and creation result · files: `lib/server/provision-project.ts`, `lib/server/vercel.ts` · ~20 min
- [ ] **T6** — Unit tests with mocked `fetch` for idempotent retry, repair detection, label 422, pagination, and secret sealing · files: `tests/unit/provision-project.test.ts`, `tests/unit/repo-secrets.test.ts` · ~30 min

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| GitHub and Vercel provisioning | Real | Mocked `fetch` in unit tests; `USE_MOCKS` returns a fake created project |
| Secret encryption | Real | libsodium sealed box, value never returned to the browser or logged |

## New env vars, services, migrations, seed data
- `FACTORY_COPILOT_ASSIGN_TOKEN` (optional): a fine-grained PAT with access to all repositories of the owner (new repositories are not covered by a "selected repositories" token), Issues, Pull requests, Contents, and Actions read/write. Add the name to `.env.example`.
- `FACTORY_GITHUB_TOKEN` additionally needs Secrets write.
- New dependency: `libsodium-wrappers` (and its types).

## Follow-on features
- Audit trail of who created or repaired each project (needs real user identity).

## Open questions
- Copying one PAT into every generated repository's secrets means a compromise of any app's workflows exposes it, and Copilot sessions bill to that token's owner. Default: proceed with an optional, separately scoped token; replace with a GitHub App once Copilot assignment supports app tokens. Not blocking.
