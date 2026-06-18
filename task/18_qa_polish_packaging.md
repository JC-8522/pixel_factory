# Task 18: QA, Polish, And Packaging

You are the QA and Release Agent for Local Codex Office.

## Product Context

All implementation tasks should now be complete or explicitly documented as deferred. The app must be reliable enough for local desktop use.

## Feature

End-to-end testing, visual polish, accessibility, performance, packaging, and release readiness.

## Objective

Verify the full product from first launch through agent creation, chat, skill assignment, office rendering, task tracking, timeline inspection, meeting room flow, safety approvals, and packaging.

## Expected Output

- Unit tests for runtime, database, state machine, skill scanning, safety rules, and repositories.
- UI tests for create agent, office selection, detail drawer, chat, skill assignment, task board, timeline, meeting room, and permission dialog.
- Visual checks for desktop and smaller window sizes.
- Accessibility pass for keyboard navigation and labels.
- Performance check for multiple agents.
- Create Agent skill selector polish: search, category filtering, selected-only filtering, and collapsible sections for large scanned skill libraries.
- Packaged desktop build.
- `docs/release_checklist.md`
- `docs/known_limitations.md`

## Expected Feature

The user can install or run the packaged local desktop app and complete the main product workflows without developer intervention.

## Validation Goal

The final app satisfies the product design and all previous tasks' validation goals.

## Verification Steps

- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run test`.
- Run UI or E2E tests.
- Launch the app in development mode and complete the main workflow manually.
- Create one mock agent and one app-controlled Codex agent where the local environment supports it.
- Assign a skill to an agent.
- Send a chat message and verify persistence after restart.
- Create and complete a task.
- Start a meeting and save a summary.
- Trigger a risky command and verify the permission dialog.
- Build the packaged app.
- Confirm release docs list setup steps and known limitations.

## Human App Acceptance

- Use `skills/electron-desktop-debug/SKILL.md` for the runbook.
- Launch the Electron app from a clean dev run and complete the primary workflow as a human manager from first screen to persisted result.
- Verify first-run office, profile creation, agent creation, chat, skill assignment, task board, timeline, cost dashboard, meeting room, Agent Pack review, project workspace, theme, and permission dialog flows.
- Capture focused screenshots for every primary product surface and at least one smaller-window layout.
- Restart the app and confirm persisted agents, profiles, tasks, sessions, and settings still render.
- Run or build the packaged desktop app and verify the packaged app opens to a usable UI.
- Inspect dev/package logs and confirm no renderer, preload, IPC, runtime, packaging, or startup errors occurred.

## Continuation

After this task passes validation, the product is ready for the next planning cycle or release. Do not add new feature scope during this task unless required to satisfy an existing validation goal.

## Completion Notes

- Added QA/polish outputs:
  - Create Agent skill search, category filter, selected-only toggle, and collapsible skill groups
  - `docs/release_checklist.md`
  - `docs/known_limitations.md`
- Verified with:
  - `tsc --noEmit`
  - `eslint .`
  - `vitest run`
  - production build via `electron-vite build`
  - packaged Windows unpacked build via `electron-builder --dir`
- Human-style UI evidence:
  - office, profiles, agent packs, tasks, meeting room, integrations, permissions, and smaller-window screenshots in `out/task18-*.png`
  - packaged app screenshot in `out/task18-packaged-office.png`
- Packaged output:
  - `release/win-unpacked/Local Codex Office.exe`
- Final verification notes:
  - packaged app opens to a usable UI,
  - primary navigation renders,
  - Create Agent entry point is visible,
  - existing persisted agents/tasks/settings render after restart,
  - expected permission-request flows no longer appear as main-process handler errors in fresh logs.
