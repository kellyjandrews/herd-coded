# Build log: provisioning-hardening

## T1 — Topic first, labels, pagination, visibility
- Files: `lib/server/provision-project.ts`, `lib/server/github.ts`, `app/factory-dashboard.tsx`
- Notes: Topics are set right after repo creation so failed runs still list. Label 422s are ignored. Repo listing pages up to 1,000 repos. Rows show Private/Public.

## T2 — Idempotent steps
- Files: `lib/server/provision-project.ts`, `lib/server/vercel.ts`
- Notes: A 422 on create reuses the repo only if it has the `factory-app` topic. Template commit is skipped when `package.json` exists. Existing Vercel projects are reused (no duplicate deploy).

## T3 — Repair
- Files: `lib/server/provision-project.ts`, `app/api/projects/[owner]/[repo]/repair/route.ts`, `app/factory-dashboard.tsx`, `lib/server/types.ts`
- Notes: `inspectProject()` reports missing `template`, `workflow` (queue files differ from the template), `labels`, `vercel`, `secret`. The dashboard shows "Needs repair" + Repair; repair runs only missing steps. Listing now inspects each project in parallel (~6 API calls per project).

## T4 — Repository secret
- Files: `lib/server/repo-secrets.ts`, `package.json`
- Notes: `libsodium-wrappers` 0.7.x ships a broken ESM build, so sealing uses `tweetnacl` + `blakejs` (same `crypto_box_seal` format; round-trip unit test). Per user direction, `COPILOT_ASSIGN_TOKEN` is copied from `FACTORY_COPILOT_ASSIGN_TOKEN`, falling back to `FACTORY_GITHUB_TOKEN`. A secret failure during creation doesn't fail provisioning; it marks the project for repair.

## T5 — Real production URL
- Files: `lib/server/provision-project.ts`, `lib/server/vercel.ts`

## T6 — Tests
- Files: `tests/unit/provision-project.test.ts`, `tests/unit/factory-services.test.ts`, `tests/e2e/project-detail.spec.ts`
- Notes: Mocked `fetch` covers resume, foreign-repo refusal, label 422, and that the plaintext token never appears in the secret request.
