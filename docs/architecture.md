# Local Codex Office Architecture

## Purpose

Local Codex Office is a local Agent Operating System for one-person companies. It helps a solo founder, builder, or independent operator create, configure, coordinate, audit, and safely run specialized Codex agents as a visible digital team.

The pixel office is the Human Console / Mission Control layer of the OS. It visualizes Codex agents as pixel-art office workers so the human manager can inspect status, assign work, review cost, coordinate meetings, and audit local execution. Chat and meetings are important interaction surfaces, but the product is broader than an AI group chat tool.

The product moat is the agent training loop, not raw multi-agent invocation. Architecture should preserve durable places to turn work into reusable company knowledge: Agent Profiles for digital employee identity, Skills for reusable operating procedures, Task Engine for repeatable workflows, Message Router for coordinated handoffs, Audit/Event Logs for reviewable history, and Context / Memory for continuity and business memory.

The architecture should model reusable operating knowledge as three asset classes:

- Skill Assets: reusable capabilities, SOPs, checklists, scripts, references, and specialist know-how.
- Workflow Assets: reusable task flows, review loops, routing rules, handoff patterns, stop conditions, and manager-escalation rules.
- Business Memory Assets: durable company, customer, project, decision, preference, constraint, metric, competitor, brand, and historical context.

Context / Memory owns business-memory retrieval and injection. Business Memory Assets should be curated and inspectable, not treated as unstructured chat transcript accumulation.

The application is local-first. It is not a cloud service. Local process control, filesystem reads, log streaming, skill scanning, SQLite persistence, and safety checks all live in the Electron main process.

Primary companion documents:

- `docs/system_architecture.md` defines the major system components and their responsibilities.
- `docs/domain_model.md` defines target layering, event concepts, workflow concepts, and domain rules.
- `docs/module_boundaries.md` maps architecture components to implementation modules.
- `docs/product_view.md` defines product views, supported features, ownership types, and stages.

## Technology Stack

- Electron for desktop shell and local system access.
- React for renderer UI.
- TypeScript for all application code.
- Vite for renderer development and build.
- PixiJS for the pixel office canvas.
- Zustand for renderer state stores.
- SQLite-compatible local persistence. MVP uses `sql.js` to avoid native build friction on Windows and Node 24; repository boundaries should allow swapping to native SQLite later.
- Node.js APIs only inside Electron main process and controlled preload code.

## Process Model

The app runs with a privileged Electron main process, a constrained preload bridge, and an unprivileged renderer process. The renderer owns presentation, while the main process owns local system access, persistence, runtime control, and safety boundaries.

## Target Layering

The target architecture uses this flow:

```text
Renderer Components
  -> Zustand Stores / renderer API helpers
  -> window.codexOffice preload API
  -> thin IPC handlers
  -> main-process application services
  -> domain services
  -> repositories, runtime adapters, safety hooks, and local providers
```

IPC handlers should validate requests and delegate. Product workflows should live in application services, not inside React components or IPC handler bodies.

The detailed domain model is documented in `docs/domain_model.md`.

## Core System Components

The system architecture is organized around these first-class components:

| Component | Role |
| --- | --- |
| Human Console | The manager-facing mission control surface for observing agents, creating agents, chatting, assigning work, reviewing cost, approving actions, and understanding the state of the one-person company. |
| Agent Registry | The source of truth for agent identity, profile snapshot, skills, capability metadata, status, runtime kind, and active session link. |
| Orchestration Center | The application brain that coordinates multi-step workflows across agents, tasks, meetings, messages, context, permissions, audit, and runtime adapters. |
| Task Engine / DAG | The workflow execution model for task states, dependencies, review loops, stop conditions, and escalation rules. |
| Message Router | The routing layer for direct user-agent messages, broadcast messages, addressed meeting messages, and agent-agent feedback. |
| Context / Memory | The context builder and memory asset layer for profile snapshots, assigned skills, workspace context, business memory, memory preferences, task context, and meeting context. |
| Permission Policy Engine | The policy layer for command risk, permission presets, allow rules, deny decisions, and safe command gates. |
| Audit Engine | The product-level explainability layer for domain events, timeline records, transition reasons, and permission decisions. |
| Event Logs | Durable storage for raw runtime events, domain events, timeline events, and replay inputs. |
| Runtime Adapter Layer | Provider integration for mock runtime, Codex CLI runtime, attach mode, MCP, and future providers. |

These components are documented in detail in `docs/system_architecture.md`.

## User And Agent Role Model

The human user is the default manager of the office. User-owned actions include creating agents, approving risky local operations, assigning tasks, reviewing outputs, and changing product settings.

The system also supports a user-created `Manager Agent` role. A Manager Agent can plan work, coordinate other agents, summarize meetings, and suggest assignments, but it is still an agent controlled by the same runtime and permission rules as every other agent.

Do not treat a Manager Agent as the human user. Permission approvals, app settings, and final local execution authority remain with the human manager.

## Agent Personalization Model

Agents can be personalized through reusable `Agent Profiles`. A profile is not a running process; it is a template-like configuration for creating an agent instance.

An Agent Profile can define:

- role,
- persona and working style,
- long-term operating instructions,
- default model/profile,
- permission mode,
- default workspace or project scope,
- tool access/capabilities,
- memory and user preferences,
- startup workflow,
- validation policy,
- collaboration behavior,
- communication style,
- risk tolerance,
- output format preferences,
- visual identity,
- default assigned skills.

When an agent is created from a profile, the app should store both `profile_id` and `profile_snapshot_json`. The snapshot preserves the exact configuration used at creation time even if the reusable profile changes later.

Skills remain one part of personalization, but they are not the whole personalization model.

## Community Agent Pack Vision

Long term, Local Codex Office should support shareable `Agent Packs` for the open-source community.

An Agent Pack is a source-readable package that can include:

- one or more Agent Profiles,
- skill dependencies,
- optional bundled skills,
- visual identity assets,
- startup workflows,
- permission manifest,
- validation tests,
- author and version metadata.

The app must prioritize transparent, inspectable packages over opaque binaries. Before installing a community Agent Pack, users should be able to inspect requested permissions, included scripts, skill dependencies, author metadata, version history, checksums/signatures, and validation status.

## Database Engine Decision

The product model is SQLite: tables, migrations, repositories, foreign-key style relations, and local file persistence.

For MVP implementation, use `sql.js` as the SQLite-compatible embedded engine. This avoids native module build friction during early cross-platform development, especially on Windows and bundled Node runtimes. The main-process database boundary must remain narrow enough that a future task can replace `sql.js` with native SQLite or another SQLite driver without changing renderer code or IPC contracts.

### Electron Main Process

The main process owns all privileged work:

- start and stop Codex processes,
- discover app-created and local Codex sessions,
- stream stdout, stderr, and local logs,
- scan local skill folders,
- read and write SQLite data,
- manage runtime adapters,
- evaluate command risk,
- request or store permission decisions,
- open local folders or terminals through explicit IPC actions.

### Preload Process

The preload script exposes a narrow typed bridge:

- no raw `ipcRenderer` passthrough,
- no raw filesystem or process APIs,
- no dynamic method forwarding,
- all payloads validated by shared contracts.

### Renderer Process

The renderer owns presentation and interaction:

- React app shell,
- PixiJS office canvas,
- agent detail drawer,
- chat UI,
- skill panel,
- task board,
- meeting room,
- activity timeline,
- settings views,
- Zustand stores that call preload APIs.

The renderer must not import `fs`, `child_process`, `path`, SQLite clients, Electron main modules, or direct Codex runtime modules.

## High-Level Data Flow

1. User creates or selects an agent in the renderer.
2. Renderer store calls a typed preload API.
3. Preload sends a validated IPC request to main.
4. IPC handler delegates to an application service.
5. Application service coordinates domain services, repositories, runtime adapters, and safety hooks.
6. Runtime adapter emits runtime events.
7. Event normalizer converts provider-specific runtime events into product-level domain events where needed.
8. Main process persists messages, sessions, status changes, token usage, and timeline events.
9. Main process broadcasts sanitized updates back to renderer subscribers.
10. Zustand stores update React panels and PixiJS agent sprites.

## Event Model

The architecture distinguishes two event levels:

- `RuntimeEvent`: a raw or lightly normalized provider signal from mock runtime, Codex CLI, attach mode, MCP, or a future provider.
- `DomainEvent`: a product-level event used by task board, meeting room, timeline, usage dashboard, audit UI, and renderer stores.

MVP can store both in the existing `events` table, but the source and category must be explicit in event type or payload. As the app grows, event normalization should live in main-process services so renderer code does not depend on Codex CLI output shapes.

## Agent Profile Configuration Source

Agent Profiles are the canonical source for reusable agent configuration. The create-agent flow should generate an immutable `profile_snapshot_json` in the main process and use that snapshot for runtime prompt context, default skills, permission defaults, validation expectations, collaboration behavior, output preferences, and visual identity.

Profile snapshots prevent existing agents from changing silently when a reusable profile is edited later.

## Conversation Workflow Direction

The meeting room is a UI surface for multi-agent coordination inside the Agent OS. The reusable product capability is a conversation workflow engine.

Meeting orchestration should therefore be implemented as a main-process domain service that can later run developer -> reviewer -> developer loops from tasks, even when the meeting room UI is not open.

## Token Usage And Cost Direction

Token and cost tracking should separate:

- raw runtime usage records,
- durable summaries by agent, session, task, model, workspace, and time range,
- price configuration used for estimated cost.

Usage must show whether it is `reported`, `estimated`, or `manual`. Manager cost dashboards should label estimated cost clearly.

## Main Runtime Flow

MVP uses spawned mode:

1. User submits create-agent form.
2. Main process creates an `agents` record.
3. Main process creates a `sessions` record.
4. Main process builds prompt context from role, task, working directory, and assigned skills.
5. `CodexCliRuntime` starts a local Codex process.
6. stdout and stderr become runtime events.
7. the status machine maps events into visible agent statuses.
8. messages and events are persisted.
9. renderer updates the office view and detail drawer.

If the selected role is `Manager Agent`, the same runtime flow applies. The only difference is prompt context and UI labeling.

Mock runtime must be implemented before real Codex CLI runtime so UI, database, IPC, status transitions, and tests can be developed deterministically.

## Core Feature Roadmap

| Product Feature | MVP/V1/V2 Placement | Owning Area |
| --- | --- | --- |
| Local Codex agent discovery | MVP detects at least one local Codex process and app-created sessions; V2 adds full existing-session attach/control | Main runtime |
| Pixel office view | MVP basic, V1 improved animations/themes, V2 shared themes | Renderer PixiJS |
| Agent detail panel | MVP | Renderer UI + IPC |
| Individual chat | MVP spawned mode, V2 attach mode | Runtime + Renderer |
| Create new agent | MVP | Runtime + UI |
| Skill assignment | MVP basic, V1 import/marketplace | Skills + UI |
| Meeting room multi-agent conversation | V1 | Meetings + Runtime |
| Task board | V1 | Tasks + UI |
| Activity timeline | MVP event store, V1 richer filters | Events + UI |
| Local safety and permissions | Late hardening; presets exist earlier in profiles | Security + Runtime |
| MCP orchestration | V2 | Runtime bridge |
| GitHub PR integration | V2 | Integrations |
| Multi-project workspace | V2 | Settings + data model |
| Agent profiles and personalization | V1 | Profiles + UI + Runtime prompt context |
| Community Agent Packs | V2 install/import, V3 registry | Integrations + Security + Profiles |
| Agent Profile Library | V1 | Profiles + UI |
| Agent Capability Matrix | V1 | Profiles + Skills + UI |
| Agent Health | V1 | Runtime + Events + Usage + UI |
| Project Workspace Selector | V2 | Settings + data model |
| Run History / Session Archive | V1 | Sessions + Events + UI |
| Agent Pack Import Review Screen | V2 | Agent Packs + Security + UI |
| Token Usage & Cost Tracking | MVP mock usage, V1 manager dashboard | Runtime + Usage + Events + UI |

## Implementation Phases

### Phase 1: Foundation

- Electron, React, TypeScript, Vite project scaffold.
- Secure preload bridge.
- SQLite setup.
- `sql.js` MVP engine behind a repository boundary.
- Zustand stores.
- Minimal app shell.

### Phase 2: Runtime Pipeline

- `AgentRuntime` interface.
- `MockAgentRuntime`.
- `CodexCliRuntime`.
- event stream handling.
- token usage event shape and persistence.
- status machine.

### Phase 3: Office And Chat MVP

- PixiJS office canvas.
- clickable agent sprites.
- agent detail drawer.
- chat UI with streamed responses.
- message and event persistence.

### Phase 4: Skills MVP

- scan local skill roots.
- parse `SKILL.md`.
- display skill drawer.
- assign skill badges to agents.
- inject selected skill context into agent prompts.

### Phase 5: V1 Coordination

- permission approval layer.
- task board.
- activity timeline filters.
- meeting room group chat and multi-agent conversation orchestration.
- richer multi-agent support.
- agent profiles and personalization.
- local profile import/export.

## Meeting Room Orchestration Model

The meeting room is the first coordination surface for multiple agents. It must support direct human-manager-to-many-agent conversation, but it should not be limited to a passive chat room.

The architecture should leave room for editable agent-to-agent flows:

- developer agent produces work,
- reviewer, auditor, QA, or TL agent reviews the work,
- feedback is routed back to the developer agent,
- the developer agent revises,
- the loop stops when acceptance criteria are met, maximum rounds are reached, or a manager escalation rule fires.

Meeting orchestration should be rule-driven and inspectable. Rules should describe speaker order, addressed agent, review target, stop condition, escalation condition, and expected artifact. Runtime events and meeting messages should preserve enough metadata to reconstruct why one agent spoke after another.

### Phase 6: V2 Extension Points

- existing-session attach mode.
- MCP orchestration bridge.
- GitHub integration boundary.
- multi-project workspaces.
- Agent Pack installation from local folder or GitHub URL.
- plugin registry.
- timeline replay.
- shared office themes.

## Architectural Rules

- Use TypeScript shared types for IPC and runtime events.
- Keep UI state derived from persisted data plus runtime subscriptions.
- Treat SQLite as the source of truth for durable state.
- Treat runtime adapters as replaceable providers.
- Prefer domain event records for auditing and timeline behavior.
- All local system access must be mediated by main-process services.
- Any action that may execute or alter local state must pass through safety hooks.
- Keep IPC handlers thin; place cross-module workflows in application services.
- Keep domain rules testable without Electron renderer code.
- Keep `RuntimeEvent` provider details separate from product-level `DomainEvent` behavior.
- Keep `window.codexOffice` as an explicit preload API and route component calls through renderer stores where practical.
