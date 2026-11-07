---
name: outcome
description: Define a measurable business outcome and generate feature proposals for user selection.
argument-hint: "<business goal or problem>"
agent: Outcome Planner
---

Help turn the user's business goal into a measurable outcome. Ask about the target user, current pain, baseline, desired change, time horizon, and constraints only when missing. Do not assume a feature is the outcome.

Use the Outcome Planner custom agent to write `docs/outcomes/<slug>.md` and `docs/proposals/<slug>.md`. Present two to five ranked proposals with expected impact, effort, confidence, risks, dependencies, and testable acceptance criteria. Proposals are not approved work: do not implement code, create pull requests, or create GitHub issues unless the user explicitly selects proposal(s) and asks to submit them. Explain that adding the `approved` label to a proposal issue is the gate into `/feature`.
