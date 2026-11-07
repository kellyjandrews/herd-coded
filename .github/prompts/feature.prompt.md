---
name: feature
description: Run the plan, build, test, review, and ship workflow for one feature.
argument-hint: "<feature description>"
agent: agent
---

Run the factory workflow for the feature described after `/feature`, or for a feature issue (for example, `/feature #123`).

1. If an issue number is given, read it with `gh issue view <number> --json title,body,labels`.
2. Derive a kebab-case slug of at most five words and create `specs/<slug>/`.
3. Plan with the Planner custom agent or `.github/agents/planner.agent.md`. Link the source issue in the plan when there is one. Show the acceptance criteria and task list. If the plan is blocked, ask the user the listed open questions; otherwise proceed.
4. Build with the Builder custom agent or `.github/agents/builder.agent.md`, one planned task at a time.
5. Test with the Tester custom agent or `.github/agents/tester.agent.md`. For app bugs, send the findings back to the Builder and rerun tests, at most twice.
6. Review with the Reviewer custom agent or `.github/agents/reviewer.agent.md`. For a FIX verdict, address blockers and rerun tests and review, at most twice.
7. Only after a SHIP verdict, offer the Shipper stage. Get explicit approval before committing, pushing, or opening a PR.

Use the plan and reports in `specs/<slug>/` as the hand-off between stages. Keep the user informed of acceptance criteria, blockers, and results. Do not claim a PR or preview exists unless it does.
