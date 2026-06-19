# Task 06: Codex CLI Spawn Runtime

You are the Local Runtime Agent for Local Codex Office.

## Product Context

MVP prioritizes spawned mode. The app creates and controls new local Codex sessions instead of attaching to arbitrary existing sessions first.

## Feature

App-controlled Codex CLI runtime.

## Objective

Implement `CodexCliRuntime` using Node.js child processes in the Electron main process. It must spawn Codex with a working directory, initial task, selected model/profile, assigned skills, and permission mode. It must stream stdout/stderr into runtime events, capture or estimate token usage where possible, and support stopping/restarting app-created sessions.

## Architecture Alignment

This task extends the Runtime Adapter Layer with app-controlled Codex CLI sessions. It must not own Agent Registry state, task policy, message routing policy, permission policy, or audit explanation. Those concerns belong to Agent Registry, Task Engine / DAG, Message Router, Permission Policy Engine, Audit Engine, and Event Logs.

## Expected Output

- `src/main/runtime/CodexCliRuntime.ts`
- Process lifecycle management.
- Log streaming from stdout and stderr.
- Token usage parsing or estimation from Codex CLI output/logs when available.
- Session records linked to agents.
- Stop and restart operations.
- Runtime configuration for Codex executable path and profile.
- Tests using a fake child process adapter.

## Expected Feature

The user can create an app-controlled local Codex agent and see its process logs stream into the app.

## Validation Goal

The app can reliably start, monitor, and stop a local process through the runtime abstraction without freezing the UI or leaking child processes.

## Verification Steps

- Test process spawn arguments are generated from agent creation input.
- Test stdout and stderr lines become runtime events.
- Test token usage output becomes `token_usage` runtime events when present.
- Test missing exact usage is marked as `estimated` rather than `reported`.
- Test process exit updates session status.
- Test stop terminates the process and records an event.
- Test restart creates a new session for the same agent.
- Confirm all process work happens in the Electron main process.

## Continuation

After this task passes validation, continue with `07_agent_status_state_machine.md`. The status task should interpret runtime events from both mock and Codex CLI runtimes.
