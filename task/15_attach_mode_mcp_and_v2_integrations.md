# Task 15: Attach Mode, MCP, And V2 Integrations

You are the Integration Agent for Local Codex Office.

## Product Context

MVP focuses on spawned mode. V2 adds attach mode, MCP-based orchestration, GitHub integration hooks, multi-project workspace support, Agent Pack import/install boundaries, plugin system foundations, timeline replay, and shared office themes.

## Feature

Future-ready integration layer.

## Objective

Add extension points and the first usable implementation for attaching to existing local Codex sessions where feasible. Add MCP orchestration interfaces, multi-project workspace models, timeline replay data hooks, GitHub PR integration boundaries, Agent Pack inspection/install boundaries, plugin registry design, and shared office theme support without destabilizing MVP.

## Expected Output

- `src/main/runtime/AttachedCodexRuntime.ts` or documented stub if reliable attach is not yet possible.
- `src/main/runtime/McpRuntimeBridge.ts` interface.
- Multi-project workspace data model and IPC APIs.
- Timeline replay event query APIs.
- GitHub integration boundary interface.
- Agent Pack manifest format for source-readable packages.
- Agent Pack inspection flow that lists profiles, skill dependencies, bundled skills, scripts, assets, permission manifest, validation tests, author metadata, version metadata, checksum/signature status, and validation status before install.
- Agent Pack install flow from local folder or GitHub URL, gated by explicit user review.
- Plugin registry interface.
- Office theme model and renderer support.
- `docs/v2_integrations.md` documenting completed and deferred pieces.
- Tests for stable interfaces and fallback behavior.

## Expected Feature

The product can evolve beyond spawned agents and local-only profiles without rewriting the core architecture.

## Validation Goal

Existing MVP and V1 features keep working, and future integrations have typed boundaries, documented assumptions, and graceful fallback behavior.

## Verification Steps

- Confirm spawned mode still works.
- Confirm attach mode either works for known session files/logs or is safely disabled with clear docs.
- Confirm MCP bridge has typed input/output contracts.
- Confirm multi-project workspace records can be created and selected.
- Confirm a local Agent Pack can be inspected without executing scripts.
- Confirm Agent Pack installation requires explicit review of permissions, scripts, skills, author metadata, version, and validation status.
- Confirm installed Agent Pack profiles become normal Agent Profiles.
- Confirm theme selection changes office visuals.
- Confirm all unfinished V2 integrations are documented as explicit follow-up work.

## Continuation

After this task passes validation, continue with `16_qa_polish_packaging.md`. Final QA must test both completed features and documented fallbacks.
