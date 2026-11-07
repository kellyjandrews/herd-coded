---
name: status
description: Summarize the project backlog, pull requests, previews, CI, and time-box progress.
agent: agent
---

Summarize in under 15 lines using verified command output: backlog from `docs/stack.md`, specs and incomplete tasks, `gh pr list --label factory`, preview URLs from PR comments, the latest five GitHub Actions runs, latest production deployment, and time remaining versus `docs/brief.md`. If GitHub CLI access or any source is unavailable, say so instead of guessing. End with the single most valuable next action.