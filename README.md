# 🏭 AI Code Factory

A private dashboard that creates new apps (GitHub repo + Vercel project) and hands
features to the GitHub Copilot cloud agent, which builds them and opens a pull request —
with a live preview URL per PR and a gated production deploy on merge.

```
Create app  →  New feature (issue assigned to Copilot)  →  PR  →  preview  →  merge  →  production
```

## The factory dashboard

The deployed app is the factory. It is protected with HTTP Basic Auth (`proxy.ts`);
`/api/health` stays public for smoke tests.

1. **Create project** — creates a GitHub repo from a Next.js template, tags it
   `factory-app`, and creates a linked Vercel project (free tier).
2. **New feature** — on any project, describe the feature and acceptance criteria. The
   factory opens an issue assigned to `copilot-swe-agent[bot]`; Copilot works remotely and
   opens a PR. Requires a Copilot plan with the cloud agent enabled for the owner.
3. **Clone** — copy the clone command to work locally instead.

Set these Vercel environment variables on the factory project (see `.env.example`):
`FACTORY_BASIC_AUTH_USERNAME`, `FACTORY_BASIC_AUTH_PASSWORD`, `FACTORY_GITHUB_OWNER`,
`FACTORY_GITHUB_TOKEN`, `VERCEL_ACCESS_TOKEN`, and optionally `VERCEL_TEAM_ID`. Without the
Basic Auth values, production returns 503.

## Quick start

**To build locally:** Node 20+, VS Code, and GitHub Copilot Chat with Agent mode.

```bash
git clone <this repo> my-poc && cd my-poc
npm ci
npm run dev
```

In Copilot Chat, choose Agent mode with the **Local** session target and run
`/kickoff` or `/feature <description>`. The repository's Copilot roles are in
`.github/agents/`, and VS Code slash prompts are in `.github/prompts/`. No cloud
credentials are needed for local development.

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
| **Fastest POC suggestions** | `Architect` custom agent writes `docs/stack.md`: demo moment, real-vs-mocked table, time-boxed milestones, ordered backlog, two alternative fast paths |
| **Remote feature build** | Dashboard → issue assigned to Copilot cloud agent → PR |
| **Plan feature (local)** | `Planner` → `specs/<slug>/plan.md` with Given/When/Then criteria and ≤6 tasks |
| **Build new feature** | `Builder` executes tasks one by one, `npm run verify` after each |
| **Test new feature** | `Tester` maps every acceptance criterion to a Vitest/Playwright test |
| **Commit & PR** | `Reviewer` (SHIP/FIX gate) → `Shipper` prepares the PR after your approval |
| **Dev instance per PR** | `preview.yml`: Vercel deployment + optional Neon DB branch, health check, e2e against the live URL, sticky PR comment |
| **Prod on merge** | `production.yml`: verify → deploy → smoke test the new SHA → **auto-rollback** if it fails |

Run `/feature <description>` or `/feature #<issue>` for the full local delivery line, or use `/plan`, `/build`, `/test`, and `/ship`.

### Additions beyond the brief
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
.github/agents/               architect, planner, builder, tester, reviewer, shipper, demo-coach
.github/prompts/               /kickoff /feature /plan /build /test /triage-error /ship /demo /status /rollback
.github/ISSUE_TEMPLATE/        feature, bug, incident
.github/workflows/            ci, preview, preview-cleanup, production, rollback
app/factory-dashboard.tsx     factory UI; API in app/api/projects and app/api/features
lib/server/                   Basic Auth, GitHub/Vercel provisioning, generated app template
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
`arch-lib/` folder next to it and render the component. It has local feature,
merge → production, and issue → Copilot → PR flows with click-through details.

## Notes

- GitHub hosts repos, issues, PRs, Actions, and the Copilot cloud agent; Vercel hosts the apps.
- Runtime errors are not automatically ingested in this starter. Choose and configure a monitoring provider before enabling automated issue creation.
- Previews require a Vercel login by default. For public judge access, change Vercel Deployment Protection in project settings; for protected previews, configure its automation bypass and add it as a GitHub Actions secret.
