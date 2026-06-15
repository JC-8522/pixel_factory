# Task 03: Database Event Store

You are the Backend Storage Agent for Local Codex Office.

## Product Context

The app stores all local state in SQLite through the Electron main process. The renderer accesses data only through IPC.

## Feature

Local persistence and event timeline foundation.

## Objective

Implement a SQLite database layer with schema, migrations, repositories, and event recording for agents, sessions, messages, skills, tasks, meetings, settings, and activity events.

## Expected Output

- `src/main/db/schema.ts`
- `src/main/db/migrations/`
- `src/main/db/client.ts`
- `src/main/db/repositories/agents.ts`
- `src/main/db/repositories/sessions.ts`
- `src/main/db/repositories/messages.ts`
- `src/main/db/repositories/skills.ts`
- `src/main/db/repositories/tasks.ts`
- `src/main/db/repositories/meetings.ts`
- `src/main/db/repositories/events.ts`
- Tests for schema creation and repository CRUD behavior.

## Expected Feature

The app can persist and read:

- agents,
- runtime sessions,
- chat messages,
- skills,
- agent-skill assignments,
- tasks,
- meetings,
- meeting messages,
- events,
- settings.

## Validation Goal

The database layer can create a fresh local database, run migrations idempotently, write representative records, read them back, and record timeline events for all important actions.

## Verification Steps

- Run database tests against a temporary SQLite file.
- Verify migrations can run twice without corrupting data.
- Verify foreign keys are enforced.
- Verify event records include timestamp, type, optional agent id, optional task id, and JSON payload.
- Verify the renderer has no direct database access.

## Continuation

After this task passes validation, continue with `04_ipc_and_renderer_state.md`. IPC APIs should wrap these repositories.
