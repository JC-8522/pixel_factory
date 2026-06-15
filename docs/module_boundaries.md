# Module Boundaries

## Directory Layout

```text
src/
  main/
    index.ts
    windows/
    ipc/
    db/
    runtime/
    profiles/
    skills/
    security/
    tasks/
    meetings/
    integrations/
    settings/
  preload/
    index.ts
  renderer/
    App.tsx
    main.tsx
    components/
    office/
    stores/
    routes/
    styles/
  shared/
    ipc/
    types/
    validation/
```

## Main Process Modules

### `src/main/windows`

Owns Electron `BrowserWindow` creation, lifecycle, and renderer loading.

Must not contain business logic for agents, skills, tasks, or database queries.

### `src/main/ipc`

Registers IPC handlers and event broadcasters.

Responsibilities:

- validate IPC input,
- call main-process services,
- return serializable data,
- broadcast sanitized domain updates.

### `src/main/db`

Owns SQLite client, schema, migrations, and repository functions.

Renderer code must never import this module.

### `src/main/runtime`

Owns agent runtime providers:

- `AgentRuntime` interface,
- mock runtime,
- Codex CLI runtime,
- attached session runtime later,
- runtime registry,
- runtime event routing,
- status machine integration.

### `src/main/skills`

Owns skill scanning and parsing:

- skill roots,
- `SKILL.md` parser,
- skill metadata normalization,
- skill prompt context generation.

### `src/main/profiles`

Owns Agent Profile and Agent Pack logic:

- profile CRUD,
- profile default skill links,
- profile import/export,
- profile snapshot generation when creating an agent,
- Agent Pack metadata inspection,
- Agent Pack installation boundaries,
- Agent Pack validation status.

This module may read package metadata through approved main-process file access, but it must not execute Agent Pack scripts during inspection.

### `src/main/security`

Owns safety enforcement:

- command risk rules,
- permission policies,
- secret redaction,
- safe command gates,
- audit event creation.

### `src/main/tasks`

Owns task lifecycle services that coordinate task records, agent assignment, and event emission.

### `src/main/meetings`

Owns meeting orchestration and persistence coordination.

### `src/main/integrations`

Owns optional V2 boundaries such as MCP bridge, GitHub integration, plugins, and external providers.

## Preload Boundary

The preload module exposes `window.codexOffice`.

Rules:

- expose explicit functions only,
- do not expose raw IPC objects,
- do not expose raw Node APIs,
- validate or type all payloads,
- return plain JSON-serializable data.

## Renderer Modules

### `src/renderer/office`

Owns PixiJS rendering:

- office layout,
- background objects,
- agent sprites,
- click and drag interactions,
- animation mapping from agent status.

It reads state from renderer stores and writes user interactions through store actions that call preload APIs.

### `src/renderer/components`

Owns React UI:

- app shell,
- agent detail drawer,
- chat components,
- create-agent dialog,
- skill drawer,
- profile editor,
- Agent Pack review/install screen,
- task board,
- timeline,
- meeting room,
- permission dialog.

### `src/renderer/stores`

Owns Zustand stores for renderer state:

- agents,
- sessions,
- messages,
- skills,
- tasks,
- meetings,
- profiles,
- Agent Packs,
- events,
- settings,
- UI selection.

Stores may call `window.codexOffice`. They must not import main-process services.

## Shared Modules

### `src/shared/types`

Contains serializable domain types:

- `Agent`,
- `AgentSession`,
- `AgentStatus`,
- `AgentEvent`,
- `Skill`,
- `Task`,
- `Meeting`,
- `TimelineEvent`,
- settings types.

### `src/shared/ipc`

Contains IPC request and response contracts, channel names, and payload schemas.

### `src/shared/validation`

Contains reusable payload validators that can run in preload, main, or tests.

## Ownership Rules

- Database writes happen only in main-process services or repositories.
- Runtime processes are started only by runtime adapters in main.
- Skill files are read only by main-process skill services.
- Permission checks happen before any app-controlled command executes.
- Renderer owns presentation and user interaction only.
- Cross-process data must be serializable and schema-validated.

## Forbidden Coupling

- Renderer importing `src/main/*`.
- Renderer importing `fs`, `path`, `child_process`, SQLite clients, or Electron main APIs.
- Runtime adapters importing React or renderer stores.
- Database repositories importing renderer components.
- PixiJS office code directly spawning processes or reading files.
- IPC handlers containing large business logic instead of calling services.
