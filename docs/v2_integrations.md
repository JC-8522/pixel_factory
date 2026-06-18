# V2 Integrations

Task 16 adds stable V2 extension boundaries without replacing the MVP runtime architecture.

## Completed Foundation

- `AttachedCodexRuntime` exists as a Runtime Adapter Layer boundary.
- Attach mode reports `disabled` or `read_only`; it does not pretend to control sessions when reliable control is unavailable.
- `McpRuntimeBridge` defines typed request, response, status, and provider event normalization contracts.
- MCP is represented by `DisabledMcpRuntimeBridge` until a provider is configured.
- Project workspace settings can be created, selected, and persisted.
- Office theme settings can be selected and applied in the renderer.
- Timeline replay API returns persisted Event Logs for future replay UX.
- GitHub and plugin registry boundaries are documented as disabled interfaces.
- Integration status checks record Audit Engine events.

## Deferred Work

- Bidirectional attach control for existing Codex sessions.
- Real MCP provider configuration and transport.
- Durable workspace foreign keys on every domain table.
- Remote GitHub PR provider inside the desktop app.
- Plugin loading and permission review.
- Timeline replay controls for stepping, filtering, and reconstructing UI state.
- Shared community theme packages.

## Architecture Rule

Attach, MCP, GitHub, plugin, and workspace work must continue through Runtime Adapter Layer, Message Router, Agent Registry, Permission Policy Engine, Audit Engine, Event Logs, and Local Persistence. Renderer UI must not add provider-specific business logic.
