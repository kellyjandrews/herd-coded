# Plan: Outcome-first issue flow

Slug: `outcome-first-issue-flow` · Status: READY · Estimate: 180 minutes

## Goal
Let a user describe a business outcome, have Copilot draft feature proposals, and keep suggested work separate from approved delivery. Add a safe incident-triage intake path and make application secrets manageable in Vercel without requiring Terraform for bootstrap.

## Outcome and approved source
Outcome: Establish an outcome-first Copilot workflow before bootstrapping a new project.
Approved proposal: User request in this session.

## Acceptance criteria
- [x] **AC1** — Given a business goal, when the user runs `/outcome`, then Copilot captures the target user, current problem, measurable success, constraints, and drafts ranked feature proposals without implementing them.
- [x] **AC2** — Given a proposal, when it is submitted through the proposal issue form, then it is labeled `proposal` and linked to its parent outcome; it does not enter the build workflow until explicitly approved.
- [x] **AC3** — Given an approved proposal or feature issue, when `/feature` is run with its issue reference, then the feature flow checks the `approved` label and creates a delivery plan tied back to the outcome.
- [x] **AC4** — Given an error report, when the user runs `/triage-error`, then Copilot produces a sanitized, deduplicated incident summary and issue draft, and asks before submitting it.
- [x] **AC5** — Given the bootstrap script, when its setup configuration is reviewed, then Vercel owns app environment values, GitHub owns Actions secrets/variables, and no Terraform command is required.
- [x] **AC6** — Given these changes, when project verification runs, then customizations and issue forms parse, bootstrap shell syntax passes, and `npm run verify` passes.

## Tasks
- [x] **T1** — Add outcome planning role and `/outcome` prompt; update kickoff and feature workflow to preserve outcome links and approval gates · files: `.github/agents/outcome-planner.agent.md`, `.github/prompts/outcome.prompt.md`, `.github/prompts/kickoff.prompt.md`, `.github/prompts/feature.prompt.md` · ~40 min
- [x] **T2** — Add outcome, proposal, and incident issue forms plus idempotent label setup during bootstrap · files: `.github/ISSUE_TEMPLATE/`, `scripts/bootstrap.sh` · ~35 min
- [x] **T3** — Add safe incident triage prompt and document provider-backed automated ingestion as a follow-on requiring a telemetry provider · files: `.github/prompts/triage-error.prompt.md`, `.github/copilot-instructions.md`, `docs/decisions.md` · ~30 min
- [x] **T4** — Replace Terraform-dependent bootstrap with Vercel CLI for project linking and GitHub CLI for workflow secrets, variables, and labels; document Vercel-managed app secrets · files: `scripts/bootstrap.sh`, `README.md` · ~45 min
- [x] **T5** — Update starter onboarding and architecture docs to describe outcomes, proposals, approval, and incident flow · files: `app/page.tsx`, `docs/architecture/FactoryDiagram.jsx`, `docs/decisions.md` · ~20 min
- [x] **T6** — Validate customization and issue-form YAML, bootstrap syntax, active references, and project verification · files: none · ~20 min

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Outcome and proposal planning | Real | Copilot prompt and custom agent produce artifacts; human approves delivery |
| Proposal lifecycle | Real | GitHub issue forms and labels; no issue auto-assignment |
| Error triage | Real, user-triggered | `/triage-error` drafts a sanitized incident; user confirms issue submission |
| Runtime error ingestion and automatic issue submission | Follow-on | Requires a selected monitoring provider, authenticated webhook, deduplication, and retention policy |
| App environment secrets | Real | Configure in Vercel project settings or `vercel env`; not exposed to GitHub Actions |
| Workflow credentials | Real | Store as GitHub Actions secrets/variables using `gh`; Vercel cannot provide these to GitHub Actions |

## New env vars, services, migrations, seed data
None for this slice.

## Follow-on features
- Integrate a selected error monitoring provider for authenticated runtime ingestion, duplicate grouping, automatic incident issue creation, and severity routing.
- Decide whether approved incidents can trigger a Copilot Local fix draft; never auto-merge or deploy the result.
- Configure branch protection and deployment protection directly in GitHub and Vercel, respectively.

## Open questions
- Which monitoring provider should send runtime errors into the automated triage flow?
