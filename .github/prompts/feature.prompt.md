---
name: feature
description: Run the plan, build, test, review, and ship workflow for one feature.
argument-hint: "<feature description>"
agent: agent
---

Run the factory workflow for an approved proposal or approved feature issue supplied after `/feature` (for example, `/feature #123`). Do not treat free-text ideas or unapproved suggestions as authorization to build.

1. Use `gh issue view <number> --json title,body,labels` to verify the issue has the `approved` label and either `proposal` or `feature`. If GitHub CLI access is unavailable or the issue lacks approval, stop and explain how to approve it. Read the linked outcome and proposal and confirm the success measure.
2. Derive a kebab-case slug of at most five words and create `specs/<slug>/`.
3. Plan with the Planner custom agent or `.github/agents/planner.agent.md`. Include the source proposal and outcome reference in the plan. Show the acceptance criteria and task list. If the plan is blocked, ask the user the listed open questions; otherwise proceed.
4. Build with the Builder custom agent or `.github/agents/builder.agent.md`, one planned task at a time.
5. Test with the Tester custom agent or `.github/agents/tester.agent.md`. For app bugs, send the findings back to the Builder and rerun tests, at most twice.
6. Review with the Reviewer custom agent or `.github/agents/reviewer.agent.md`. For a FIX verdict, address blockers and rerun tests and review, at most twice.
7. Only after a SHIP verdict, offer the Shipper stage. Get explicit approval before committing, pushing, or opening a PR.

Use the plan and reports in `specs/<slug>/` as the hand-off between stages. Keep the user informed of acceptance criteria, blockers, and results. Do not claim a PR or preview exists unless it does.
