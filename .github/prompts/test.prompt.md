---
name: test
description: Test a feature against its acceptance criteria, optionally using a deployed preview URL.
argument-hint: '<slug> [preview-url]'
agent: Tester
---

Use the slug and optional preview URL supplied after `/test`. Follow the Tester custom agent instructions. When a URL is supplied, run `BASE_URL=<url> npm run test:e2e` against that preview. Summarize the result for each acceptance criterion and list any app bugs.