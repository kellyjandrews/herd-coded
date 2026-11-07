---
name: plan
description: Plan a feature without changing application source code.
argument-hint: '<feature description>'
agent: Planner
---

Plan the feature in the user's request. Derive a short kebab-case slug (at most five words) unless one was provided, then follow the Planner custom agent instructions to write `specs/<slug>/plan.md`. Summarize acceptance criteria, tasks, and any blocking questions. Do not implement application code.