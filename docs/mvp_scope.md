# Scope Plan

## Product Goal

The final product is a local desktop office for Codex agents. Users can see agents as pixel workers, create and control local agents, chat with them, assign skills, organize work, run meetings, and review activity safely.

## MVP 0.1 Scope

MVP must deliver a usable local vertical slice:

- Electron desktop shell.
- React renderer app.
- Secure preload and typed IPC.
- SQLite database.
- `AgentRuntime` abstraction.
- deterministic mock runtime.
- spawned app-controlled Codex CLI runtime.
- one or more visible pixel agents.
- PixiJS office canvas.
- agent selection from the office.
- agent detail drawer.
- individual chat with response streaming.
- log stream display.
- skill scanning from local skill roots.
- skill assignment badges.
- message and event persistence.
- basic activity event recording.

## MVP Acceptance

The user can:

1. launch the desktop app locally,
2. create an app-controlled agent,
3. see the agent in the pixel office,
4. click the agent,
5. send a chat message,
6. watch output stream into the chat/log UI,
7. assign a local skill,
8. restart the app and still see saved messages/events.

The human user is the default manager throughout MVP. The create-agent flow should also support `Manager Agent` as an agent role, while keeping human approval and settings authority separate from agent behavior.

## V1 Scope

V1 expands the product from a single-agent MVP into a practical multi-agent workspace:

- multiple agents in the office,
- group chat meeting room,
- task board,
- file-change tracking,
- full permission approval system,
- better pixel animations,
- Agent Profiles for reusable personalized agent configurations,
- profile personalization fields including role, persona, instructions, default skills, model/profile, permission mode, workspace scope, tool access, memory/preferences, startup workflow, validation policy, collaboration behavior, communication style, risk tolerance, output preferences, and visual identity,
- local Agent Profile import/export,
- skill marketplace or import page,
- richer timeline filters,
- task and meeting result summaries.

## V2 Scope

V2 adds advanced integration and extensibility:

- attach to already-running Codex sessions,
- MCP-based orchestration,
- timeline replay,
- GitHub PR integration,
- multi-project workspace support,
- Agent Packs that bundle profiles, skill dependencies, optional bundled skills, assets, startup workflows, permission manifests, and validation tests,
- install Agent Pack from local folder or GitHub URL,
- plugin system,
- shared office themes,
- richer external agent provider support.

## V3 / Open Source Ecosystem Vision

V3 can turn the project into a community-sharing ecosystem:

- Community Agent Pack Registry,
- public sharing of source-readable Agent Packs,
- rating and review,
- versioning,
- checksum and signature verification,
- maintainer trust model,
- security scanning before install,
- validation status shown before use.

## Explicit Non-Goals

### MVP Non-Goals

- No cloud sync.
- No multiplayer.
- No voice.
- No timeline replay.
- No plugin marketplace.
- No community Agent Pack registry.
- No shared Agent Pack installation.
- No GitHub PR automation.
- No full arbitrary existing-session attach mode.
- No complex autonomous multi-agent meeting orchestration.

### V1 Non-Goals

- No cloud-hosted service.
- No remote team collaboration.
- No deep MCP orchestration beyond extension-ready interfaces.
- No full plugin ecosystem.
- No public Agent Pack registry.
- No installation of unreviewed remote Agent Packs.
- No guarantee that every external Codex session can be controlled.

### V2 Non-Goals

- No hosted SaaS backend.
- No centralized user account system.
- No remote execution of local commands.
- No bypass of user permission policies.

## Feature Coverage Map

| Feature From Product Design | Implementation Stage | Status |
| --- | --- | --- |
| Local Codex Agent Discovery | MVP app-created, V2 attach | planned |
| Pixel Office View | MVP basic, V1 enhanced | planned |
| Agent Detail Panel | MVP | planned |
| Chat With Individual Agent | MVP spawned, V2 attached | planned |
| Create New Agent | MVP | planned |
| Skill Assignment | MVP basic, V1 marketplace/import | planned |
| Group Chat / Meeting Room | V1 | planned |
| Task Board | V1 | planned |
| Activity Timeline | MVP base, V1 filters | planned |
| Local Safety & Permission Layer | V1 full, MVP hooks | planned |
| Agent Profiles / Personalization | V1 | planned |
| Community Agent Packs | V2 install/import, V3 registry | planned |

## Delivery Milestones

1. Foundation: app scaffold, database, IPC, stores.
2. Runtime: mock runtime, Codex CLI runtime, event stream.
3. Office MVP: PixiJS canvas, agent sprites, click selection.
4. Chat MVP: detail drawer, message send, response stream.
5. Skills MVP: scan, parse, assign, prompt injection.
6. V1 Personalization: Agent Profiles, profile import/export, personalized create-agent flow.
7. V1 Workflows: permissions, task board, meeting room, timeline filters.
8. V2 Integrations: attach mode, MCP, GitHub, Agent Packs, plugins, themes.
