# Plan: Factory project dashboard

Slug: `app-provisioner-cli` · Status: DONE · Estimate: 240 minutes

## Goal
Make the deployed factory the product: a Basic-Auth-protected dashboard that provisions a clean GitHub app repository, connects a free-tier Vercel project, and returns clone/deployment links. New repositories include Copilot remote-agent instructions for feature work.

## Source
Issue: None (user request in this session).

## Acceptance criteria
- [ ] **AC1** — Given Basic Auth credentials are configured, when a visitor opens the dashboard or project API without valid credentials, then they receive an HTTP Basic Auth challenge; production fails closed when credentials are absent.
- [ ] **AC2** — Given a valid project name and configured GitHub/Vercel provider credentials, when the user submits Create Project, then the factory creates an isolated GitHub repo from the app template and a linked Next.js Vercel project without exposing provider tokens to the browser.
- [ ] **AC3** — Given successful provisioning, when the dashboard displays the result, then it shows the GitHub repository URL, HTTPS/SSH clone URLs, `gh repo clone` command, and Vercel project/deployment URL.
- [ ] **AC4** — Given an existing project, when the dashboard loads, then it lists factory-created repos from GitHub rather than relying on ephemeral serverless memory.
- [ ] **AC5** — Given Vercel project creation fails after GitHub repo creation, when the error is shown, then the dashboard reports the partial GitHub repo and recovery details without deleting user data.
- [ ] **AC6** — Given a new repo, when a feature issue is opened and assigned to Copilot, then its committed instructions/setup support remote feature building and PR creation; no outcome/proposal approval workflow is required.
- [ ] **AC7** — Given these changes, when project verification runs, then typecheck, unit/E2E tests, and production build pass; no paid services or Terraform-managed resources are added.

## Tasks
- [ ] **T1** — Add shared Basic Auth validation and protected project API with same-origin checks · files: `proxy.ts`, `lib/server/auth.ts`, `app/api/projects/route.ts` · ~40 min
- [ ] **T2** — Add clean Next.js/Copilot remote-worker template and GitHub/Vercel provisioning service · files: `templates/`, `lib/server/provision-project.ts` · ~75 min
- [ ] **T3** — Build the responsive project dashboard with create flow, existing project list, status/errors, and clone-route display · files: `app/page.tsx`, `app/factory-dashboard.tsx`, `app/globals.css`, `app/layout.tsx` · ~65 min
- [ ] **T4** — Add Basic Auth and server provider settings to example env/docs; remove outcome/proposal approval requirement from feature instructions · files: `.env.example`, `.github/copilot-instructions.md`, `.github/prompts/feature.prompt.md`, `.github/ISSUE_TEMPLATE/` · ~30 min
- [ ] **T5** — Validate auth, API boundaries, UI flow, generated template, and zero-cost IaC baseline · files: `tests/`, `README.md` · ~30 min

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Factory dashboard | Real | Deployed application protected by Basic Auth |
| GitHub repo | Real | Created from a small app template using a server-side GitHub credential |
| Vercel project | Real | Created with Next.js framework and linked to GitHub; free-tier features only |
| Remote feature worker | Real, user-triggered | GitHub Copilot coding agent is available from feature issues; account/repository eligibility applies |
| Proposal generation | Not included | No outcomes, proposal approval stage, or mock AI generation |
| Paid add-ons | Not included | No database, paid Vercel features, or external AI API in this slice |

## New env vars, services, migrations, seed data
`FACTORY_BASIC_AUTH_USERNAME`, `FACTORY_BASIC_AUTH_PASSWORD`, `FACTORY_GITHUB_TOKEN`, `FACTORY_GITHUB_OWNER`, `VERCEL_ACCESS_TOKEN`, `VERCEL_TEAM_ID`. Configure production secrets in Vercel project settings. No database or paid service is introduced.

## Follow-on features
- Add a real user login/session system if the dashboard needs multiple operators.
- Add remote worker session status/links after the first feature issue is created.

## Open questions
None.
