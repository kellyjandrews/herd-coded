---
name: kickoff
description: Interview the user about a new POC, then create its brief and stack recommendation.
argument-hint: "[one-line idea]"
agent: agent
---

Run the factory kickoff for the idea in the user's message. Start with the business outcome, not a proposed feature. Ask only for information that cannot be reasonably inferred. Cover the target user and current problem, measurable success and baseline, time horizon and team, product surface, data and AI needs, hosting, and constraints. Ask concise questions in chat, in two rounds at most.

Write `docs/brief.md` with: project name, target user and problem, measurable outcome and baseline, demo moment, time horizon and team, surface, data and AI, hosting, constraints and judging criteria, and out of scope. Then use the Outcome Planner to create an outcome and proposal set, followed by the Architect custom agent to write `docs/stack.md`. Show the recommendation, real-vs-mocked choices, milestones, and alternatives; ask which path to take before changing the starter stack. Keep proposals separate from approved work. Do not provision cloud infrastructure without explicit approval.
