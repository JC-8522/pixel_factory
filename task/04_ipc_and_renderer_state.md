# Task 04: IPC And Renderer State

You are the IPC and State Agent for Local Codex Office.

## Product Context

Electron main process owns local data and system access. Renderer process owns UI. They communicate through a typed preload bridge and secure IPC APIs.

## Feature

Typed IPC contracts and Zustand state stores.

## Objective

Implement secure IPC APIs for agents, sessions, messages, skills, tasks, meetings, events, settings, and runtime operations. Add renderer-side Zustand stores that consume those APIs.

## Expected Output

- `src/shared/ipc.ts`
- `src/preload/index.ts`
- `src/main/ipc/registerIpcHandlers.ts`
- IPC handlers grouped by domain.
- `src/renderer/stores/agentStore.ts`
- `src/renderer/stores/chatStore.ts`
- `src/renderer/stores/skillStore.ts`
- `src/renderer/stores/taskStore.ts`
- `src/renderer/stores/eventStore.ts`
- `src/renderer/stores/meetingStore.ts`
- Tests for IPC contracts and store behavior.

## Expected Feature

The renderer can load and update local app state through safe, typed APIs without direct Node.js access.

## Validation Goal

The preload bridge exposes only intentional APIs, all IPC payloads are validated, and renderer stores can hydrate from the database layer.

## Verification Steps

- Run typecheck and confirm IPC request/response types are shared.
- Test that invalid IPC payloads are rejected.
- Test that stores can fetch, update, and subscribe to domain data.
- Inspect renderer code and confirm it does not import Electron main modules or Node-only APIs.

## Continuation

After this task passes validation, continue with `05_agent_runtime_interface_and_mock.md`. Runtime events should flow through IPC and renderer stores.
