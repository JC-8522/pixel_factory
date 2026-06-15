# Task 16: QA, Polish, And Packaging

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

## Continuation

After this task passes validation, the product is ready for the next planning cycle or release. Do not add new feature scope during this task unless required to satisfy an existing validation goal.
