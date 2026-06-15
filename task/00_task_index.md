# Task Index: Local Codex Office

Use these tasks in order. Each task is written as an agent-readable implementation prompt. Do not skip ahead unless the previous task's validation goal is satisfied.

## Product Goal

Build a local desktop application called Local Codex Office. It visualizes local Codex agents as pixel-art office workers, lets the user create and chat with agents, assign skills, manage tasks and meetings, monitor activity, and protect local execution with permission controls.

## Task Sequence

| Task | Status | Prompt | Purpose |
| --- | --- | --- | --- |
| 01 | Completed | `01_architecture_and_scope.md` | Define architecture, product slices, module boundaries, and delivery milestones. |
| 02 | Completed | `02_project_scaffold.md` | Create the Electron, React, TypeScript, Vite, PixiJS, Zustand, SQLite project foundation. |
| 03 | Completed | `03_database_event_store.md` | Implement SQLite-compatible schema, migrations, repositories, event recording, and token usage persistence. |
| 04 | Completed | `04_ipc_and_renderer_state.md` | Implement secure Electron IPC APIs, preload bridge, renderer state stores, and token usage query APIs. |
| 05 | Next | `05_agent_runtime_interface_and_mock.md` | Define `AgentRuntime` and implement a deterministic mock runtime. |
| 06 | Planned | `06_codex_cli_spawn_runtime.md` | Implement app-controlled Codex CLI spawning, stopping, and log streaming. |
| 07 | Planned | `07_agent_status_state_machine.md` | Map runtime events and logs into agent statuses and timeline events. |
| 08 | Planned | `08_skill_system.md` | Scan local skills, parse `SKILL.md`, assign skills, and inject skill context into prompts. |
| 09 | Planned | `09_pixel_office_view.md` | Render the PixiJS office and pixel agents with persistent positions. |
| 10 | Planned | `10_agent_detail_and_chat.md` | Build agent detail drawer, chat UI, response streaming, and message persistence. |
| 11 | Planned | `11_agent_profiles_and_personalization.md` | Build reusable personalized Agent Profiles and capability matrix. |
| 12 | Planned | `12_create_agent_flow.md` | Build the full create-agent workflow with Agent Profile selection. |
| 13 | Planned | `13_task_board_and_activity_timeline.md` | Add project task board and filterable activity timeline. |
| 14 | Planned | `14_meeting_room_group_chat.md` | Add group meetings, shared chat, moderator summary, and meeting notes. |
| 15 | Planned | `15_agent_pack_manifest_and_install.md` | Add source-readable Agent Pack manifest, inspection, and reviewed install. |
| 16 | Planned | `16_attach_mode_mcp_and_v2_integrations.md` | Add existing-session attach mode, MCP extension points, and V2 integration hooks. |
| 17 | Planned | `17_local_safety_permission_layer.md` | Add command risk detection, permission prompts, and audit logging. |
| 18 | Planned | `18_qa_polish_packaging.md` | Complete tests, visual polish, accessibility, packaging, and release readiness. |

## Current Work

Start from `05_agent_runtime_interface_and_mock.md`.

Tasks 01-04 are complete because the merged foundation includes:

- architecture, MVP/V1/V2 scope, module boundaries, and task plan,
- Electron + React + TypeScript + Vite scaffold,
- `sql.js` database client, schema, migrations, repositories, and tests,
- typed IPC contracts, preload bridge, renderer Zustand stores, and IPC tests,
- token usage and estimated cost persistence/query foundation for manager cost visibility.

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
- meeting room,
- Agent Profiles,
- Community Agent Pack import/install boundaries,
- attach/MCP extension points,
- safety permission layer,
- and verified tests.
