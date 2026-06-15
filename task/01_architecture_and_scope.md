# Task 01: Architecture And Scope

You are the Architect Agent for Local Codex Office.

## Product Context

Build a local desktop app using Electron, React, TypeScript, Vite, PixiJS, Zustand, SQLite, and a Node.js backend inside the Electron main process. The app visualizes local Codex agents as pixel-art office workers and lets the user create, inspect, chat with, assign skills to, and coordinate agents.

## Feature

Architecture foundation and implementation roadmap.

## Objective

Convert the product design into a technical architecture that future agents can implement without guessing module boundaries.

## Expected Output

- `docs/architecture.md`
- `docs/mvp_scope.md`
- `docs/module_boundaries.md`
- `docs/ipc_contracts.md`
- `docs/data_model.md`
- `docs/runtime_adapter.md`
- A short list of explicit non-goals for MVP, V1, and V2.

## Expected Feature

The project has a clear technical blueprint that future agents can follow before writing implementation code.

## Required Decisions

- Electron main process owns local filesystem access, process spawning, SQLite, and safety checks.
- Renderer process owns UI, PixiJS rendering, chat views, task board, and stores.
- Renderer must not directly access Node.js APIs.
- All local access must go through typed IPC APIs.
- Runtime integration must use an `AgentRuntime` abstraction.
- MVP prioritizes spawned app-controlled agents before attach mode.

## Validation Goal

Another implementation agent can read the generated docs and answer:

- where code should live,
- which process owns each responsibility,
- which database tables exist,
- which IPC calls are allowed,
- how agent runtime events flow into UI state,
- and which features are MVP versus later scope.

## Verification Steps

- Confirm every core product feature from `product_design.md` appears in the roadmap.
- Confirm every MVP item has an implementation phase.
- Confirm every V1/V2 item is either planned or explicitly deferred.
- Confirm there are no direct Node.js calls planned inside the renderer.

## Continuation

After this task passes validation, continue with `02_project_scaffold.md`. The scaffold task must follow the architecture documents produced here.
