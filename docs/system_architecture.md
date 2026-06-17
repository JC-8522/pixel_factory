# System Architecture Components

This document defines the major system components for Local Codex Office, a local Agent Operating System for one-person companies. These components are product-level architecture modules, not necessarily one-to-one files. Implementation can start thin, but the boundaries should remain stable as the product grows.

The visual office is the Human Console / Mission Control layer. It should make the agent organization visible without turning the product into only an AI group chat tool.

## Target System Diagram

```mermaid
flowchart TB
  HumanConsole["Human Console"]
  AgentRegistry["Agent Registry"]
  Orchestration["Orchestration Center"]
  TaskEngine["Task Engine / DAG"]
  MessageRouter["Message Router"]
  ContextMemory["Context / Memory"]
  PermissionPolicy["Permission Policy Engine"]
  AuditEngine["Audit Engine"]
  EventLogs["Event Logs"]
  RuntimeLayer["Runtime Adapter Layer"]
  Persistence["Local Persistence"]
  LocalSystem["Local System"]

  HumanConsole --> Orchestration
  HumanConsole --> AgentRegistry
  HumanConsole --> TaskEngine
  HumanConsole --> AuditEngine

  Orchestration --> TaskEngine
  Orchestration --> MessageRouter
  Orchestration --> ContextMemory
  Orchestration --> PermissionPolicy
  Orchestration --> AuditEngine

  TaskEngine --> MessageRouter
  TaskEngine --> AuditEngine
  MessageRouter --> RuntimeLayer
  MessageRouter --> AuditEngine
  RuntimeLayer --> LocalSystem
  RuntimeLayer --> EventLogs
  RuntimeLayer --> ContextMemory

  AgentRegistry --> ContextMemory
  AgentRegistry --> Persistence
  ContextMemory --> Persistence
  PermissionPolicy --> AuditEngine
  AuditEngine --> EventLogs
  EventLogs --> Persistence
```

## Component Definitions

| Component | Purpose | Owns | Does Not Own |
| --- | --- | --- | --- |
| Human Console | The user-facing mission control surface for the one-person company. | Office UI, agent detail, chat, task board, meeting room, settings, cost views, audit visibility. | Runtime execution, database writes, permission policy decisions. |
| Agent Registry | The source of truth for known agents and their capabilities. | Agent identity, role, profile snapshot, skills, status, runtime kind, active session link, capability matrix metadata. | Starting processes directly, routing messages directly. |
| Orchestration Center | The application brain that coordinates multi-step product workflows. | Create-agent flow, run workflows, meeting workflows, task-to-agent assignment, escalation coordination. | Provider-specific runtime parsing, React rendering, raw DB queries. |
| Task Engine / DAG | The execution model for tasks, dependencies, review loops, and stop conditions. | Task states, dependencies, DAG nodes/edges, retry/review rules, workflow progress. | Chat transport, runtime provider details. |
| Message Router | The routing layer for user-agent and agent-agent messages. | Direct messages, broadcast messages, addressed meeting messages, review feedback routing, conversation metadata. | Agent identity source of truth, long-term memory. |
| Context / Memory | The context builder for runtime prompts and agent continuity. | Profile snapshots, assigned skill context, workspace context, user preferences, memory records, task/meeting context. | Permission approval, process spawning. |
| Permission Policy Engine | The policy layer for actions that can affect local state. | Permission presets, command risk rules, allow/deny decisions, scoped allow rules. | UI rendering of approval dialogs, raw runtime event storage. |
| Audit Engine | The product-level explainability and audit layer. | Domain event creation, audit trail, timeline records, transition reasons, permission decision records. | Low-level provider logs as the only source of truth. |
| Event Logs | Durable raw and normalized event storage. | Runtime events, domain events, timeline events, replay inputs. | Product policy decisions. |
| Runtime Adapter Layer | Provider integration layer. | Mock runtime, Codex CLI spawned runtime, attach mode, MCP bridge, future providers. | Product workflows, task rules, meeting orchestration. |
| Local Persistence | The local durable data boundary. | SQLite-compatible schema, migrations, repositories, local database file. | Renderer state, runtime process control. |

## Why These Components Are Needed

The product is not an AI group chat UI. It is an Agent Operating System where the human manager can create agents, assign work, coordinate reviews, monitor cost, enforce safety, and audit local execution. That requires explicit boundaries:

- Agent identity and capabilities must be separated from runtime provider sessions.
- Orchestration must be separated from UI components.
- Message routing must be separated from chat rendering.
- Task execution must be capable of graph and review-loop behavior.
- Context and memory must be reusable across chat, tasks, meetings, and runtime prompts.
- Permission policy must sit on the runtime path without making runtime adapters own policy.
- Audit must preserve product reasoning, not only raw stdout/stderr logs.

## Core Hardening Priorities

The current product has enough UI and data foundation to show the intended shape. The architecture risk now concentrates in five platform components that must become more formal before higher autonomy, Agent Packs, MCP, or broader integrations.

| Priority | Why It Matters | Current Shape | Required Direction |
| --- | --- | --- | --- |
| Task State Machine / Task Engine | Agents must move work predictably from assignment through review, completion, failure, retry, and escalation. | Basic task status transitions and audit events exist. | Add formal transition rules, task dependencies, DAG nodes/edges, review-loop state, retry limits, stop conditions, and manager escalation rules. |
| Message Router | Human-to-agent, human-to-many-agent, and agent-to-agent communication must share one inspectable routing model. | Individual chat and meeting routing metadata exist. | Add durable route records, route decisions, broadcast/addressed semantics, live agent-to-agent delivery, parent/child message threading, and route replay. |
| Permission Policy | Local command execution must remain under human-owned authority. | Permission presets exist in profile/create-agent models; full UX is deferred. | Add command risk classification, policy evaluation, scoped allow rules, approval prompts, denials, redaction, and audit records before expanding automation. |
| Execution Sandbox | Runtime providers should not be able to act outside approved local boundaries. | Runtime adapters use working directories and permission mode fields. | Add explicit workspace scoping, filesystem boundaries, environment isolation, safe command gates, default-deny options, and sandbox audit evidence. |
| Event Logs / Audit Trail | The manager needs to understand what happened, why it happened, and which rule caused it. | Events table, runtime events, task events, meeting events, and timeline filters exist. | Add formal domain event taxonomy, raw-vs-domain separation, event integrity rules, route/task/permission transition explanations, and replay-ready retention. |

These priorities should guide Tasks 15-18. New features should not bypass these components with one-off renderer or IPC logic.

## Component Interaction Rules

- Human Console calls preload APIs through renderer stores.
- IPC handlers validate requests and call application services.
- Orchestration Center coordinates Agent Registry, Task Engine, Message Router, Context / Memory, Permission Policy, Audit Engine, and Runtime Adapter Layer.
- Runtime adapters emit runtime events and never mutate task board, meeting, cost dashboard, or registry state directly.
- Message Router routes messages to sessions or workflow participants but does not decide business rules.
- Task Engine can request messages through Message Router but does not know provider-specific runtime details.
- Context / Memory builds prompt context from approved product data, not from renderer-provided trusted snapshots.
- Permission Policy Engine must be called before app-controlled local commands execute.
- Audit Engine converts product decisions into domain events.
- Event Logs store facts; Audit Engine explains product decisions.

## MVP To V1 Implementation Shape

The first implementation of each component can be small:

| Component | MVP / V1 Thin Version |
| --- | --- |
| Human Console | Existing app shell, office canvas, detail drawer, chat, logs, skill badges. |
| Agent Registry | Repository-backed agent list plus capability metadata from profiles and skills. |
| Orchestration Center | Application services for create agent, send message, assign task, start meeting. |
| Task Engine / DAG | Task state machine first; DAG edges and dependency rules next. |
| Message Router | Session message routing first; meeting broadcast and addressed messages next. |
| Context / Memory | Profile snapshot + skill context + workspace context first; durable memory later. |
| Permission Policy Engine | Default-allow hook first; full approval policy in Task 17. |
| Audit Engine | Domain event writer first; richer audit views later. |
| Event Logs | Current `events` table plus runtime event persistence. |
| Runtime Adapter Layer | Mock runtime and Codex CLI spawned runtime. |
| Local Persistence | `sql.js` SQLite-compatible repositories. |

## Naming Notes

- `Agent Registry` is not the same as `Runtime Registry`.
- `Agent Registry` answers: which agents exist, what can they do, what state are they in?
- `Runtime Registry` answers: which runtime adapter owns this session?
- `Orchestration Center` is broader than `Meeting Room`.
- `Task Engine / DAG` is broader than `Task Board`.
- `Message Router` is broader than `Agent Chat`.
- `Audit Engine` is broader than `Event Logs`.
