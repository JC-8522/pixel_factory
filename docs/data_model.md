# Data Model

## Database

Use SQLite as the durable local store. The database is owned by the Electron main process.

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
skills
agent_skills
tasks
task_events
meetings
meeting_participants
meeting_messages
events
settings
permission_rules
agent_packs
```

## Common Columns

Most tables should include:

- `id` text primary key,
- `created_at` text ISO timestamp,
- `updated_at` text ISO timestamp where mutable,
- soft references by text IDs where cross-table relations are needed.

Use SQLite foreign keys for owned relations where practical.

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
- `created_at`
- `updated_at`

Roles:

- `user`
- `agent`
- `system`
- `tool`
- `moderator`

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
- `role`
- `content`
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
- Chat message chunks may be appended incrementally, but final messages must end in a stable `stream_state`.
- Agent status must be durable so the office can restore after restart.
- Agent positions must be stored in `agents`.
- Agents created from profiles must store `profile_id` and `profile_snapshot_json`.
- Updating an Agent Profile must not mutate existing agents unless the user explicitly reapplies the profile.
- Agent Packs must be inspectable before install and must not execute scripts during metadata scanning.
- Skill scans update `skills` without deleting unknown records unless explicitly requested.
- Permission denials must always create timeline events.
