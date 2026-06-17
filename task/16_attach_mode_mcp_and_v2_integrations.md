# Task 16: Attach Mode, MCP, And V2 Integrations

You are the Integration Agent for Local Codex Office.

## Product Context

MVP focuses on spawned mode. V2 adds attach mode, MCP-based orchestration, GitHub integration hooks, multi-project workspace support, plugin system foundations, timeline replay, and shared office themes.

## Feature

Future-ready integration layer.

## Objective

Add extension points and the first usable implementation for attaching to existing local Codex sessions where feasible. Add MCP orchestration interfaces, multi-project workspace models, timeline replay data hooks, GitHub PR integration boundaries, plugin registry design, and shared office theme support without destabilizing MVP.

Attach and MCP integrations must emit runtime events through the same runtime/event normalization pipeline as mock and Codex CLI spawned runtime. Renderer UI should not need provider-specific branches for attach mode or MCP sessions.

Attach mode and MCP should integrate through Runtime Adapter Layer, Message Router, Agent Registry, Audit Engine, and Event Logs. They must not create a parallel product architecture.

## Expected Output

- `src/main/runtime/AttachedCodexRuntime.ts` or documented stub if reliable attach is not yet possible.
- `src/main/runtime/McpRuntimeBridge.ts` interface.
- Multi-project workspace data model and IPC APIs.
- Project Workspace Selector UI and store.
- Timeline replay event query APIs.
- RuntimeEvent to DomainEvent mapping for attach/MCP provider signals.
- Agent Registry representation for attached sessions where reliable identity exists.
- Message Router integration for controllable attached/MCP sessions.
- Audit Engine records for attach capability, read-only limits, control limits, and provider failures.
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
- Confirm attach/MCP events can be normalized into existing domain events where possible.
- Confirm multi-project workspace records can be created and selected.
- Confirm the Project Workspace Selector changes the active workspace without mixing agents, tasks, or events between projects.
- Confirm theme selection changes office visuals.
- Confirm all unfinished V2 integrations are documented as explicit follow-up work.

## Human App Acceptance

- Use `skills/electron-desktop-debug/SKILL.md` for the runbook.
- Launch the Electron app from a clean dev run.
- Verify the existing spawned-agent workflow still works from the UI.
- Navigate to project workspace, attach mode, integration, and theme controls.
- Create/select a project workspace and confirm visible agents/tasks/events remain scoped to it.
- Attempt attach mode from the UI; if disabled, confirm the disabled state explains why.
- Change the office theme and confirm the visual change in the rendered office.
- Capture focused screenshots of workspace selection, attach/MCP state, and theme change.
- Inspect dev logs after integration workflows and confirm no renderer, preload, IPC, or runtime errors occurred.

## Continuation

After this task passes validation, continue with `17_local_safety_permission_layer.md`. Safety can be finalized after integration boundaries are stable.
