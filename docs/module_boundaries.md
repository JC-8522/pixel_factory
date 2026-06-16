# Module Boundaries

## Directory Layout

```text
src/
  main/
    index.ts
    windows/
    ipc/
    services/
    domain/
    events/
    db/
    runtime/
    profiles/
    agentPacks/
    usage/
    skills/
    security/
    tasks/
    meetings/
    workflows/
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
- call main-process application services,
- return serializable data,
- broadcast sanitized domain updates.

IPC handlers should stay thin. They should not contain profile snapshot generation, runtime routing policy, task state transitions, meeting flow orchestration, token cost aggregation, or permission policy logic.

### `src/main/services`

Owns application services that coordinate complete user actions across domain services, repositories, runtime adapters, event publishing, and safety hooks.

Examples:

- create agent from profile,
- spawn runtime session,
- send a message to an agent,
- assign a task,
- start a meeting workflow,
- record token usage and update summaries.

Application services may call repositories, runtime adapters, domain services, and safety hooks. They must not import renderer code.

### `src/main/domain`

Owns reusable product rules that are not tied to Electron IPC.

Examples:

- profile snapshot generation rules,
- capability matrix calculation,
- task status transition rules,
- meeting flow rule evaluation,
- usage cost estimation,
- permission policy decisions.

Domain code should be easy to unit test without launching Electron.

### `src/main/events`

Owns event normalization and product-level event publishing.

Responsibilities:

- convert runtime-provider signals into product-level domain events,
- keep `RuntimeEvent` details separate from `DomainEvent` behavior,
- persist audit/timeline events through repositories,
- broadcast sanitized event updates to renderer subscribers.

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
- raw runtime event routing,
- status machine integration.

Runtime adapters should emit provider signals and avoid owning product workflows such as task transitions, meeting handoffs, or cost dashboard aggregation.

### `src/main/skills`

Owns skill scanning and parsing:

- skill roots,
- `SKILL.md` parser,
- skill metadata normalization,
- skill prompt context generation.

### `src/main/profiles`

Owns Agent Profile logic:

- profile CRUD,
- profile default skill links,
- profile import/export,
- profile snapshot generation when creating an agent,
- profile capability metadata.

Agent Profile is the canonical reusable configuration source for agent creation. Runtime prompt context, default skills, permission presets, collaboration behavior, and visual identity should come from the generated profile snapshot.

### `src/main/agentPacks`

Owns Agent Pack logic:

- Agent Pack metadata inspection,
- Agent Pack installation boundaries,
- Agent Pack validation status.

This module may read package metadata through approved main-process file access, but it must not execute Agent Pack scripts during inspection. Installed Agent Pack profiles become normal local Agent Profiles.

### `src/main/usage`

Owns token usage and cost tracking:

- raw runtime usage records,
- usage summaries by agent, session, task, model, workspace, and time range,
- price configuration for estimated cost,
- source labeling as `reported`, `estimated`, or `manual`.

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

Owns meeting metadata, participants, messages, notes, and meeting persistence coordination.

### `src/main/workflows`

Owns reusable conversation workflow orchestration.

Responsibilities:

- user-to-many-agent routing,
- user-to-specific-agent routing,
- agent-to-agent review requests,
- feedback routing,
- stop-condition evaluation,
- max-round enforcement,
- manager escalation conditions,
- transition/audit persistence.

Meeting room should use this module instead of embedding all orchestration rules inside the meeting UI.

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

Components should prefer store actions over direct `window.codexOffice` calls. Direct preload calls are acceptable only for small, isolated UI utilities where no shared state is involved.

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
- Product workflows live in application services or domain services, not in IPC handlers or renderer components.
- Conversation workflow logic must be reusable outside the meeting room UI.
- Token usage storage must keep raw usage records separate from cost summaries and price configuration.

## Forbidden Coupling

- Renderer importing `src/main/*`.
- Renderer importing `fs`, `path`, `child_process`, SQLite clients, or Electron main APIs.
- Runtime adapters importing React or renderer stores.
- Database repositories importing renderer components.
- PixiJS office code directly spawning processes or reading files.
- IPC handlers containing large business logic instead of calling services.
- React components directly implementing meeting orchestration, task transition rules, or profile snapshot rules.
- Runtime adapters updating task board, meeting room, or cost dashboard state directly.
