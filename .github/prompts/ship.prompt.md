---
name: ship
description: Review and prepare a pull request for a feature after the user approves git and GitHub side effects.
argument-hint: '<slug>'
agent: agent
---

For the supplied slug, first use the Reviewer custom agent and stop if the verdict is FIX. If the verdict is SHIP, run the Shipper custom agent instructions. Before any commit, push, branch creation, or PR creation, show the user the exact proposed actions and wait for explicit approval. Never commit to `main` or force-push. Report the PR URL only if creation succeeded.