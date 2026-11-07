# Plan: A clearer workspace

Slug: `workspace-ui` · Status: READY · Estimate: 90 minutes

## Goal
Help people start a feature request, find projects, and navigate between them without changing the existing backend workflows.

## Source
Issue: None

## Acceptance criteria
- [x] **AC1** — Given projects are available, a user can choose one on the landing view and open its feature request form.
- [x] **AC2** — A user can view all projects, create a project, and return to the project list from a project page.
- [x] **AC3** — Loading, empty, unconfigured, and error states remain understandable; existing project and queue actions remain available.
- [x] **AC4** — Navigation and forms remain usable on desktop, mobile, and with a keyboard.

## Tasks
- [x] **T1** — Add task-oriented landing navigation and preserve project actions · files: `app/factory-dashboard.tsx`
- [x] **T2** — Make the project request destination and return navigation clear · files: `app/projects/[owner]/[repo]/`
- [x] **T3** — Style responsive, accessible UI within the existing visual system · files: `app/globals.css`
- [x] **T4** — Test the user journeys and existing workflows · files: `tests/e2e/`

## Real vs mocked
| Capability | Real / mocked | Notes |
|------------|---------------|-------|
| Project and feature workflows | Existing real or mocked providers | UI changes only |

## New env vars, services, migrations, seed data
None

## Follow-on features
None

## Open questions
None
