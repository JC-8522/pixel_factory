# Task 05: Agent Runtime Interface And Mock

You are the Agent Runtime Agent for Local Codex Office.

## Product Context

The product needs a runtime abstraction so the app can support mock agents, spawned Codex CLI agents, existing-session attach mode, MCP, and future local agent providers.

## Feature

Runtime adapter interface and deterministic mock runtime.

## Objective

Define the `AgentRuntime` interface and implement `MockAgentRuntime` first. The mock runtime must support agent creation, message sending, response streaming, token usage events, status changes, stopping, and deterministic test scenarios.

## Expected Output

- `src/shared/types/agent.ts`
- `src/main/runtime/AgentRuntime.ts`
- `src/main/runtime/MockAgentRuntime.ts`
- Runtime event types for message chunks, token usage, status changes, command events, file events, errors, completion, and user-input waits.
- Main-process runtime registry.
- IPC APIs for runtime operations.
- Unit tests for mock runtime behavior.

## Expected Feature

The user can create a mock agent, send it a prompt, see a streamed response, see token usage/cost metadata, and watch status transitions in the app state.

## Validation Goal

The mock runtime proves the full app event pipeline before real Codex CLI integration begins.

## Verification Steps

- Spawn a mock agent through IPC.
- Send a message through IPC.
- Verify streamed chunks are emitted in order.
- Verify token usage events are emitted and persisted with `reported` or `estimated` source.
- Verify per-agent and per-session token totals can be queried.
- Verify agent status changes from idle to thinking to completed.
- Verify messages and events are persisted.
- Verify stopping a mock agent changes status to stopped.

## Continuation

After this task passes validation, continue with `06_codex_cli_spawn_runtime.md`. The real runtime must implement the same interface.
