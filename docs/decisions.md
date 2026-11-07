# Decisions

One line each: `YYYY-MM-DD — decision — why`

- 2026-10-30 — Vercel over GCP for the app — per-PR preview URLs, instant rollback and zero-config Next.js out of the box; GCP Cloud Run is the add-on only for long-running or Python/GPU services.
- 2026-10-30 — Deploy from GitHub Actions with the Vercel CLI, not Vercel's Git integration — tests gate production, one source of deploys, auto-rollback in the same job.
- 2026-10-30 — Initially used Claude Code subagents + slash commands as the factory runtime — superseded by the Copilot migration below.
- 2026-11-07 — Copilot custom agents and VS Code prompt files replace Claude Code customizations — repository instructions, role agents, and slash prompts work in Copilot Chat; GitHub cloud coding and code review use native Copilot settings rather than Anthropic Actions.
- 2026-11-07 — Outcome-first work intake — superseded: removed outcome/proposal/approval stages to focus on features.
- 2026-11-07 — The factory is a deployed dashboard behind Basic Auth — it creates a GitHub repo + Vercel project per app and files feature issues assigned to the Copilot cloud agent, which opens PRs; free tiers only, no Terraform.
- 2026-11-07 — Vercel owns app runtime environment values while GitHub owns Actions secrets and variables — GitHub Actions deploy through the Vercel CLI and cannot read Vercel's project environment store.
- 2026-11-07 — Error triage starts as user-triggered incident drafting — automatic ingestion and issue creation wait for a selected telemetry provider and authenticated integration.
- 2026-11-07 — Default bootstrap uses Vercel CLI and GitHub CLI instead of Terraform — app secrets stay in Vercel and workflow credentials are configured at their point of use.
- 2026-11-07 — Generated apps queue CSV feature batches and assign Copilot one issue at a time via a PAT secret — sequential PRs avoid merge conflicts, and the Actions GITHUB_TOKEN cannot assign the Copilot agent.
- 2026-11-07 — All dashboard features go through the per-app feature queue; the app template is the only copy of the queue workflow — one Copilot session per repo, and Repair pushes queue updates to existing apps.
- 2026-11-07 — The factory copies its token into each app's `COPILOT_ASSIGN_TOKEN` secret (override with `FACTORY_COPILOT_ASSIGN_TOKEN`) — hackathon speed over least privilege; revisit with a narrower token or GitHub App.
- 2026-11-07 — The app's Feature queue auto-ships finished Copilot PRs: marks ready, dispatches CI with the PAT, squash-merges on green, and asks `@copilot` to fix failures (3 max); `FEATURE_AUTO_MERGE=false` opts out — Copilot-triggered CI needs manual approval and drafts never merged, so nothing deployed.
- 2026-11-07 — New features need approval on the project page before Copilot starts: issues are created with only `feature`, and Approve adds `feature-queue` (or assigns Copilot in apps without a queue) — work and auto-merged deploys only happen for features someone signed off on.
- 2026-11-07 — Ship starts only from ungated events (Copilot assignment by the PAT, Vercel comments, dispatch) and polls for Copilot and CI instead of using `pull_request_target`/`workflow_run`; the project page can also merge — any run whose actor is Copilot needs a manual "Approve workflows" click.
- 2026-11-07 — `USE_MOCKS=true` serves seeded projects from an in-memory store — the demo path and e2e work without GitHub or Vercel credentials.
- 2026-11-07 — New projects take an app prompt instead of a description: GitHub Models (`openai/gpt-4.1-mini`) writes the repo description, falling back to the prompt's first sentence, and the prompt becomes a `Build the MVP` issue that is approved on creation — submitting the prompt is the sign-off, and a description that can't be generated never blocks provisioning.
- 2026-11-07 — Repository secrets are sealed with tweetnacl + blakejs instead of libsodium-wrappers — libsodium-wrappers 0.7.x ships a broken ESM build.
- 2026-10-30 — Specs in `specs/<slug>/` are the hand-off between agents — any agent or human can resume a feature from files.
- 2026-10-30 — Neon branch per PR (optional) — each preview gets its own database, so demos never share or corrupt data.
