# Plan: Link to each app's real production URL

Slug: `real-production-urls` · Status: READY · Estimate: 90

## Goal
The dashboard's "Production" links open the app the factory actually deployed, not an unrelated site that already owns `<name>.vercel.app`.

## Source
Issue: None. Reported in chat: "It seems as though copilot is just grabbing existing websites."

### Root cause
The factory guesses `https://<repo-name>.vercel.app` in three places instead of reading the domain Vercel actually assigned:
- `ensureVercelProject()` in `lib/server/provision-project.ts` returns `https://${project.name}.vercel.app` right after creation.
- `productionUrlFor()` in `lib/server/vercel.ts` falls back to `${project.name}.vercel.app` when the project has no production alias yet.
- `toFactoryProject()` in `lib/server/github.ts` defaults `productionUrl` to `https://${repo.name}.vercel.app`.

`*.vercel.app` subdomains are global across all Vercel accounts. When a common name like `clinic-helper` or `recipe-box` is already taken, Vercel gives the new project a different alias, such as `clinic-helper-<team>.vercel.app` or one with a random suffix. The guessed URL then points at someone else's existing deployment. Copilot isn't copying anything: the generated repo still contains only the template plus the PR changes.

## Acceptance criteria
- [ ] **AC1**: Given a Vercel project whose production aliases are `["clinic-helper-herd-coded.vercel.app"]`, when the dashboard lists projects, then its Production link points to `https://clinic-helper-herd-coded.vercel.app` and never to `https://clinic-helper.vercel.app`.
- [ ] **AC2**: Given a project that has no production alias yet, when the dashboard or the project detail page renders, then no Production link appears and the text "Not deployed yet" shows in its place.
- [ ] **AC3**: Given a project was just created from the dashboard, when the creation response returns, then `productionUrl` is either a domain Vercel reported for that project or absent. It is never a guessed `<name>.vercel.app`.
- [ ] **AC4**: Given a production deployment exists, when the project detail page loads, then the Production card links to the project's real alias. If there is no alias, it links to the deployment's own URL as reported by Vercel.
- [ ] **AC5**: Given an existing factory app that was created with a wrong guessed URL, when the dashboard is refreshed, then it shows the correct URL with no repair step. The URL is resolved live from Vercel on every list.

## Tasks
- [ ] **T1**: Stop guessing in `productionUrlFor()`. Return the shortest non-`-git-` production alias. Otherwise return `targets.production.url` if Vercel provides it. Otherwise return `undefined`. Add `url?: string` to the `VercelProject.targets.production` type. · files: `lib/server/vercel.ts` · ~15
- [ ] **T2**: Make `FactoryProject.productionUrl` optional and remove the `<name>.vercel.app` default from `toFactoryProject()`. In `summarizeDeployments()`, fall back to `https://${deployment.url}` when `productionUrlFor()` returns `undefined`. · files: `lib/server/types.ts`, `lib/server/github.ts`, `lib/server/vercel.ts`, `lib/server/project-activity.ts` · ~20
- [ ] **T3**: Change `ensureVercelProject()` so it no longer returns a guessed URL. For an existing project, return `productionUrlFor(existing)`. For a new project, return `undefined`; the next dashboard refresh picks up the assigned alias. · files: `lib/server/provision-project.ts` · ~10
- [ ] **T4**: Render the Production link only when `productionUrl` is set. Otherwise show a muted "Not deployed yet" label. Update the mock data so one seeded project has no URL and one has a suffixed alias, so the demo shows both cases. · files: `app/factory-dashboard.tsx`, `app/projects/[owner]/[repo]/page.tsx`, `lib/server/mock-data.ts` · ~20
- [ ] **T5**: Add unit tests for `productionUrlFor()` covering a suffixed alias, `-git-` alias filtering, the deployment URL fallback, and `undefined` when nothing is assigned. Extend the e2e dashboard spec to assert the "Not deployed yet" state. · files: `tests/unit/vercel.test.ts`, `tests/e2e/dashboard.spec.ts` · ~25

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Vercel project aliases | Real | `GET /v9/projects/{name}` → `targets.production.alias` |
| Dashboard with `USE_MOCKS=true` | Mocked | Seed one suffixed alias and one undeployed project |

## New env vars, services, migrations, seed data
- Seed data: update `lib/server/mock-data.ts` as described in T4.
- No new env vars, services, or migrations.

## Follow-on features
- `scripts/factory/create-app.ts` and `scripts/bootstrap.sh` suggest `https://<name>.vercel.app` as the default production URL prompt. Change them to read the alias from Vercel, or drop the default.
- Optionally warn on the create form when the chosen project name's `.vercel.app` subdomain is already taken.

## Open questions
None. To confirm the cause for one app now: in Vercel, go to Project → Settings → Domains and compare the listed `.vercel.app` domain with the dashboard's link.
