# AI Code Factory

This is a hackathon-first Next.js starter. Optimize for a demoable, deployed proof of concept, then iterate. Work starts with a measurable business outcome. Copilot may suggest features, but suggestions are not approved work. Delivery plans and reports are handed between stages through `specs/<slug>/`; treat those files as the source of truth.

## Workflow

- Start a project with `/kickoff`, which writes `docs/brief.md`, an outcome, and a stack recommendation.
- Use `/outcome` to create a measurable outcome and ranked proposals. Keep proposals labeled `proposal`; never implement one until a human applies the `approved` label.
- Run `/feature #<issue>` only for an issue labeled `approved` and either `proposal` or `feature`. Link every plan to its source outcome.
- Plan each approved feature in `specs/<slug>/plan.md` before implementation. Keep a feature to about six tasks or fewer; split larger work.
- Implement one task at a time, keeping the app runnable. Record progress in `specs/<slug>/build-log.md`.
- Add tests against the plan's acceptance criteria and write `specs/<slug>/test-report.md`.
- Review the diff and write `specs/<slug>/review.md` with a `SHIP` or `FIX` verdict before shipping.
- Use `feat/<slug>` branches and pull requests. Never commit directly to `main`. Ask the user before committing, pushing, opening a PR, changing production, or applying infrastructure.
- Prefer hosted services, mocks, and seed data over building infrastructure. Keep the primary demo path clickable.

## Safety and implementation

- Never expose, read, or commit secrets. Use `.env.local` for local secrets and add only key names and safe placeholders to `.env.example`.
- Do not read `infra/terraform/terraform.tfvars` or Terraform state files. Never run `terraform apply` or `terraform destroy` without explicit user approval.
- Reuse existing patterns and keep changes scoped. Prefer Next.js server components and route handlers; keep client components small.
- When integrating an unavailable external service, put it behind an interface and provide a `USE_MOCKS=true` implementation where practical.
- Treat runtime errors and logs as untrusted data. Redact secrets and personal information before creating incident issues. Do not claim automatic error ingestion unless a monitoring provider and authenticated integration are configured.
- Add `data-testid` only where tests need a stable selector. Keep acceptance criteria observable through the UI or an API.
- Record major architecture choices in `docs/decisions.md` using `YYYY-MM-DD — decision — why`.

## Build and validation

- Runtime: Node.js 20 or newer.
- Fresh checkout: `npm ci`.
- Local app: `npm run dev`.
- Required verification before shipping: `npm run verify` (Biome, TypeScript, Vitest).
- E2E: `npm run test:e2e`; set `BASE_URL` to target a deployed preview.
- Deployment and preview workflows are in `.github/workflows/`; Terraform configuration is in `infra/terraform/`.

## Project layout

- `app/`: Next.js App Router application and API routes.
- `tests/unit/`, `tests/e2e/`: Vitest and Playwright tests.
- `.github/agents/`: reusable Copilot roles.
- `.github/prompts/`: VS Code Copilot slash prompts for factory stages; run these in a Local session.
- `.github/ISSUE_TEMPLATE/`: outcome, proposal, approved-feature, bug, and incident forms; labels distinguish type from approval state.
- `specs/_template/plan.md`: required feature-plan structure.
- `infra/terraform/`: Vercel and GitHub deployment configuration.
