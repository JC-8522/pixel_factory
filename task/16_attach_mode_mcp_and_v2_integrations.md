# Task 16: Attach Mode, MCP, And V2 Integrations

You are the Integration Agent for Local Codex Office.

## Product Context

MVP focuses on spawned mode. V2 adds attach mode, MCP-based orchestration, GitHub integration hooks, multi-project workspace support, plugin system foundations, timeline replay, and shared office themes.

## Feature

Future-ready integration layer.

## Objective

Add extension points and the first usable implementation for attaching to existing local Codex sessions where feasible. Add MCP orchestration interfaces, multi-project workspace models, timeline replay data hooks, GitHub PR integration boundaries, plugin registry design, and shared office theme support without destabilizing MVP.

## Expected Output

- `src/main/runtime/AttachedCodexRuntime.ts` or documented stub if reliable attach is not yet possible.
- `src/main/runtime/McpRuntimeBridge.ts` interface.
- Multi-project workspace data model and IPC APIs.
- Project Workspace Selector UI and store.
- Timeline replay event query APIs.
- GitHub integration boundary interface.
- Plugin registry interface.
- Office theme model and renderer support.
- `docs/v2_integrations.md` documenting completed and deferred pieces.
- Tests for stable interfaces and fallback behavior.

## Expected Feature

The product can evolve beyond spawned agents, local-only profiles, and local-only Agent Packs without rewriting the core architecture.

## Validation Goal

Existing MVP and V1 features keep working, and future integrations have typed boundaries, documented assumptions, and graceful fallback behavior.

## Verification Steps

- Confirm spawned mode still works.
- Confirm attach mode either works for known session files/logs or is safely disabled with clear docs.
- Confirm MCP bridge has typed input/output contracts.
- Confirm multi-project workspace records can be created and selected.
- Confirm the Project Workspace Selector changes the active workspace without mixing agents, tasks, or events between projects.
- Confirm theme selection changes office visuals.
- Confirm all unfinished V2 integrations are documented as explicit follow-up work.

## Continuation

After this task passes validation, continue with `17_local_safety_permission_layer.md`. Safety can be finalized after integration boundaries are stable.
