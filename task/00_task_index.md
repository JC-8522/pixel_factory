# Task Index: Local Codex Office

Use these tasks in order. Each task is written as an agent-readable implementation prompt. Do not skip ahead unless the previous task's validation goal is satisfied.

## Product Goal

Build a local desktop application called Local Codex Office. It visualizes local Codex agents as pixel-art office workers, lets the user create and chat with agents, assign skills, manage tasks and meetings, monitor activity, and protect local execution with permission controls.

## Task Sequence

1. `01_architecture_and_scope.md` - Define architecture, product slices, module boundaries, and delivery milestones.
2. `02_project_scaffold.md` - Create the Electron, React, TypeScript, Vite, PixiJS, Zustand, SQLite project foundation.
3. `03_database_event_store.md` - Implement SQLite schema, migrations, repositories, and event recording.
4. `04_ipc_and_renderer_state.md` - Implement secure Electron IPC APIs and renderer state stores.
5. `05_agent_runtime_interface_and_mock.md` - Define `AgentRuntime` and implement a deterministic mock runtime.
6. `06_codex_cli_spawn_runtime.md` - Implement app-controlled Codex CLI spawning, stopping, and log streaming.
7. `07_agent_status_state_machine.md` - Map runtime events and logs into agent statuses and timeline events.
8. `08_skill_system.md` - Scan local skills, parse `SKILL.md`, assign skills, and inject skill context into prompts.
9. `09_pixel_office_view.md` - Render the PixiJS office and pixel agents with persistent positions.
10. `10_agent_detail_and_chat.md` - Build agent detail drawer, chat UI, response streaming, and message persistence.
11. `11_agent_profiles_and_personalization.md` - Build reusable personalized Agent Profiles and capability matrix.
12. `12_create_agent_flow.md` - Build the full create-agent workflow with Agent Profile selection.
13. `13_task_board_and_activity_timeline.md` - Add project task board and filterable activity timeline.
14. `14_meeting_room_group_chat.md` - Add group meetings, shared chat, moderator summary, and meeting notes.
15. `15_agent_pack_manifest_and_install.md` - Add source-readable Agent Pack manifest, inspection, and reviewed install.
16. `16_attach_mode_mcp_and_v2_integrations.md` - Add existing-session attach mode, MCP extension points, and V2 integration hooks.
17. `17_local_safety_permission_layer.md` - Add command risk detection, permission prompts, and audit logging.
18. `18_qa_polish_packaging.md` - Complete tests, visual polish, accessibility, packaging, and release readiness.

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
