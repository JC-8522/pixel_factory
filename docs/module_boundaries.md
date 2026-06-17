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
    audit/
    db/
    runtime/
    agentRegistry/
    orchestration/
    taskEngine/
    messageRouter/
    context/
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

Owns application services that coordinate complete user actions across domain services, repositories, runtime adapters, event publishing, and safety hooks. This is the implementation layer for the Orchestration Center.

Examples:

- create agent from profile,
- spawn runtime session,
- send a message to an agent,
- assign a task,
- start a meeting workflow,
- record token usage and update summaries.

Application services may call repositories, runtime adapters, domain services, and safety hooks. They must not import renderer code.

### `src/main/orchestration`

Owns the Orchestration Center implementation.

Responsibilities:

- coordinate complete product workflows,
- call Agent Registry for agent identity and capability state,
- call Task Engine for task/DAG state,
- call Message Router for message delivery,
- call Context / Memory before runtime execution,
- call Permission Policy Engine before local actions,
- call Audit Engine for explainability records.

It must not contain React code, raw SQL, or provider-specific runtime parsing.

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

### `src/main/audit`

Owns the Audit Engine.

Responsibilities:

- create product-level audit records,
- explain why workflow transitions happened,
- record permission decisions,
- record message routing reasons,
- record task state transition reasons,
- record meeting escalation reasons.

Audit Engine writes domain/audit events through `src/main/events` and repositories. It should not store raw provider logs as its only explanation source.

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

### `src/main/agentRegistry`

Owns the Agent Registry implementation.

Responsibilities:

- agent identity,
- role and profile snapshot references,
- assigned skills and capability metadata,
- current visible status,
- runtime kind,
- active session link,
- health summary inputs.

It may use repositories and domain services. It must not spawn processes directly.

### `src/main/taskEngine`

Owns Task Engine and future DAG behavior.

Responsibilities:

- task state machine,
- task dependencies,
- DAG node/edge model,
- review loops,
- retry rules,
- stop conditions,
- manager escalation conditions.

The task board UI should call task APIs; it must not implement task/DAG policy itself.

### `src/main/messageRouter`

Owns message addressing and delivery.

Responsibilities:

- human-to-agent messages,
- human-to-many-agent messages,
- agent-to-agent messages,
- meeting broadcasts,
- addressed meeting messages,
- review feedback routing,
- workflow-generated messages.

Message Router can route to runtime sessions but should not own task policy, profile policy, or permission policy.

### `src/main/context`

Owns Context / Memory.

Responsibilities:

- profile snapshot context,
- assigned skill context,
- workspace/project context,
- task context,
- meeting context,
- user preference context,
- durable memory records when implemented.

Context must be built in the main process from persisted data. Renderer-provided snapshots are not authoritative.

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

Owns Permission Policy Engine and safety enforcement:

- command risk rules,
- permission policies,
- secret redaction,
- safe command gates,
- audit event creation.

### `src/main/tasks`

Owns task record persistence coordination and task board-facing APIs.

Task execution policy and DAG rules belong in `src/main/taskEngine`.

### `src/main/meetings`

Owns meeting metadata, participants, messages, notes, and meeting persistence coordination.

### `src/main/workflows`

Owns reusable conversation workflow orchestration. This module may be implemented as part of Orchestration Center, but its rules must remain reusable outside the meeting room UI.

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
- Agent Registry owns agent identity and capability state; Runtime Registry only maps sessions to runtime adapters.
- Message Router owns message delivery and addressing; chat components only render and collect input.
- Task Engine owns task state and DAG behavior; task board components only render and request changes.
- Audit Engine owns explainability records; Event Logs own durable facts.

## Forbidden Coupling

- Renderer importing `src/main/*`.
- Renderer importing `fs`, `path`, `child_process`, SQLite clients, or Electron main APIs.
- Runtime adapters importing React or renderer stores.
- Database repositories importing renderer components.
- PixiJS office code directly spawning processes or reading files.
- IPC handlers containing large business logic instead of calling services.
- React components directly implementing meeting orchestration, task transition rules, or profile snapshot rules.
- Runtime adapters updating task board, meeting room, or cost dashboard state directly.
- Message Router deciding permission policy.
- Task Engine parsing Codex CLI provider logs directly.
- Agent Registry spawning child processes directly.
- Audit Engine depending only on stdout/stderr when a domain decision reason is available.
