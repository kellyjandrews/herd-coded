# 🏭 AI Code Factory

A hackathon starter where Copilot starts from a measurable business outcome,
suggests possible features for approval, then helps plan, build, test, review and
ship approved work as a PR — with a live preview URL per PR and a gated production
deploy on merge.

```
/outcome  →  proposals  →  approval  →  /feature #issue  →  PR  →  preview  →  production
```

## Quick start

**To build locally:** Node 20+, VS Code, and GitHub Copilot Chat with Agent mode.

```bash
git clone <this repo> my-poc && cd my-poc
npm ci
npm run dev
```

In Copilot Chat, choose Agent mode with the **Local** session target and run
`/kickoff` or `/outcome` to start shaping the POC. The repository's Copilot roles are in
`.github/agents/`, and VS Code slash prompts are in `.github/prompts/`. No cloud
credentials or Terraform are needed for local development. The factory workflow
runs in your VS Code Copilot Local session; GitHub is used for issues, PRs, and CI.

**Optional Vercel deployment:** This starter's GitHub Actions workflows deploy with
the Vercel CLI. You need [`gh`](https://cli.github.com) logged in, a Vercel account,
and a Vercel token. Run `./scripts/bootstrap.sh` to create/link the Vercel project,
configure GitHub Actions, create factory labels, and push the starter. The default
bootstrap does not use Terraform. Add application environment values in Vercel
Project Settings or with `npx vercel env add`; workflow credentials remain in GitHub
Actions secrets because Actions cannot read Vercel's environment store. This setup
owns deployments; don't also enable Vercel's Git-based deployment for the same project.

## What's in the box

| Stage the brief asked for | How the factory does it |
|---|---|
| **Define the outcome** | `/outcome` captures a user, problem, baseline, target, time horizon, and constraints |
| **Suggest possible work** | `Outcome Planner` ranks proposals by impact, effort, confidence, dependencies, and risk; suggestions do not start implementation |
| **Approve work** | Add the `approved` label to a proposal or approved feature issue before `/feature #<issue>` |
| **Fastest POC suggestions** | `Architect` custom agent writes `docs/stack.md`: demo moment, real-vs-mocked table, time-boxed milestones, ordered backlog, two alternative fast paths |
| **Plan approved feature** | `Planner` → `specs/<slug>/plan.md` with Given/When/Then criteria and ≤6 tasks, linked to the source outcome |
| **Build new feature** | `Builder` executes tasks one by one, `npm run verify` after each |
| **Test new feature** | `Tester` maps every acceptance criterion to a Vitest/Playwright test |
| **Commit & PR** | `Reviewer` (SHIP/FIX gate) → `Shipper` prepares the PR after your approval |
| **Dev instance per PR** | `preview.yml`: Vercel deployment + optional Neon DB branch, health check, e2e against the live URL, sticky PR comment |
| **Prod on merge** | `production.yml`: verify → deploy → smoke test the new SHA → **auto-rollback** if it fails |

Run `/outcome <business goal>` to generate proposals. After approval, run `/feature #<issue>` for the full delivery line, or use `/plan`, `/build`, `/test`, and `/ship` on an approved issue.

### Additions beyond the brief

- **Local issue → PR workflow** — use `/feature #<issue>` in VS Code Copilot Local after approving a proposal. GitHub stores the issue and PR; workflow stages run in VS Code.
- **Incident triage** — `/triage-error` redacts sensitive details, checks for likely duplicates, drafts an incident issue, and asks before submitting it. Automated runtime ingestion is not configured until a monitoring provider is chosen.
- **Database branch per PR** (Neon, optional) — every preview has its own data; migrations run automatically.
- **Database migration caution** — production migrations run before deployment; use backward-compatible migrations because a Vercel rollback does not revert the database schema.
- **Preview cleanup** — closing a PR deletes its deployments and DB branch.
- **One-click rollback** — `/rollback` or the `rollback.yml` workflow; instant, no rebuild.
- **`/demo` + demo-coach agent** — timed click-by-click script, realistic seed data, and a fallback for every step. Hackathons are won in the last hour.
- **`/status`** — backlog vs merged, open PRs with preview URLs, failing checks, time left against your time box.
- **Guardrails** — repository instructions keep agents off `main` and away from secrets; GitHub branch protection and CI provide enforceable merge checks. Copilot instructions guide the agent but are not a security boundary.
- **Mocks for external services** — when a feature integrates an external service, the builder can put it behind an interface and provide a `USE_MOCKS=true` implementation for reliable demos.
- **Spec files as the hand-off** — agents pass work through `specs/<slug>/`, so a human or another agent can resume any feature mid-flight.

## Deployment

**Vercel is the default for the app** — Next.js hosting and previews fit this starter well.
The included workflows use the Vercel CLI to keep deployment behind GitHub checks. For
the fastest setup, you can instead use Vercel's Git integration, but first disable the
included `preview.yml` and `production.yml` deployment jobs to avoid duplicate deploys.

Add another hosting platform only when a concrete requirement calls for it, such as a
long-running worker, GPU workload, or sponsor constraint.

## Layout

```
.github/copilot-instructions.md  factory rules Copilot uses in this repository
.github/agents/               outcome-planner, architect, planner, builder, tester, reviewer, shipper, demo-coach
.github/prompts/               /kickoff /outcome /feature /plan /build /test /triage-error /ship /demo /status /rollback
.github/ISSUE_TEMPLATE/        outcome, proposal, approved feature, bug, incident
.github/workflows/            ci, preview, preview-cleanup, production, rollback
infra/terraform/              optional Terraform provisioning; not used by default bootstrap
specs/_template/plan.md       the spec every feature starts from
docs/                         brief.md, stack.md, decisions.md, demo.md, architecture/
app/ tests/                   minimal Next.js starter with /api/health, Vitest, Playwright
```

## Secrets & variables

| Name | Store | Used by |
|---|---|---|
| Application secrets such as `DATABASE_URL` | Vercel project environment variables | App runtime; also available to GitHub deploy builds through `vercel pull` |
| `VERCEL_TOKEN` | GitHub Actions secret | Preview, production, and rollback workflows |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | GitHub Actions secret, when preview protection is enabled | Health checks and Playwright through Vercel Deployment Protection |
| `NEON_API_KEY`, `PRODUCTION_DATABASE_URL` | GitHub Actions secrets when workflows need them | Optional database branching and migrations |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `PRODUCTION_URL`, `NEON_PROJECT_ID` | GitHub Actions variables | Workflows |

## Architecture diagram

`docs/architecture/FactoryDiagram.jsx` draws the factory with **arch-lib** — copy your
`arch-lib/` folder next to it and render the component. It has outcome → proposal →
approved feature, merge → production, and issue → PR flows with click-through details.

## Notes

- VS Code Copilot Local is the factory runtime. GitHub is used for issue tracking, pull requests, and Actions deployment workflows.
- Runtime errors are not automatically ingested in this starter. Choose and configure a monitoring provider before enabling automated issue creation.
- Previews require a Vercel login by default. For public judge access, change Vercel Deployment Protection in project settings; for protected previews, configure its automation bypass and add it as a GitHub Actions secret.
