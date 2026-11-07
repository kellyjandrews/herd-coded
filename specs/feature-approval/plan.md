# Plan: Approve features before Copilot starts

Slug: `feature-approval` · Status: READY · Estimate: 75

## Goal
New features (from the dashboard, the project page, a CSV batch, or the GitHub issue form) wait in an "Awaiting approval" list on the project page. Copilot starts only after someone approves them. Rejected features close as not planned.

## Source
Issue: None. Requested in chat: "add an approval to the dashboard … before work starts".

## Acceptance criteria
- [x] **AC1**: Given I add a feature from the dashboard or project page, when it's created, then the issue has only the `feature` label and the project page lists it under "Awaiting approval". Copilot isn't assigned.
- [x] **AC2**: Given a pending feature, when I click Approve, then it gets `feature-queue` (or, in an app with no queue workflow, is assigned to Copilot directly), leaves the approval list, and appears in the queue.
- [x] **AC3**: Given several pending features, when I click Approve all, then all of them are queued in creation order.
- [x] **AC4**: Given a pending feature, when I click Reject, then the issue closes as not planned and leaves the list.
- [x] **AC5**: Given a CSV batch, when the app's queue imports it, then the row issues are created without `feature-queue` and await approval.
- [x] **AC6**: Given an issue that isn't awaiting approval (queued, assigned to Copilot, closed, or a PR), when approve or reject targets it, then the API returns an error and changes nothing.

## Tasks
- [x] **T1**: Server: `submitFeature` creates unqueued issues. Add `pending` to `QueueStatus` plus `approveFeatures` and `rejectFeature` with eligibility checks. Mock-store equivalents and a seeded pending feature. · files: `lib/server/feature-queue.ts`, `lib/server/types.ts`, `lib/server/mock-data.ts` · ~25
- [x] **T2**: Queue route accepts `approve` (`issues: number[]`) and `reject` (`issue: number`). The features route reports `awaitingApproval`. · files: `app/api/projects/[owner]/[repo]/queue/route.ts`, `app/api/features/route.ts` · ~10
- [x] **T3**: The project page's queue panel shows "Awaiting approval" with Approve, Reject, and Approve all. Submit buttons and messages on both pages say features await approval. · files: `app/projects/[owner]/[repo]/queue-panel.tsx`, `app/factory-dashboard.tsx`, `app/globals.css` · ~20
- [x] **T4**: The app template's batch import no longer adds `feature-queue`; README updated. · files: `lib/server/app-template.ts` · ~5
- [x] **T5**: Tests and decision record. · files: `tests/unit/queue-route.test.ts`, `tests/unit/features-route.test.ts`, `tests/e2e/project-detail.spec.ts`, `docs/decisions.md` · ~15

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Approve and reject | Real | GitHub issue labels, assignees, and state via `FACTORY_GITHUB_TOKEN` |
| Demo | Mocked under `USE_MOCKS` | recipe-box seeds one pending feature |

## New env vars, services, migrations, seed data
Seed: recipe-box #6 "Recipe ratings" awaiting approval.

## Follow-on features
- Approve or reject from the main dashboard card.

## Open questions
None
