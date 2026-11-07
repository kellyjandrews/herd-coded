# Plan: Auto-ship Copilot pull requests

Slug: `copilot-auto-ship` · Status: READY · Estimate: 60

## Goal
When Copilot finishes a feature PR in a factory app, the app's Feature queue marks it ready, runs CI without manual approval, squash-merges it on green (Vercel deploys production), and the queue starts the next feature. CI failures are sent back to Copilot.

## Source
Issue: None. Copilot PRs sat as drafts with `action_required` CI, so nothing merged or deployed.

## Acceptance criteria
- [x] **AC1** — Given Copilot has finished a PR (`copilot_work_finished` is its latest session event), when the ship job runs, then a draft PR is marked ready for review.
- [x] **AC2** — Given the head commit has no CI run except approval-gated ones, when ship runs, then CI is dispatched on the PR branch with the PAT (no approval needed), falling back to updating the branch from base when the branch's CI lacks `workflow_dispatch`.
- [x] **AC3** — Given CI succeeded on the head commit, when ship runs, then the PR is squash-merged with the PAT and its branch deleted, so the linked issue closes, Vercel deploys, and the queue assigns the next issue.
- [x] **AC4** — Given CI failed on the head commit, when ship runs, then it asks `@copilot` to fix it once per commit, at most 3 times per PR.
- [x] **AC5** — Given `FEATURE_AUTO_MERGE=false`, when ship runs, then it does nothing.
- [x] **AC6** — Given an existing app, when Repair runs, then the updated queue workflow, script, and CI workflow are pushed.

## Tasks
- [x] **T1** — Add `ship` command and triggers (`pull_request_target` review_requested/ready_for_review, Vercel PR comments, CI `workflow_run`, dispatch) · files: `lib/server/app-template.ts` · ~30
- [x] **T2** — CI accepts `workflow_dispatch`; README describes the automatic flow · files: `lib/server/app-template.ts` · ~5
- [x] **T3** — Repair treats `ci.yml` as a queue file · files: `lib/server/provision-project.ts` · ~5
- [x] **T4** — Unit tests and decision record · files: `tests/unit/app-template.test.ts`, `docs/decisions.md` · ~10

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Ship job | Real | Runs in each app repo with `COPILOT_ASSIGN_TOKEN` |
| Dashboard | Mocked under `USE_MOCKS` | No dashboard change |

## New env vars, services, migrations, seed data
Optional repo variable `FEATURE_AUTO_MERGE` (`false` disables auto-merge).

## Follow-on features
- Surface ship status (waiting on CI, fix requested, merged) on the project page.

## Open questions
- Whether `pull_request_target` runs triggered by Copilot need approval; Vercel comment and CI `workflow_run` triggers cover it if so.
