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
- 2026-10-30 — Specs in `specs/<slug>/` are the hand-off between agents — any agent or human can resume a feature from files.
- 2026-10-30 — Neon branch per PR (optional) — each preview gets its own database, so demos never share or corrupt data.
