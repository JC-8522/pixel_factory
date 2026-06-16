# Product Design: Local Codex Office

## 1. Product Summary

Build a local desktop application using TypeScript/JavaScript that visualizes local Codex agents as pixel-art workers inside an office view.

The app depends on the user's local Codex environment. It does not run as a cloud service. It should monitor, display, and control local Codex agent sessions through local process integration, log streaming, config files, and optional MCP/Codex CLI integration.

Core concept:

> A visual office where each local Codex agent becomes a clickable pixel character. Users can chat with agents, assign skills, group agents into meetings, and observe what each agent is doing.

Codex Skills are reusable folders containing `SKILL.md` plus optional scripts/references/assets, and Codex can discover skills from the local skills directory.

## Default User Role

The human user is treated as the office manager by default. This means the user owns planning, approval, assignment, and review actions in the product experience.

The app should also allow the user to create a separate Manager Agent. A Manager Agent is an AI agent role that can help plan, coordinate, summarize, or assign work, but it must not be confused with the human user. Human approval and permission decisions always remain owned by the user.

---

# 2. Target Platform

## Desktop

Recommended stack:

* Electron
* React
* TypeScript
* Vite
* PixiJS
* Zustand
* SQLite
* Node.js backend inside Electron main process

## Local dependency

The app assumes Codex CLI is installed locally. Codex CLI is designed to run locally on the user's computer.

---

# 3. Core Features

## Feature 1: Local Codex Agent Discovery

### Goal

Detect currently running local Codex agent sessions and show them inside the office.

### User Story

As a user, I want to open the desktop app and immediately see which Codex agents are currently active on my machine.

### Requirements

The app should detect agents from:

* Running Codex CLI processes
* Local Codex session files
* Local logs
* App-created agent records
* Optional MCP/Codex CLI integration

### UI Behavior

Each detected agent appears as a pixel character in the office.

Agent card should show:

* Agent name
* Status
* Current task
* Runtime duration
* Token usage / estimated cost
* Working directory
* Assigned skills

### Agent Status Types

* `idle`
* `thinking`
* `running_command`
* `reading_files`
* `editing_files`
* `waiting_user_input`
* `error`
* `completed`
* `stopped`

### MVP Acceptance Criteria

* App can detect at least one local Codex process.
* App can show process status.
* App can map process/session to one pixel character.
* App updates status in near real time.

---

## Feature 2: Pixel Office View

### Goal

Represent all agents in a visual office.

### User Story

As a user, I want to see my AI agents as little workers in an office, so I can understand the team visually.

### Requirements

The office view should include:

* Desks
* Meeting room
* Whiteboard
* Idle area
* Error/blocked area
* Skill shelf or toolbox area

### Pixel Character Behavior

Each agent has animations:

| State           | Animation           |
| --------------- | ------------------- |
| Idle            | sitting             |
| Thinking        | typing              |
| Running command | walking to terminal |
| Reading files   | looking at papers   |
| Editing files   | typing fast         |
| Waiting input   | hand raised         |
| Error           | confused icon       |
| Completed       | celebration         |

### MVP Acceptance Criteria

* Render office with PixiJS.
* Render multiple pixel agents.
* Agent position persists between app restarts.
* Clicking an agent opens detail panel.

---

## Feature 3: Agent Detail Panel

### Goal

Let user inspect one agent deeply.

### User Story

As a user, I want to click an agent and understand what it is doing.

### Panel Content

Show:

* Agent name
* Current status
* Current task
* Working directory
* Current branch
* Last command
* Recent log stream
* Active skills
* Conversation history
* Files touched
* Error messages

### Actions

User can:

* Rename agent
* Stop agent
* Restart agent
* Open working directory
* Open terminal
* Assign skill
* Send message
* Move agent to meeting room

### MVP Acceptance Criteria

* User can open/close detail panel.
* User can view recent logs.
* User can send a message to the selected agent.
* User can stop an app-created agent.

---

## Feature 4: Chat With Individual Agent

### Goal

Allow user to talk directly with a specific local Codex agent.

### User Story

As a user, I want to click a pixel agent and chat with it directly.

### Requirements

Chat should support:

* Text input
* Agent response stream
* History
* Command/task refinement
* Skill mentions

Example commands:

```text
Please explain your current progress.
Use the testing skill before editing more files.
Pause and wait for my review.
Focus only on the frontend UI.
```

### Important Design

There are two possible modes:

#### Attached Mode

Chat connects to an existing Codex session.

#### Spawned Mode

App creates a new Codex session and controls it.

For MVP, prioritize Spawned Mode because it is easier to control reliably.

### MVP Acceptance Criteria

* User can create an agent from the app.
* User can send prompt to that agent.
* Response appears in chat panel.
* Conversation is saved locally.

---

## Feature 5: Create New Agent

### Goal

Allow user to spawn a new local Codex agent from the office.

### User Story

As a user, I want to create a new agent and give it a role/task.

### Creation Form

Fields:

* Agent name
* Role
* Working directory
* Initial task
* Model/profile
* Skills
* Auto-run mode
* Permission mode

### Example Roles

* Manager Agent
* Frontend Engineer
* Backend Engineer
* UI Designer
* QA Tester
* Security Reviewer
* Architect
* Documentation Writer

### Agent Personalization

Users should be able to personalize agents beyond skills. The product should support reusable Agent Profiles that define:

* Role
* Persona / working style
* Long-term operating instructions
* Default model/profile
* Permission mode
* Default workspace/project scope
* Tool access/capabilities
* Memory/preferences
* Startup workflow
* Validation policy
* Collaboration behavior
* Communication style
* Risk tolerance
* Output format preferences
* Visual identity
* Default assigned skills

An Agent Profile is a reusable configuration for creating an agent. An Agent Instance is the actual running or saved agent in the office.

### MVP Acceptance Criteria

* User can create an agent.
* App starts a local Codex process/session.
* Agent appears in office.
* Logs stream into the app.

---

## Feature 6: Skill Assignment

### Goal

Let user assign Codex skills to agents visually.

### User Story

As a user, I want to give an agent a specific skill, like testing or code review.

### Requirements

The app should scan local skill directories.

Recommended locations:

```text
~/.codex/skills
.project/.codex/skills
./skills
```

Codex skills are defined as directories containing `SKILL.md`; the `SKILL.md` includes metadata such as name and description.

### UI

Skill panel should show:

* Skill name
* Description
* Category
* Installed/not installed
* Assigned agents

### Skill Assignment Behavior

User can:

* Drag skill badge onto agent
* Remove skill from agent
* Add skill to agent creation form
* Mention skill in chat

Example:

```text
@FrontendAgent use $react-ui-engineer to build this component.
```

### MVP Acceptance Criteria

* App scans local skills.
* App displays available skills.
* App assigns skill metadata to an agent.
* Agent prompt includes assigned skill context.

---

## Feature 7: Group Chat / Meeting Room

### Goal

Allow the human manager to talk with multiple agents in one room and allow agents to communicate with each other through configurable conversation logic.

### User Story

As a user, I want to drag several agents into a meeting room, talk with them together, and define when one agent should review, challenge, or respond to another agent.

The meeting room is not only a group chat. It is the first multi-agent coordination surface. It should support user-to-many-agent conversation first, then extend naturally into agent-to-agent workflows such as developer agent -> reviewer/TL/auditor agent -> developer feedback loops.

### Meeting Creation

User can create a meeting with:

* Meeting title
* Goal
* Participants
* Moderator agent
* Output format
* Conversation mode
* Agent review/handoff rules
* Stop conditions
* Manager escalation conditions

### Example

Participants:

* Architect Agent
* Frontend Agent
* Backend Agent
* QA Agent

Task:

```text
Discuss the best architecture for the local Codex Office app. Produce a decision document.
```

### Meeting Flow

1. User selects agents.
2. Agents move to meeting room.
3. Moderator summarizes context.
4. Each agent gives opinion.
5. Agents debate.
6. Moderator produces final decision.
7. Result saved as meeting note.

### Agent-To-Agent Conversation Logic

The meeting room should support configurable logic such as:

* user asks one question and multiple agents respond,
* round-robin agent discussion,
* moderator-led discussion,
* developer agent produces output and reviewer/TL/auditor agent reviews it,
* reviewer feedback is routed back to the developer agent,
* developer agent revises and resubmits,
* manager is asked when agents disagree, confidence is low, risk is high, stop conditions are reached, or human approval is required.

The user should be able to edit:

* which agent speaks first,
* which agent reviews whose output,
* how many review/revision rounds are allowed,
* what counts as acceptance,
* what counts as blocking feedback,
* when the loop should stop,
* when to ask the human manager,
* what final artifact should be produced.

Each agent-to-agent message should remain inspectable in the meeting timeline. The app should preserve who spoke, who the message was addressed to, why the handoff happened, and which rule triggered the next step.

### MVP Acceptance Criteria

* User can select 2+ agents.
* User can start group discussion.
* App shows messages in shared room.
* App can preserve message routing metadata for future agent-to-agent flows.
* Final summary is saved locally.

---

## Feature 8: Task Board

### Goal

Provide a visual task management layer.

### User Story

As a user, I want to assign tasks to agents like a project manager.

### Board Columns

* Backlog
* Assigned
* In Progress
* Waiting Review
* Done
* Failed

### Task Fields

* Title
* Description
* Assigned agent
* Required skills
* Status
* Linked files
* Logs
* Result summary

### Interactions

* Drag task to agent
* Drag agent to task
* Convert chat message to task
* Convert meeting output to task

### MVP Acceptance Criteria

* User can create task.
* User can assign task to agent.
* Agent status updates task state.
* Completed task stores result summary.

---

## Feature 9: Activity Timeline

### Goal

Record what happened during agent work.

### User Story

As a user, I want to know what each agent did and when.

### Timeline Events

* Agent created
* Task assigned
* Skill attached
* Command started
* Command completed
* File edited
* Message sent
* Error occurred
* Meeting started
* Meeting ended

### MVP Acceptance Criteria

* App records events locally.
* User can filter by agent.
* User can filter by task.
* User can inspect recent activity.

---

## Feature 11: Token Usage & Cost Tracking

### Goal

Help the human manager understand how many tokens each agent uses and how much each agent may cost.

### User Story

As a manager, I want to see token usage and estimated cost by agent, session, task, model/profile, workspace, and time range, so I can understand spending and optimize how I assign work.

### Requirements

The app should track:

* Input tokens
* Output tokens
* Total tokens
* Cached tokens when available
* Reasoning tokens when available
* Model/profile used
* Estimated cost
* Currency
* Session-level totals
* Agent-level totals
* Task-linked totals
* Time-range totals

### UI

Show usage in:

* Agent card
* Agent detail panel
* Agent Health panel
* Run History / Session Archive
* Task detail
* Manager Cost Dashboard

### Notes

Not every runtime source will expose exact token usage. When exact usage is unavailable, the app should store `usage_source = estimated` and make that visible. If exact usage is available from Codex CLI logs, structured runtime events, MCP, or future APIs, store `usage_source = reported`.

### MVP Acceptance Criteria

* Mock runtime emits token usage events.
* App stores token usage per message/session/agent.
* App can show per-agent total tokens.
* App can show whether usage is reported or estimated.

---

## Feature 10: Local Safety & Permission Layer

### Goal

Protect user from uncontrolled local agent execution.

### User Story

As a user, I want to approve dangerous actions before agents run them.

### Risky Actions

* Delete files
* Install packages
* Modify system files
* Access credentials
* Run network commands
* Push to GitHub
* Execute shell scripts

### UI

Show permission dialog:

```text
Frontend Agent wants to run:
npm install pixi.js

Allow once / Always allow in this project / Deny
```

### MVP Acceptance Criteria

* App can detect high-risk command patterns.
* App asks for approval before running app-controlled commands.
* Denied commands are logged.

Security matters especially because malicious Codex-related packages have recently targeted developer credentials, including OpenAI auth tokens.

---

## Additional Planned Product Features

These features should be included in the roadmap because they make the product feel like a real local agent office instead of only a process viewer.

### Agent Profile Library

Users can manage reusable personalized Agent Profiles in one place. The library should support creating, editing, duplicating, deleting, importing, exporting, and inspecting profiles.

### Agent Capability Matrix

Users can compare agents and profiles by:

* Skills
* Tool access
* Permission mode
* Workspace scope
* Validation policy
* Collaboration behavior
* Risk tolerance

### Permission Presets

The app should provide understandable presets:

* `readonly`
* `ask_before_edit`
* `workspace_write`
* `auto_run_safe_commands`

The full safety approval UX can be implemented late, but these presets should exist in the product model earlier so agent creation and profiles have a stable shape.

### Agent Health

Each agent should expose health metadata:

* Process alive/dead
* Last heartbeat
* Last status transition
* Last error
* Current runtime session
* Runtime duration
* Token usage
* Estimated cost

### Project Workspace Selector

Users should be able to switch between local project workspaces. Each workspace can have different agents, tasks, skills, settings, and runtime sessions.

### Run History / Session Archive

Every agent run should be inspectable later. Users should be able to review prior sessions, prompts, logs, status transitions, files touched, errors, and result summaries.

### Manager Cost Dashboard

Managers should be able to inspect token usage and estimated cost by:

* Agent
* Session
* Task
* Model/profile
* Workspace
* Time range

### Agent Pack Import Review Screen

Before installing an Agent Pack, users should see a review screen showing:

* Included profiles
* Skill dependencies
* Bundled skills
* Scripts
* Requested permissions
* Author metadata
* Version metadata
* Checksum/signature status
* Validation status

# 4. Recommended App Architecture

## Electron Main Process

Responsibilities:

* Start/stop Codex processes
* Read local files/logs
* Scan skills
* Manage SQLite database
* Expose IPC APIs
* Handle OS permissions

## Renderer Process

Responsibilities:

* Office UI
* Pixel rendering
* Chat UI
* Task board
* Skill panel
* Timeline

## Local Database

Use SQLite.

Tables:

```text
agents
sessions
messages
skills
agent_skills
tasks
meetings
meeting_messages
events
settings
```

## Agent Runtime Adapter

Create an abstraction:

```ts
interface AgentRuntime {
  discoverAgents(): Promise<Agent[]>
  spawnAgent(input: SpawnAgentInput): Promise<AgentSession>
  sendMessage(sessionId: string, message: string): Promise<void>
  stopAgent(sessionId: string): Promise<void>
  streamEvents(sessionId: string): AsyncIterable<AgentEvent>
}
```

This allows future support for:

* Codex CLI
* Codex via MCP
* OpenAI Agents SDK
* Other local agents

OpenAI documents Codex CLI usage with MCP and the Agents SDK for multi-agent workflows, which fits the future architecture well.

---

# 5. Recommended Development Agents

For building this project, I recommend creating these local Codex agents.

## 1. Architect Agent

Purpose:

* Define architecture
* Design module boundaries
* Review technical decisions

Skills:

* `create-plan`
* `architecture-review`
* `typescript-project-structure`
* `electron-app-architecture`

Main tasks:

* Design Electron architecture
* Define AgentRuntime interface
* Define database schema
* Prevent messy coupling

---

## 2. Frontend UI Agent

Purpose:

* Build React UI

Skills:

* `react-ui-engineer`
* `zustand-state-management`
* `tailwind-ui`
* `component-library`

Main tasks:

* Agent detail panel
* Skill drawer
* Chat UI
* Task board
* Settings page

---

## 3. Pixel Office Agent

Purpose:

* Build PixiJS visual office

Skills:

* `pixijs-rendering`
* `game-loop`
* `sprite-animation`
* `pixel-art-ui`

Main tasks:

* Render office map
* Render agents
* Handle click/drag
* Animate status changes

---

## 4. Local Runtime Agent

Purpose:

* Integrate with local Codex

Skills:

* `node-child-process`
* `codex-cli-integration`
* `log-streaming`
* `mcp-integration`

Main tasks:

* Spawn Codex
* Capture stdout/stderr
* Parse status events
* Stop/restart agents

---

## 5. Skill System Agent

Purpose:

* Manage local skills

Skills:

* `codex-skill-author`
* `skill-scanner`
* `markdown-parser`
* `config-management`

Main tasks:

* Scan `~/.codex/skills`
* Parse `SKILL.md`
* Build skill assignment UI
* Inject assigned skill context into agent prompt

---

## 6. Backend Storage Agent

Purpose:

* Build local persistence

Skills:

* `sqlite-schema-design`
* `drizzle-orm`
* `migration-management`
* `event-sourcing`

Main tasks:

* SQLite schema
* Migrations
* Event timeline
* Session history

---

## 7. Security Agent

Purpose:

* Protect local machine

Skills:

* `security-audit`
* `safe-command-execution`
* `secrets-detection`
* `permission-gates`

Main tasks:

* Risky command detection
* Permission prompts
* Secrets redaction
* Package safety checks

---

## 8. QA Agent

Purpose:

* Test the app

Skills:

* `test-generator`
* `playwright-e2e`
* `vitest`
* `electron-testing`

Main tasks:

* Unit tests
* UI tests
* Agent runtime mock tests
* Regression tests

---

# 6. Recommended Skills To Create For This Project

You should create project-local skills under:

```text
./.codex/skills
```

## Skill 1: `product-planner`

Use for:

* Breaking large requirements into implementation plans
* Generating milestones
* Keeping scope controlled

## Skill 2: `electron-typescript-architect`

Use for:

* Electron main/renderer separation
* IPC design
* Local filesystem access
* App packaging

## Skill 3: `codex-runtime-integrator`

Use for:

* Codex CLI process integration
* Session management
* Log streaming
* Runtime adapter design

## Skill 4: `pixijs-office-renderer`

Use for:

* Pixel office rendering
* Sprite animations
* Agent click/drag interaction
* Game loop optimization

## Skill 5: `agent-state-machine`

Use for:

* Defining agent states
* Mapping logs/events to states
* Handling transitions

## Skill 6: `skill-manager`

Use for:

* Scanning local skills
* Parsing `SKILL.md`
* Assigning skills to agents
* Skill badge UI

## Skill 7: `multi-agent-meeting`

Use for:

* Group chat orchestration
* Moderator pattern
* Meeting summaries
* Agent-to-agent discussion protocol

## Skill 8: `local-security-guard`

Use for:

* Command approval
* Secrets redaction
* Dangerous operation detection
* Local permission rules

## Skill 9: `sqlite-event-store`

Use for:

* Local persistence
* Event timeline
* Agent/session/message/task schema

## Skill 10: `qa-test-builder`

Use for:

* Vitest tests
* Playwright tests
* Mock agent runtime
* Electron integration tests

---

# 7. MVP Scope

## MVP Version 0.1

Must include:

1. Electron desktop shell
2. React UI
3. Pixel office canvas
4. Create local app-controlled Codex agent
5. Show one agent as pixel character
6. Click agent to open chat
7. Stream agent output
8. Scan local skills
9. Assign skill badge to agent
10. Store messages/events in SQLite

Do not include yet:

* True existing-agent attach mode
* Multiplayer
* Voice
* Cloud sync
* Replay
* Complex autonomous meetings

---

# 8. V1 Scope

Add:

1. Multiple agents
2. Group chat meeting room
3. Task board
4. File-change tracking
5. Permission presets in the agent/profile model
6. Better pixel animations
7. Agent Profiles: reusable personalized agent configurations including role, persona, instructions, default skills, model/profile, permission mode, workspace scope, tool access, startup workflow, validation policy, collaboration behavior, communication style, risk tolerance, output preferences, and visual identity
8. Import/export local Agent Profiles
9. Agent Profile Library
10. Agent Capability Matrix
11. Agent Health
12. Run History / Session Archive
13. Manager Cost Dashboard for token usage and estimated cost
14. Skill marketplace/import page
15. Full permission approval system as late hardening

---

# 9. V2 Scope

Add:

1. Attach to already-running Codex sessions
2. MCP-based orchestration
3. Timeline replay
4. GitHub PR integration
5. Multi-project workspace
6. Project Workspace Selector
7. Agent Packs: shareable packages containing agent profiles, skill dependencies, optional bundled skills, assets, startup workflows, permission manifests, and validation tests
8. Agent Pack Import Review Screen
9. Install Agent Pack from local folder or GitHub URL
10. Plugin system
11. Shared office themes

---

# 9.5 Future Open Source Ecosystem

Local Codex Office should become an open-source ecosystem where users can share reusable Community Agent Packs.

An Agent Pack is a source-readable package containing:

* One or more Agent Profiles
* Skill dependencies
* Optional bundled skills
* Visual identity assets
* Startup workflows
* Permission manifest
* Validation tests
* Author metadata
* Version metadata

The app should prioritize transparent, inspectable packages over opaque binaries. Users must be able to review requested permissions, included scripts, skill dependencies, author metadata, version history, checksums/signatures, and validation status before installing a community Agent Pack.

Future registry features can include:

* Community Agent Pack Registry
* Public sharing
* Rating/review
* Versioning
* Signature verification
* Maintainer trust model
* Security scanning

---

# 10. First Implementation Order

## Phase 1: Foundation

* Create Electron + React + TypeScript app
* Add SQLite
* Add IPC bridge
* Add Zustand store

## Phase 2: Agent Runtime

* Implement `AgentRuntime`
* Implement mock runtime first
* Implement Codex CLI runtime second
* Stream output into UI

## Phase 3: Office View

* Add PixiJS canvas
* Render office background
* Render pixel agents
* Add click interaction

## Phase 4: Chat

* Agent detail drawer
* Chat message list
* Send message
* Save messages

## Phase 5: Skills

* Scan local skills
* Parse `SKILL.md`
* Show skill drawer
* Assign skills to agents

## Phase 6: Multi-Agent

* Create meeting room
* Add group chat
* Add moderator summary

---

# 11. Example Prompt For Codex

```text
You are building a local desktop app called Codex Office.

Tech stack:
- Electron
- React
- TypeScript
- Vite
- PixiJS
- Zustand
- SQLite
- Node.js

Goal:
Create a local desktop UI that visualizes local Codex agents as pixel-art office workers.

MVP:
1. Create Electron + React + TypeScript project.
2. Add SQLite local database.
3. Add AgentRuntime interface.
4. Implement MockAgentRuntime first.
5. Render a pixel office using PixiJS.
6. Show agents as clickable pixel characters.
7. Clicking an agent opens a detail drawer.
8. User can chat with the mock agent.
9. Scan local skills from ~/.codex/skills and ./.codex/skills.
10. Assign skills to an agent as badges.

Important:
- Keep main process and renderer process separate.
- Use IPC APIs for local filesystem/process access.
- Do not directly access Node APIs from renderer.
- Design runtime adapter so Codex CLI integration can be added later.
- Store agents, messages, skills, tasks, and events in SQLite.
- Add tests for AgentRuntime, skill scanning, and state transitions.

Start by creating the project structure and architecture plan before coding.
```
