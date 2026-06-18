# Data Model

## Database

Use SQLite as the durable local store. The database is owned by the Electron main process.

MVP implementation uses `sql.js` as a SQLite-compatible embedded engine to avoid native module build friction. Keep all database access behind `src/main/db` repositories so the engine can later be swapped to native SQLite without changing renderer code or IPC contracts.

## Actor Model

MVP is a local single-user app. The human user is treated as the default manager and does not require a full `users` table.

Store user-level preferences in `settings`, including a default value equivalent to:

```json
{ "localUserRole": "manager" }
```

Agents may also have the role `Manager Agent`. This is an agent role in the `agents.role` column, not a user identity. Events and permissions must distinguish between user decisions and agent suggestions.

## Table Overview

```text
agents
agent_profiles
agent_profile_skills
sessions
messages
token_usage
model_price_configs
skills
agent_skills
tasks
task_events
meetings
meeting_participants
meeting_messages
meeting_flow_rules
meeting_transitions
events
settings
permission_rules
agent_packs
```

## Component Data Ownership

The major architecture components map to data ownership as follows:

| Component | Primary Tables Now | Likely Future Tables |
| --- | --- | --- |
| Agent Registry | `agents`, `agent_profiles`, `agent_skills`, `sessions`, `skills` | `agent_capabilities`, `agent_health_snapshots` |
| Orchestration Center | coordinates records across domains | `workflow_runs`, `workflow_steps` |
| Task Engine / DAG | `tasks`, `task_events` | `task_dependencies`, `task_dag_nodes`, `task_dag_edges` |
| Message Router | `messages`, `meeting_messages` | `message_routes`, `conversation_threads` |
| Context / Memory | `agent_profiles`, `agent_profile_skills`, `skills`, `settings` | `memory_records`, `business_memory_assets`, `context_snapshots`, `workspace_contexts` |
| Permission Policy Engine | `permission_rules`, `settings` | `permission_requests`, `permission_decisions` |
| Audit Engine | `events`, `task_events`, `meeting_transitions` | `audit_records` if audit needs to split from timeline events |
| Event Logs | `events` | `runtime_event_logs` if raw provider logs need separate retention/replay |
| Usage / Cost | `token_usage`, `model_price_configs` | `usage_rollups` |

Future tables should be added only when the current `events`, `messages`, `tasks`, and repository boundaries become too overloaded. The architecture defines the ownership boundary first; migrations can stay incremental.

## Common Columns

Most tables should include:

- `id` text primary key,
- `created_at` text ISO timestamp,
- `updated_at` text ISO timestamp where mutable,
- soft references by text IDs where cross-table relations are needed.

Use SQLite foreign keys for owned relations where practical.

When using `sql.js`, enforce important relation constraints with schema-level triggers if native `PRAGMA foreign_keys` support is unavailable in the runtime.

## `agents`

Stores durable agent identity and UI metadata.

Columns:

- `id`
- `name`
- `role`
- `profile_id`
- `profile_snapshot_json`
- `status`
- `current_task`
- `working_directory`
- `current_branch`
- `last_command`
- `runtime_kind`
- `permission_mode`
- `auto_run_mode`
- `position_x`
- `position_y`
- `metadata_json`
- `created_at`
- `updated_at`

Status values:

- `idle`
- `thinking`
- `running_command`
- `reading_files`
- `editing_files`
- `waiting_user_input`
- `error`
- `completed`
- `stopped`

Common role examples:

- `Manager Agent`
- `Frontend Engineer`
- `Backend Engineer`
- `UI Designer`
- `QA Tester`
- `Security Reviewer`
- `Architect`
- `Documentation Writer`

## `agent_packs`

Stores reviewed local Agent Pack installation metadata.

Columns:

- `id`
- `name`
- `description`
- `author`
- `version`
- `source_type`
- `source_uri`
- `installed_path`
- `checksum`
- `signature_status`
- `permission_manifest_json`
- `validation_status`
- `metadata_json`
- `installed_at`
- `updated_at`

Agent Pack inspection must be source-readable and must not execute package scripts. Installed profiles reference the pack through `agent_profiles.source_pack_id`.

## `agent_profiles`

Stores reusable personalized agent configurations.

Columns:

- `id`
- `name`
- `description`
- `role`
- `persona`
- `instructions`
- `default_model_profile`
- `default_permission_mode`
- `default_auto_run_mode`
- `workspace_scope_json`
- `tool_access_json`
- `memory_preferences_json`
- `startup_workflow_json`
- `validation_policy_json`
- `collaboration_behavior_json`
- `communication_style`
- `risk_tolerance`
- `output_preferences_json`
- `visual_identity_json`
- `source_pack_id`
- `created_at`
- `updated_at`

`source_pack_id` is optional and points to the Agent Pack that installed the profile.

## `agent_profile_skills`

Links reusable profiles to default skills.

Columns:

- `profile_id`
- `skill_id`
- `required`
- `created_at`

Primary key:

- `profile_id`, `skill_id`

## `sessions`

Stores runtime session records.

Columns:

- `id`
- `agent_id`
- `runtime_kind`
- `external_session_id`
- `process_id`
- `status`
- `started_at`
- `ended_at`
- `working_directory`
- `initial_prompt`
- `model_profile`
- `exit_code`
- `error_message`
- `metadata_json`
- `input_tokens`
- `output_tokens`
- `total_tokens`
- `cached_tokens`
- `reasoning_tokens`
- `estimated_cost`
- `cost_currency`
- `usage_source`

## `messages`

Stores individual and meeting-related conversation content.

Columns:

- `id`
- `session_id`
- `agent_id`
- `meeting_id`
- `role`
- `content`
- `stream_state`
- `parent_message_id`
- `metadata_json`
- `input_tokens`
- `output_tokens`
- `total_tokens`
- `usage_source`
- `created_at`
- `updated_at`

Roles:

- `user`
- `agent`
- `system`
- `tool`
- `moderator`

## `token_usage`

Stores token usage and estimated cost records for manager cost visibility.

Columns:

- `id`
- `agent_id`
- `session_id`
- `message_id`
- `task_id`
- `model_profile`
- `input_tokens`
- `output_tokens`
- `total_tokens`
- `cached_tokens`
- `reasoning_tokens`
- `estimated_cost`
- `cost_currency`
- `usage_source`
- `metadata_json`
- `created_at`

`usage_source` values:

- `reported`
- `estimated`
- `manual`

Use `reported` when token usage comes from a structured runtime source. Use `estimated` when the app derives usage from text or approximate tokenization.

## `skills`

Stores discovered skill metadata.

Columns:

- `id`
- `name`
- `description`
- `category`
- `root_path`
- `skill_md_path`
- `installed`
- `metadata_json`
- `last_scanned_at`
- `created_at`
- `updated_at`

## `agent_skills`

Links agents to assigned skills.

Columns:

- `agent_id`
- `skill_id`
- `assigned_at`
- `assigned_by`

Primary key:

- `agent_id`, `skill_id`

## `tasks`

Stores project management tasks.

Columns:

- `id`
- `title`
- `description`
- `assigned_agent_id`
- `status`
- `required_skills_json`
- `linked_files_json`
- `result_summary`
- `created_from`
- `created_at`
- `updated_at`

Statuses:

- `backlog`
- `assigned`
- `in_progress`
- `waiting_review`
- `done`
- `failed`

## `task_events`

Links tasks to timeline events.

Columns:

- `task_id`
- `event_id`
- `linked_at`

Primary key:

- `task_id`, `event_id`

## `meetings`

Stores group discussion metadata and results.

Columns:

- `id`
- `title`
- `goal`
- `moderator_agent_id`
- `output_format`
- `status`
- `summary`
- `created_at`
- `started_at`
- `ended_at`
- `updated_at`

Statuses:

- `draft`
- `running`
- `completed`
- `failed`
- `cancelled`

## `meeting_participants`

Links agents to meetings.

Columns:

- `meeting_id`
- `agent_id`
- `role`
- `joined_at`

Primary key:

- `meeting_id`, `agent_id`

## `meeting_messages`

Stores shared room messages.

Columns:

- `id`
- `meeting_id`
- `agent_id`
- `target_agent_id`
- `parent_message_id`
- `role`
- `content`
- `message_kind`
- `flow_rule_id`
- `created_at`
- `metadata_json`

`target_agent_id` is optional and supports future agent-to-agent routing inside a meeting.

`message_kind` examples:

- `user_prompt`
- `agent_response`
- `review_request`
- `review_feedback`
- `revision`
- `manager_escalation`
- `summary`

## `meeting_flow_rules`

Stores editable conversation and handoff logic for a meeting.

Columns:

- `id`
- `meeting_id`
- `name`
- `trigger_json`
- `source_agent_id`
- `target_agent_id`
- `action`
- `stop_condition_json`
- `manager_escalation_json`
- `max_rounds`
- `enabled`
- `created_at`
- `updated_at`

Example actions:

- `ask_agent`
- `request_review`
- `send_feedback`
- `request_revision`
- `summarize`
- `ask_manager`
- `stop_meeting`

## `meeting_transitions`

Stores why a meeting moved from one speaker/action to the next.

Columns:

- `id`
- `meeting_id`
- `flow_rule_id`
- `from_message_id`
- `to_message_id`
- `source_agent_id`
- `target_agent_id`
- `reason`
- `created_at`
- `metadata_json`

## `events`

Stores audit and activity timeline events.

Columns:

- `id`
- `type`
- `actor_type`
- `actor_id`
- `agent_id`
- `session_id`
- `task_id`
- `meeting_id`
- `severity`
- `payload_json`
- `created_at`

`actor_type` values:

- `user`
- `agent`
- `system`

Human approval events must use `actor_type = "user"`. Manager Agent suggestions must use `actor_type = "agent"`.

The product distinguishes `RuntimeEvent` from `DomainEvent`:

- `RuntimeEvent` is a provider signal such as a stdout line, process exit, message chunk, or raw token usage report.
- `DomainEvent` is a product event used by timeline, task board, meeting room, cost dashboard, and audit UI.

During MVP both categories may be stored in this table, but event `type` and `payload_json` must make source/category clear. Future migrations may split raw runtime events into a dedicated table if replay or debugging requires it.

Event types include:

- `agent_created`
- `agent_updated`
- `session_started`
- `session_stopped`
- `task_assigned`
- `skill_attached`
- `command_started`
- `command_completed`
- `command_denied`
- `file_touched`
- `message_sent`
- `error_occurred`
- `meeting_started`
- `meeting_ended`
- `permission_requested`
- `permission_decided`
- `token_usage_recorded`
- `meeting_review_requested`
- `meeting_feedback_routed`
- `meeting_manager_escalation_created`

## `model_price_configs`

Stores local price assumptions for estimated token cost.

Columns:

- `id`
- `model_profile`
- `provider`
- `input_token_price_per_1m`
- `output_token_price_per_1m`
- `cached_token_price_per_1m`
- `reasoning_token_price_per_1m`
- `currency`
- `source`
- `effective_from`
- `created_at`
- `updated_at`

`source` values:

- `default`
- `user_configured`
- `imported`

Cost estimates must record enough metadata in `token_usage.metadata_json` to explain which price config was used. If no price config is available, the app should still show token counts and label cost as unavailable instead of inventing a number.

## `settings`

Stores app and project settings.

Columns:

- `key`
- `value_json`
- `updated_at`

## `permission_rules`

Stores scoped allow rules for risky commands.

Columns:

- `id`
- `project_path`
- `rule_kind`
- `command_pattern`
- `decision`
- `created_at`
- `expires_at`
- `metadata_json`

## `agent_packs`

Stores installed or imported shareable agent packages.

Columns:

- `id`
- `name`
- `description`
- `author`
- `version`
- `source_type`
- `source_uri`
- `installed_path`
- `checksum`
- `signature_status`
- `permission_manifest_json`
- `validation_status`
- `metadata_json`
- `installed_at`
- `updated_at`

## Persistence Rules

- Runtime events should be persisted as `events` before broadcasting when possible.
- Token usage should be stored in `token_usage` and summarized into sessions/messages where practical.
- Token usage records should include whether usage is `reported` or `estimated`.
- Estimated cost should use `model_price_configs` and must remain labeled as estimated unless the runtime provider returns billing-grade cost data.
- Chat message chunks may be appended incrementally, but final messages must end in a stable `stream_state`.
- Agent status must be durable so the office can restore after restart.
- Agent positions must be stored in `agents`.
- Agents created from profiles must store `profile_id` and `profile_snapshot_json`.
- Updating an Agent Profile must not mutate existing agents unless the user explicitly reapplies the profile.
- Agent Packs must be inspectable before install and must not execute scripts during metadata scanning.
- Skill scans update `skills` without deleting unknown records unless explicitly requested.
- Permission denials must always create timeline events.
