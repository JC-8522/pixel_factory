# 2026-06-17 Task 01-13 Product / Architecture / Extensibility Review

## Review Scope

This is a second-pass review of Tasks 01-13 against:

- `product_design.md`
- `docs/architecture.md`
- `docs/system_architecture.md`
- `docs/domain_model.md`
- `docs/product_view.md`
- `docs/mvp_scope.md`
- `task/00_task_index.md`
- `task/01_architecture_and_scope.md` through `task/13_task_board_and_activity_timeline.md`
- current source modules under `src/main`, `src/renderer`, and `src/shared`

Task 14 is not part of the requested Task 01-13 assessment, but the current branch already includes a Meeting Room foundation. It is mentioned only where it affects the current product shape.

## Executive Verdict

Tasks 01-13 are broadly aligned with the product design, architecture design, and extensibility direction.

The product should be understood as a local Agent Operating System for one-person companies, not as an AI group chat tool. The current implementation has moved beyond a process viewer into an early Agent OS with a visual Human Console:

- the human user is treated as the manager,
- agents are visible in a pixel office / mission control surface,
- agents can be created from the app,
- agents can be personalized with profiles and skills,
- individual chat and run history exist,
- task board and activity timeline are visible,
- token usage and estimated cost are visible to the manager,
- key architecture boundaries now exist in code.

The main caveat is that several components are still "thin V1 foundations" rather than complete mature systems. This is acceptable for Tasks 01-13, but it should remain visible in planning:

- Task Engine exists, but full DAG dependencies and automated review-loop task execution are not complete.
- Domain event normalization exists through audit/event records, but there is not yet a centralized Event Normalizer / Domain Event Bus.
- Permission Policy Engine is still deferred to Task 17; permission presets exist in the model, but enforcement is not complete.
- Agent Health is useful, but heartbeat/last-error/process-liveness semantics are still basic.
- Manager Cost Dashboard shows usage and estimated cost, but model price configuration and time/workspace breakdown are incomplete.
- `docs/mvp_scope.md` was refreshed after this review so Task 12-14 status and the core architecture risks are current.

## Task 01-13 Alignment Matrix

| Task | Product Design Alignment | Architecture Alignment | Extensibility Assessment | Notes |
| --- | --- | --- | --- | --- |
| 01 Architecture And Scope | Aligned. Converts product design into MVP/V1/V2 roadmap and module boundaries. | Strong. Establishes Human Console, Agent Registry, Orchestration, Task Engine, Message Router, Context / Memory, Permission Policy, Audit, Event Logs, Runtime Adapter Layer. | Strong. Gives later tasks a stable vocabulary and ownership map. | `docs/mvp_scope.md` has now been refreshed to match current implementation status. |
| 02 Project Scaffold | Aligned. Uses Electron, React, TypeScript, Vite, PixiJS, Zustand, local persistence direction. | Strong. Main/preload/renderer separation is present. | Good. Stack supports local-first desktop and future provider adapters. | No major mismatch. |
| 03 Database Event Store | Aligned. Covers agents, sessions, messages, skills, tasks, meetings, events, token usage. | Strong. Repositories keep persistence behind main-process boundaries. | Good. `sql.js` is isolated enough to swap later. | Full workspace scoping is still future V2. |
| 04 IPC And Renderer State | Aligned. Provides typed `window.codexOffice` API and Zustand stores. | Good. Preload is a narrow bridge rather than exposing raw Electron/Node. | Good. IPC contracts can expand for Agent Packs, settings, permissions, and integrations. | Some renderer components still call `window.codexOffice` directly where a store could be cleaner, but this is acceptable for current scope. |
| 05 Agent Runtime Interface And Mock | Aligned. Provides deterministic mock runtime for UI/database/testing. | Strong. Runtime Adapter Layer exists and does not own product UI. | Strong. Mock, Codex CLI, attach mode, MCP, and future providers can share the interface. | Good foundation. |
| 06 Codex CLI Spawn Runtime | Aligned. Supports app-controlled spawned mode, the MVP priority in product design. | Good. Runtime adapter is separate from UI and persistence. | Good. Real provider support can expand without changing renderer surfaces. | Existing-session attach/control remains V2. |
| 07 Agent Status State Machine | Aligned. Maps product statuses such as thinking, running command, waiting user input, completed, stopped. | Good. Product status is separated from raw runtime logs. | Good. More provider log patterns can be added. | Rich animation mapping is still basic in UI. |
| 08 Skill System | Aligned. Scans skills, parses `SKILL.md`, assigns skills, injects skill context. | Good. Skills feed Context / Memory and Agent Registry instead of being only UI labels. | Good. Supports future Agent Packs and skill marketplace/import. | Create Agent skill list can get long; search/filter/collapse is now documented as polish. |
| 09 Pixel Office View | Aligned. PixiJS office renders agents and persists positions. | Good. Human Console owns the visual surface. | Good. Can add zones, animations, themes later. | Visual state animation is still simpler than full product vision. |
| 10 Agent Detail And Chat | Aligned. Click agent, inspect status/logs/skills, send messages, persist conversation. | Good. Uses Message Router/runtime path for chat behavior. | Good. Future attach mode can reuse the chat surface. | Rename/open terminal/files touched are not complete yet. |
| 11 Agent Profiles And Personalization | Strongly aligned. Implements personalization beyond skills: role, persona, instructions, defaults, permission mode, workspace scope, tool access, validation, collaboration, visual identity. | Strong. Profile snapshot generation belongs in main process and capability matrix is model-backed. | Strong. Profiles are a key foundation for Agent Packs and reusable agent creation. | Good fit with open-source sharing vision. |
| 12 Create Agent Flow | Strongly aligned. Users can create agents with role, working directory, runtime, model/profile, skills, permission, auto-run, initial task, and Manager Agent role. | Strong. Renderer sends intent; main process generates profile snapshot, applies defaults, starts runtime, routes initial task. | Strong. Clean path for future runtime providers and Agent Packs. | Skill selector UX needs search/filter/collapse. |
| 13 Task Board And Activity Timeline | Aligned. Board columns, create/assign/move tasks, timeline filters, health, run history, cost dashboard are present. | Good. Task Engine owns assignment/status events; Audit/Event Logs feed timeline. | Medium-good. It is an extensible V1 base, but full DAG/dependencies/review-loop automation and price configuration remain future work. | Product is usable for manager-level task visibility now. |

## Product Design Coverage Through Task 13

| Product Feature | Current Status | Review |
| --- | --- | --- |
| Local desktop app | Supported | Electron app runs locally with main/preload/renderer separation. |
| Local Codex process discovery | Partially supported | Runtime discovery path exists. Full attach/control of arbitrary existing sessions is V2. |
| Pixel office | Supported | Agents render as pixel workers; position persists. |
| Agent detail panel | Supported | Shows identity/status/runtime/workspace/skills/log/chat surface. Some actions remain future. |
| Individual chat | Supported | Spawned mode chat persists messages and runtime responses. |
| Create new agent | Supported | Full create dialog with profile, skills, model, permission, auto-run, initial task. |
| Manager Agent role | Supported | User can create a Manager Agent role, while human authority remains separate by design. |
| Skill assignment | Supported | Skill scan, parse, assign, remove, and prompt-context injection exist. |
| Agent Profiles | Supported | Profile library, CRUD, duplicate, import/export path, capability matrix, snapshot generation. |
| Task board | Supported | Backlog, Assigned, In Progress, Waiting Review, Done, Failed are visible and usable. |
| Activity timeline | Supported | Event filters by agent/task/type are visible. |
| Agent Health | Supported as V1 base | Shows visible status/session/runtime duration; richer heartbeat/process-liveness can improve later. |
| Run History / Session Archive | Supported as V1 base | Shows sessions, prompts, messages, tokens, and cost summary. |
| Manager Cost Dashboard | Supported as V1 base | Shows token usage and estimated cost by agent; price configuration/time range is still future. |
| Permission presets | Partially supported | Presets exist in profile/create-agent models; full enforcement is Task 17. |
| Safety Permission Layer | Deferred | Correctly moved late for current self-use scope. |
| Agent Packs | Not yet supported | Task 15 is next. |
| Project Workspace Selector | Not yet supported | V2. |

## Current Supported Product Features And How Users Use Them

### 1. Launch The Local Office

User opens the Electron app. The Human Console shows the left navigation and the main Office view.

Supported user actions:

- view app mode/version,
- navigate between Office, Profiles, Tasks, and Meeting Room,
- scan skills,
- discover local/app-created agents.

### 2. See Agents In The Pixel Office

User uses the Office view to see agents as pixel workers.

Supported user actions:

- inspect agents visually,
- click an agent to open the detail drawer,
- drag an app-created agent to persist its office position,
- see status-driven visual differences at a basic level.

### 3. Inspect And Chat With One Agent

User selects an agent from the Office view.

Supported user actions:

- review role, status, runtime kind, workspace, task, and skills,
- read recent event/log stream,
- send an individual chat message,
- see persisted user/agent messages,
- stop app-controlled sessions where supported by the runtime path.

### 4. Scan And Assign Skills

User clicks Scan Skills or uses skill controls in agent/profile surfaces.

Supported user actions:

- scan local `SKILL.md` folders,
- see parsed skill name/category/description,
- assign or remove skills from agents,
- use assigned skills as prompt context during runtime work.

Current UX note:

- large skill lists need search, category filter, selected-only view, and collapsible sections. This is documented for polish.

### 5. Manage Agent Profiles

User opens Profiles.

Supported user actions:

- create reusable profiles,
- edit role/persona/instructions/default model/default permission/default auto-run/workspace/tool/memory/validation/collaboration/output/visual fields,
- duplicate or delete profiles,
- inspect capability matrix,
- export/import profile-shaped data,
- assign default skills to profiles.

### 6. Create A New Agent

User clicks Create Agent in Office.

Supported user actions:

- enter name, role, working directory, model/profile, runtime kind, permission mode, auto-run mode, and initial task,
- select `Manager Agent` as a role if desired,
- select an Agent Profile,
- override selected/default skills,
- pick a working directory through main-process dialog,
- create the agent and immediately see it in the office.

Architecture behavior:

- renderer sends user intent only,
- main process validates input,
- main process generates `profile_snapshot_json`,
- Orchestration creates agent and starts runtime,
- Message Router routes the initial task.

### 7. Manage Work In The Task Board

User opens Tasks.

Supported user actions:

- create a task,
- assign it to an agent,
- move it through Backlog, Assigned, In Progress, Waiting Review, Done, and Failed,
- add result summary for completed/failed states,
- inspect related events in Activity Timeline,
- inspect agent health, run history, and cost dashboard.

### 8. Review Activity Timeline

User uses the Activity Timeline panel inside Tasks.

Supported user actions:

- filter by agent,
- filter by task,
- filter by event type,
- inspect domain event payloads for task creation, task assignment, status changes, messages, meetings, and token usage.

### 9. Review Run History And Cost

User uses Run History and Manager Cost panels inside Tasks.

Supported user actions:

- select an agent,
- inspect sessions/runs,
- view prompts and messages,
- review token usage,
- see estimated cost and usage source.

### 10. Meeting Room Is Already Available On Current Branch

Although outside the requested Task 01-13 review, the current branch also includes the Task 14 foundation.

Supported user actions:

- create a meeting with title, goal, participants, moderator, output format, conversation mode, and flow rules,
- send manager message to all agents or one selected agent,
- run a visible developer -> reviewer -> developer review loop,
- inspect source/target/rule metadata,
- save summary,
- convert meeting output into a Task Board item.

## Architecture Mapping In Current Code

| Target Component | Current Code Evidence | Review |
| --- | --- | --- |
| Human Console | `src/renderer/App.tsx`, `OfficeCanvas`, `AgentDetailDrawer`, `TaskBoard`, `MeetingRoom`, profile components | Good. Product surfaces are visible and manager-oriented. |
| Agent Registry | `src/main/agentRegistry/agentRegistryService.ts`, `agents` repository | Good. Agent identity/capabilities are separate from runtime sessions. |
| Orchestration Center | `src/main/orchestration/agentOrchestrationService.ts`, meeting/task service calls | Good for create-agent; still thin for broader multi-step task workflows. |
| Task Engine / DAG | `src/main/taskEngine/taskEngine.ts` | Good V1 base for assignment/status; DAG/dependencies are not complete. |
| Message Router | `src/main/messageRouter/messageRouter.ts`, meeting message routing metadata | Good for direct messages and meeting metadata; runtime delivery for agent-to-agent meeting messages is still a future expansion. |
| Context / Memory | `src/main/context/contextBuilder.ts`, profile snapshots, skill prompt context | Good base. Durable memory remains future. |
| Permission Policy Engine | profile/create-agent permission fields, runtime safety hook direction | Partial. Full policy engine and approval UI remain Task 17. |
| Audit Engine | `src/main/audit/auditEngine.ts`, `events` repository, task/meeting domain events | Good base. Needs richer event normalizer and explanation taxonomy later. |
| Event Logs | `events`, runtime persistence, timeline UI | Good. Stores facts and domain event payloads. |
| Runtime Adapter Layer | `AgentRuntime`, `MockAgentRuntime`, `CodexCliRuntime`, `RuntimeRegistry` | Strong base for future attach/MCP providers. |
| Local Persistence | `sql.js` database client, migrations, repositories | Good. Repository boundary supports future native SQLite swap. |

## Extensibility Assessment

### Strengths

- The architecture vocabulary from Task 01 is now visible in code, not just documentation.
- Runtime providers are replaceable because the renderer talks through IPC/stores rather than direct process APIs.
- Agent Profiles give a strong foundation for Agent Packs.
- Meeting workflow rules and conversation types are now separable from the Meeting Room UI.
- Task Board consumes task APIs and event records rather than parsing provider logs directly.
- Token usage is stored as raw records and summarized for manager visibility.
- Local persistence is behind repositories, so database implementation can evolve.

### Core Risks / Gaps To Track

The agreed core risks are the platform areas that determine whether the office can become safe, inspectable, and extensible as agent autonomy increases.

1. Task State Machine / Task Engine
   - Current gap: task status changes exist, but full DAG behavior, transition rules, retry rules, review loops, and manager escalation are not complete.
   - Architecture direction: Task Board remains a UI surface; Task Engine owns task policy and workflow progression.
2. Message Router
   - Current gap: individual chat and meeting metadata exist, but durable route records and live agent-to-agent delivery are still incomplete.
   - Architecture direction: direct, broadcast, addressed, and workflow-generated messages should share one route model.
3. Permission Policy
   - Current gap: profile/create-agent permission fields exist, but policy evaluation and approval UX are deferred.
   - Architecture direction: every action that can modify local state should pass through permission evaluation and audit.
4. Execution Sandbox
   - Current gap: runtime working directory and permission mode exist, but workspace scoping, filesystem boundaries, and command isolation are not yet formal.
   - Architecture direction: app-controlled runtime execution should have explicit safe boundaries before broader automation.
5. Event Logs / Audit Trail
   - Current gap: event persistence and timeline filters exist, but event naming, raw-vs-domain separation, and replay-ready retention need hardening.
   - Architecture direction: Event Logs store facts; Audit Engine explains why task transitions, message routes, permission decisions, and runtime actions happened.

Secondary gaps still matter, but they should be handled through the five core systems above:

- IPC handlers should continue moving complex workflows into application/domain services.
- Agent Health should use formal runtime/session events for heartbeat, process-liveness, last error, and last status transition.
- Manager Cost Dashboard should add model price config, time range filters, workspace filters, and clearer reported/estimated labels.

## Recommended Next Steps

1. Continue with Task 15: Agent Pack manifest, inspection, and reviewed install.
2. Before deeper integrations, define a formal domain event taxonomy for task, message route, permission, sandbox, and audit events.
3. Expand Task Engine from status updates into a real task workflow model with dependencies, review requirements, retry rules, stop conditions, and escalation conditions.
4. Make Message Router durable enough to reconstruct route decisions and support agent-to-agent delivery outside the Meeting Room UI.
5. Keep Permission Policy and Execution Sandbox on the runtime path so Task 17 can harden behavior without changing runtime adapter interfaces.
6. Add Create Agent skill-list search/filter/collapse as a Task 18 polish item or earlier if local skill libraries become hard to scan.

## Final Review Result

Task 01-13 satisfy the current product design direction and architecture direction for an early V1 local Agent OS for one-person companies.

The product is now usable as a manager-controlled local workspace:

- create and personalize agents,
- see them in an office,
- chat with them,
- assign skills,
- manage tasks,
- inspect history and timeline,
- monitor token cost,
- and use the initial meeting workflow foundation already present on the branch.

The remaining work is mostly about hardening and expanding the foundations:

- Agent Packs,
- attach/MCP integrations,
- project workspace scoping,
- task state machine / DAG hardening,
- message routing hardening,
- full permission policy,
- execution sandbox,
- event log / audit taxonomy,
- final QA and packaging.
