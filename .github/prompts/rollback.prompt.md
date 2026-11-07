---
name: rollback
description: Roll production back to the previous deployment after explicit confirmation.
agent: agent
---

Explain that rollback changes what production serves. Ask for explicit confirmation before running `gh workflow run rollback.yml`; after approval, monitor it with `gh run watch`. Then offer to open a factory issue describing the failure. Do not run Terraform or make infrastructure changes as part of rollback.