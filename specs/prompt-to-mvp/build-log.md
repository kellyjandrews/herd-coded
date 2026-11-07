# Build log: prompt-to-mvp

## T1 — Description from prompt and MVP starter
Files: `lib/server/app-prompt.ts` (new), `lib/server/provision-project.ts`, `lib/server/github.ts`, `lib/server/types.ts`, `lib/server/mock-data.ts`
Notes: `describeApp` calls GitHub Models (`openai/gpt-4.1-mini`, 10s timeout) with `FACTORY_MODELS_TOKEN` or `FACTORY_GITHUB_TOKEN`. Model output is treated as untrusted: it is collapsed to one line, stripped of surrounding quotes, and capped at 350 characters. Any failure, an empty reply, or mock mode uses the prompt's first sentence instead. An explicit `description` (still used by the CLI) wins over the prompt. `startMvp` creates a `Build the MVP` issue and approves it unless the project has repair steps. `FactoryProject.description` comes from the repo.

## T2 — `/api/projects` accepts `prompt`
Files: `app/api/projects/route.ts`
Notes: `prompt` is optional, at most 8,000 characters. After provisioning, the route calls `startMvp`. If that fails, it still returns 201 with `mvpError` because the project already exists.

## T3 — Dashboard
Files: `app/factory-dashboard.tsx`, `app/globals.css`
Notes: The description field is replaced by "What should this app do?". After creation, the row shows "Queued MVP build issue #N" (or "Created MVP issue #N … approve") and the generated description.

## T4 — Docs and tests
Files: `.env.example`, `docs/decisions.md`, `tests/unit/app-prompt.test.ts` (new), `tests/unit/projects-route.test.ts`
Notes: 85 unit tests pass and `tsc` is clean. `npm run verify` still fails Biome formatting on in-progress files outside this feature (`queue/route.ts`, `feature-table.tsx`, `page.tsx`, `feature-queue.ts`, and some tests). Those files were left untouched.
