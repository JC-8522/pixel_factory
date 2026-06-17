# Task Index: Local Codex Office

Use these tasks in order. Each task is written as an agent-readable implementation prompt. Do not skip ahead unless the previous task's validation goal is satisfied.

## Product Goal

Build a local Agent Operating System for one-person companies. Local Codex Office lets a solo founder, builder, or independent operator create, configure, coordinate, audit, and safely run specialized Codex agents as a visible digital team.

The pixel office is the Human Console / Mission Control layer of the system. It visualizes local Codex agents as pixel-art workers so the user can understand organization, status, work ownership, cost, meetings, and risk at a glance. The product is not primarily an AI group chat tool; chat and meetings are surfaces inside a broader operating system.

Core moat: the product must help the manager train agents into reusable digital employees. Skills, profiles, task history, review feedback, workflow templates, cost tracking, and event logs should compound into reusable company operating knowledge. Calling multiple agents is a feature; cultivating agents and reusable skills is the durable product advantage.

## Task Sequence

| Task | Status | Prompt | Purpose |
| --- | --- | --- | --- |
| 01 | Completed | `01_architecture_and_scope.md` | Define architecture, product slices, module boundaries, and delivery milestones. |
| 02 | Completed | `02_project_scaffold.md` | Create the Electron, React, TypeScript, Vite, PixiJS, Zustand, SQLite project foundation. |
| 03 | Completed | `03_database_event_store.md` | Implement SQLite-compatible schema, migrations, repositories, event recording, and token usage persistence. |
| 04 | Completed | `04_ipc_and_renderer_state.md` | Implement secure Electron IPC APIs, preload bridge, renderer state stores, and token usage query APIs. |
| 05 | Completed | `05_agent_runtime_interface_and_mock.md` | Define `AgentRuntime` and implement a deterministic mock runtime. |
| 06 | Completed | `06_codex_cli_spawn_runtime.md` | Implement app-controlled Codex CLI spawning, stopping, and log streaming. |
| 07 | Completed | `07_agent_status_state_machine.md` | Map runtime events and logs into agent statuses and timeline events. |
| 08 | Completed | `08_skill_system.md` | Scan local skills, parse `SKILL.md`, assign skills, and inject skill context into prompts. |
| 09 | Completed | `09_pixel_office_view.md` | Render the PixiJS office and pixel agents with persistent positions. |
| 10 | Completed | `10_agent_detail_and_chat.md` | Build agent detail drawer, chat UI, response streaming, and message persistence. |
| 11 | Completed | `11_agent_profiles_and_personalization.md` | Build reusable personalized Agent Profiles and capability matrix. |
| 12 | Completed | `12_create_agent_flow.md` | Build the full create-agent workflow with Agent Profile selection and main-process application service coordination. |
| 13 | Completed | `13_task_board_and_activity_timeline.md` | Add project task board, domain-event timeline, run history, agent health, and manager cost dashboard. |
| 14 | Completed | `14_meeting_room_group_chat.md` | Add meeting-room multi-agent conversation backed by a reusable conversation workflow engine. |
| 15 | Next | `15_agent_pack_manifest_and_install.md` | Add source-readable Agent Pack manifest, inspection, reviewed install, and future workflow-template packaging. |
| 16 | Planned | `16_attach_mode_mcp_and_v2_integrations.md` | Add existing-session attach mode, MCP extension points, domain-event normalization, and V2 integration hooks. |
| 17 | Planned | `17_local_safety_permission_layer.md` | Harden the existing runtime safety hook into command risk detection, permission prompts, and audit logging. |
| 18 | Planned | `18_qa_polish_packaging.md` | Complete tests, visual polish, accessibility, packaging, and release readiness. |

## Current Work

Start from `15_agent_pack_manifest_and_install.md`.

Architecture direction for upcoming tasks:

- Use `docs/system_architecture.md` as the first-class component reference.
- Use `docs/domain_model.md` as the target layering reference.
- Use `docs/product_view.md` as the product view and feature ownership reference.
- Treat the next core platform risks as: Task State Machine / Task Engine, Message Router, Permission Policy, Execution Sandbox, and Event Logs / Audit Trail.
- Do not let new feature work bypass those five systems with one-off renderer or IPC-only logic.
- Keep renderer components focused on presentation; route shared data/actions through Zustand stores and `window.codexOffice`.
- Keep IPC handlers thin; move cross-module workflows into main-process application services.
- Keep reusable product rules in domain services that can be tested without Electron renderer code.
- Normalize provider-specific runtime events into stable domain events for task board, meeting room, timeline, usage, and audit UI.
- Treat Agent Profiles as the canonical reusable configuration source for agent creation.
- Treat the meeting room as a UI over a reusable conversation workflow engine.
- Keep token usage raw records separate from cost summaries and model price configuration.
- Keep the safety hook on the runtime path, with full approval UX deferred to Task 17.
- Keep Agent Registry separate from Runtime Registry.
- Keep Message Router separate from chat UI.
- Keep Task Engine / DAG separate from task board UI.
- Keep Audit Engine separate from raw Event Logs.

Tasks 01-10 are complete because the merged foundation and runtime/UI branch include:

- architecture, MVP/V1/V2 scope, module boundaries, and task plan,
- Electron + React + TypeScript + Vite scaffold,
- `sql.js` database client, schema, migrations, repositories, and tests,
- typed IPC contracts, preload bridge, renderer Zustand stores, and IPC tests,
- token usage and estimated cost persistence/query foundation for manager cost visibility,
- `AgentRuntime` interface, deterministic `MockAgentRuntime`, runtime registry, runtime IPC operations, runtime event persistence, and tests for streaming, status, stop, messages, events, and token usage,
- Codex CLI runtime process spawning, log streaming, process discovery, token usage parsing/estimation, and fake-process tests,
- agent status state machine for runtime events and common log patterns,
- local skill scanning, `SKILL.md` parsing, skill assignment/removal, and skill prompt context injection,
- PixiJS office canvas with clickable and draggable pixel agents,
- agent detail drawer, logs, skill badges, and individual chat connected to runtime sessions.

Task 11 is complete because the current branch includes:

- Agent Profile repositories and service boundaries,
- profile CRUD, duplicate, delete, import/export data path, and immutable snapshot generation,
- profile default skill assignment and capability matrix support,
- typed profile IPC contracts, preload APIs, validators, and renderer Zustand store,
- Agent Profile Library, Profile Editor, and Capability Matrix UI in the Human Console,
- thin Agent Registry, Orchestration Center, Message Router, Context / Memory, Task Engine, and Audit Engine code boundaries used by existing flows,
- tests for profile capability matrix, snapshot immutability, export/import, and profile IPC handlers.

Task 12 is complete because the current branch includes:

- create-agent dialog and Agent Profile picker in the Human Console,
- form fields for name, role including Manager Agent, working directory, runtime, model profile, permission mode, auto-run mode, skill overrides, and initial task,
- working directory picker IPC through Electron dialog,
- main-process create-agent orchestration that generates profile snapshots, applies profile defaults, assigns selected/default skills, starts runtime sessions, and routes the initial task through Message Router,
- tests for create-agent form validation and profile-based runtime creation,
- compatibility fixes for existing local databases missing token usage tables/columns,
- unique mock runtime event IDs across app restarts,
- human-style app verification with Electron CDP interaction and focused screenshots.

Tasks 13 and 14 are complete because the current branch includes:

- Task Board, Task Card, Activity Timeline, Agent Health, Run History, and Manager Cost Dashboard UI in the Human Console,
- task creation, assignment, status transitions, result summaries, event-backed timeline filtering, and token usage cost visibility,
- domain events for task creation, task assignment, task status movement, meeting creation, routed meeting messages, and saved summaries,
- Meeting Room, Create Meeting dialog, editable flow rules, persisted participants, manager broadcast/addressed messages, routed agent-to-agent review loop messages, saved moderator summary, and meeting-output-to-task conversion,
- reusable conversation workflow types and main-process workflow evaluator for developer -> reviewer -> developer loops,
- Electron CDP acceptance script and screenshots for Task Board and Meeting Room.

## Completion Rule

The final product is complete only when all tasks pass their validation goals and the app can be run locally as a packaged desktop app with:

- app-controlled Codex agents,
- pixel office visualization,
- individual chat,
- skill assignment,
- local persistence,
- task board,
- activity timeline,
- token usage and manager cost visibility,
- meeting room multi-agent conversation and future agent-to-agent review loops,
- Agent Profiles,
- Community Agent Pack import/install boundaries,
- attach/MCP extension points,
- safety permission layer,
- and verified tests.

## Verification Standard For Future Development

Every implementation task must include complete verification before it is considered done:

- run TypeScript typecheck,
- run lint,
- run relevant unit/integration tests,
- run production build when app code changes,
- start the Electron app when UI, preload, IPC, runtime, or renderer code changes,
- confirm the app window renders a real UI rather than a blank or black screen,
- inspect captured dev logs for renderer errors,
- verify at least one affected user flow manually or with an automated UI check where available.

For all remaining tasks, completion also requires human-style app acceptance:

- use `skills/electron-desktop-debug/SKILL.md` as the verification workflow,
- launch the desktop app from a clean dev run,
- interact with the implemented feature as a human user would, including clicks, form input, navigation, and state inspection,
- capture a focused app-window screenshot that proves the affected UI rendered,
- verify the feature result in the UI, not only through unit tests or database records,
- inspect Electron dev logs for renderer, preload, IPC, and runtime errors after the interaction,
- report the screenshot path, verification commands, and any automation limitations.

If screenshot capture is not available or is unsafe because it would capture unrelated desktop content, the task must still report the limitation and use narrower evidence such as Electron dev logs, renderer console forwarding, process health, and user-confirmed visual inspection. A task may not be marked complete if neither visual evidence nor a clear environment limitation is recorded.
