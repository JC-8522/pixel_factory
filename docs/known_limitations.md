# Known Limitations

## Platform

- The app is local-first and currently optimized for desktop development workflows rather than general consumer distribution.
- Electron dev mode still shows a CSP warning that does not block development validation.

## Runtime

- `AttachedCodexRuntime` is read-only. Existing local Codex processes can be detected and surfaced, but they are not yet reliably controllable.
- `McpRuntimeBridge` is a typed boundary with a disabled provider by default. Real MCP transport/provider setup is still deferred.
- The current permission layer reviews command-like requests routed through app-controlled agent chat and orchestration paths. It is not yet a full OS sandbox.

## Data And Scope

- Project workspace selection exists, but full workspace foreign-key isolation across every table is still deferred.
- Business Memory Assets are part of the product direction and architecture, but they are not yet a first-class product surface.

## UX

- Permission review is designed for clarity and local control, but bulk rule management is still minimal.
- Create Agent skill filtering now supports search, category filtering, selected-only filtering, and collapsible groups, but it does not yet support saved filter presets.
- The product surface is dense and best experienced at laptop/desktop sizes. Smaller windows are supported, but some panels become vertically long.

## Packaging

- The packaged build is intended for local desktop use and verification. Installer/distribution hardening is still light.
