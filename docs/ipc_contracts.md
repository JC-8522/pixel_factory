# IPC Contracts

## Contract Principles

- IPC is the only bridge from renderer UI to local system capabilities.
- All channels are named and typed.
- All payloads must be JSON-serializable.
- All inputs must be validated in the main process.
- Renderer receives sanitized data only.
- Streaming updates use subscription-style event channels exposed through preload helper methods.
- IPC handlers should stay thin and delegate product workflows to main-process application services.
- Renderer components should usually call Zustand store actions rather than calling `window.codexOffice` directly.

## Preload API Shape

```ts
type CodexOfficeApi = {
  agents: AgentApi;
  profiles: AgentProfileApi;
  agentPacks: AgentPackApi;
  runtime: RuntimeApi;
  messages: MessageApi;
  skills: SkillApi;
  tasks: TaskApi;
  meetings: MeetingApi;
  events: EventApi;
  tokenUsage: TokenUsageApi;
  settings: SettingsApi;
  system: SystemApi;
};
```

## Agent IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `agents.list()` | renderer to main | List all known agents. |
| `agents.get(agentId)` | renderer to main | Load one agent. |
| `agents.create(input)` | renderer to main | Create a local app-owned agent record. |
| `agents.rename(agentId, name)` | renderer to main | Rename an agent. |
| `agents.updatePosition(agentId, position)` | renderer to main | Persist office position. |
| `agents.assignSkill(agentId, skillId)` | renderer to main | Attach skill metadata to agent. |
| `agents.removeSkill(agentId, skillId)` | renderer to main | Remove skill assignment. |
| `agents.onChanged(callback)` | main to renderer | Broadcast agent updates. |

## Agent Profile IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `profiles.list()` | renderer to main | List reusable Agent Profiles. |
| `profiles.get(profileId)` | renderer to main | Load one profile. |
| `profiles.create(input)` | renderer to main | Create a personalized profile. |
| `profiles.update(profileId, patch)` | renderer to main | Edit a profile. |
| `profiles.duplicate(profileId)` | renderer to main | Copy a profile for customization. |
| `profiles.delete(profileId)` | renderer to main | Delete a local profile if no safety rule prevents it. |
| `profiles.assignSkill(profileId, skillId)` | renderer to main | Add a default skill to a profile. |
| `profiles.removeSkill(profileId, skillId)` | renderer to main | Remove a default skill from a profile. |
| `profiles.export(profileId)` | renderer to main | Export profile metadata for local sharing. |
| `profiles.importFromFile(path)` | renderer to main | Import a local source-readable profile file. |
| `profiles.onChanged(callback)` | main to renderer | Broadcast profile updates. |

## Agent Pack IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `agentPacks.inspectLocal(path)` | renderer to main | Inspect a local Agent Pack without executing scripts. |
| `agentPacks.inspectGitHub(url)` | renderer to main | Fetch or inspect metadata for a GitHub-hosted pack when supported. |
| `agentPacks.install(input)` | renderer to main | Install a reviewed Agent Pack. |
| `agentPacks.uninstall(packId)` | renderer to main | Remove an installed pack and optionally its profiles. |
| `agentPacks.listInstalled()` | renderer to main | List installed packs. |
| `agentPacks.validate(packId)` | renderer to main | Run declared validation checks after user approval. |
| `agentPacks.onChanged(callback)` | main to renderer | Broadcast pack updates. |

## Runtime IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `runtime.discoverAgents()` | renderer to main | Discover app-created sessions and supported local Codex processes. |
| `runtime.spawnAgent(input)` | renderer to main | Start an app-controlled agent session. |
| `runtime.sendMessage(sessionId, message)` | renderer to main | Send user text to a runtime session. |
| `runtime.stopAgent(sessionId)` | renderer to main | Stop an app-controlled runtime session. |
| `runtime.restartAgent(sessionId)` | renderer to main | Restart a stopped app-controlled session. |
| `runtime.onEvent(callback)` | main to renderer | Stream runtime events. |

## Message IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `messages.listBySession(sessionId)` | renderer to main | Load conversation history. |
| `messages.create(input)` | renderer to main | Persist a user, agent, system, or tool message. |
| `messages.appendChunk(input)` | main internal, optional renderer notification | Append streamed agent output. |
| `messages.onChanged(callback)` | main to renderer | Broadcast message updates. |

## Skill IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `skills.scan()` | renderer to main | Scan local skill roots. |
| `skills.list()` | renderer to main | List stored skills. |
| `skills.get(skillId)` | renderer to main | Load one skill. |
| `skills.listForAgent(agentId)` | renderer to main | List assigned skills. |
| `skills.onChanged(callback)` | main to renderer | Broadcast skill updates. |

## Task IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `tasks.list()` | renderer to main | List tasks. |
| `tasks.create(input)` | renderer to main | Create a task. |
| `tasks.update(taskId, patch)` | renderer to main | Edit fields or status. |
| `tasks.assign(taskId, agentId)` | renderer to main | Assign task to agent. |
| `tasks.linkEvent(taskId, eventId)` | main internal | Link event to task. |
| `tasks.onChanged(callback)` | main to renderer | Broadcast task updates. |

## Meeting IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `meetings.list()` | renderer to main | List meetings. |
| `meetings.create(input)` | renderer to main | Create meeting metadata. |
| `meetings.start(meetingId)` | renderer to main | Start group discussion flow. |
| `meetings.sendMessage(input)` | renderer to main | Add a meeting message. |
| `meetings.finish(meetingId)` | renderer to main | Save moderator summary and finish meeting. |
| `meetings.onChanged(callback)` | main to renderer | Broadcast meeting updates. |

## Event IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `events.list(filter)` | renderer to main | Query timeline events. |
| `events.get(eventId)` | renderer to main | Load one event. |
| `events.onCreated(callback)` | main to renderer | Stream new timeline events. |

## Token Usage IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `tokenUsage.listByAgent(agentId)` | renderer to main | Load token usage records for one agent. |
| `tokenUsage.summaryByAgent(agentId)` | renderer to main | Load input/output/total tokens and estimated cost for one agent. |
| `tokenUsage.onChanged(callback)` | main to renderer | Broadcast usage updates after runtime events are persisted. |

## Settings And System IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `settings.get()` | renderer to main | Load app settings. |
| `settings.update(patch)` | renderer to main | Update app settings. |
| `system.pickDirectory()` | renderer to main | Open directory picker. |
| `system.openDirectory(path)` | renderer to main | Open a user-approved local directory. |
| `system.openTerminal(path)` | renderer to main | Open terminal for a user-approved working directory. |

## Safety IPC

| Method | Direction | Purpose |
| --- | --- | --- |
| `permissions.request(input)` | main to renderer | Ask user for command approval. |
| `permissions.decide(requestId, decision)` | renderer to main | Return allow or deny decision. |
| `permissions.listRules(projectPath)` | renderer to main | List scoped allow rules. |
| `permissions.revoke(ruleId)` | renderer to main | Remove stored allow rule. |

## Runtime Event Broadcast

Runtime broadcasts use a shared `AgentEvent` union and are emitted from main to renderer:

```ts
type AgentEvent =
  | { type: "session_started"; agentId: string; sessionId: string; at: string }
  | { type: "status_changed"; agentId: string; sessionId: string; status: AgentStatus; at: string }
  | { type: "message_chunk"; agentId: string; sessionId: string; messageId: string; chunk: string; at: string }
  | { type: "token_usage"; agentId: string; sessionId: string; messageId?: string; usage: TokenUsage; at: string }
  | { type: "command_started"; agentId: string; sessionId: string; command: string; at: string }
  | { type: "command_completed"; agentId: string; sessionId: string; exitCode: number | null; at: string }
  | { type: "file_touched"; agentId: string; sessionId: string; path: string; action: FileAction; at: string }
  | { type: "waiting_user_input"; agentId: string; sessionId: string; prompt?: string; at: string }
  | { type: "error"; agentId: string; sessionId: string; message: string; at: string }
  | { type: "session_stopped"; agentId: string; sessionId: string; at: string };
```

Provider-specific runtime output should be normalized before it becomes renderer-facing data. Task board, meeting room, timeline, and usage dashboard UI should depend on product-level domain semantics instead of Codex CLI log formats.

## Domain Event Broadcast

Domain events are product-level timeline/audit records created by main-process services.

Examples:

- `agent_status_changed`
- `message_created`
- `task_status_changed`
- `meeting_review_requested`
- `meeting_feedback_routed`
- `meeting_manager_escalation_created`
- `token_usage_recorded`
- `permission_denied`

Renderer event APIs may expose these through the existing `events` methods. The important contract rule is that domain events are stable product records; runtime adapters can change provider-specific parsing without forcing the renderer to change.

## IPC Validation Requirements

Each IPC handler must validate:

- required IDs are non-empty strings,
- paths are normalized and approved for the requested operation,
- enum values are known,
- profile snapshots are generated by main process, not trusted from renderer,
- Agent Pack metadata scanning does not execute package scripts,
- remote Agent Pack installation requires explicit user review,
- message text is bounded,
- JSON payloads are serializable,
- renderer cannot provide trusted timestamps for audit events,
- permission decisions match an active permission request.
