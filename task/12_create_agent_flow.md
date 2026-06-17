# Task 12: Create Agent Flow

You are the Product Workflow Agent for Local Codex Office.

## Product Context

Users need to create new local Codex agents from the office and give each agent a role, task, working directory, model/profile, skills, auto-run mode, and permission mode.

The human user is the default manager of the office. The form must also allow creating a separate `Manager Agent` role, but this agent must not inherit human approval authority.

Agent Profiles are implemented in Task 11. This task consumes those profiles in the create-agent workflow.

## Feature

Create new agent workflow with Agent Profile selection.

## Objective

Build the create-agent form and connect it to the runtime, database, skill assignment, office view, chat detail drawer, and Agent Profile selection.

The create-agent workflow should be implemented through a main-process application service. The renderer form collects intent; the main process validates it, generates any profile snapshot, applies default skills, creates durable records, and starts the runtime.

This task should route creation through Orchestration Center and register the resulting agent through Agent Registry. Initial chat/session creation should use Message Router rather than embedding message delivery in the renderer.

## Expected Output

- `src/renderer/components/CreateAgentDialog.tsx`
- `src/renderer/components/AgentProfilePicker.tsx`
- Form fields for agent name, role, working directory, initial task, model/profile, skills, auto-run mode, and permission mode.
- Role options must include `Manager Agent`.
- User can select an existing Agent Profile.
- Creating an agent from a profile stores `profile_id` and `profile_snapshot_json`.
- Profile default skills are applied to new agents and can be overridden before creation.
- Working directory picker through main-process IPC.
- Runtime spawn call.
- Agent creation event.
- Agent appears in the office after creation.
- Initial task appears in chat/session history.
- Main-process create-agent application service that coordinates profile snapshot, skill defaults, repositories, runtime spawn, and domain events.
- Agent Registry registration/update for the created agent.
- Message Router handoff for initial task/session message delivery.
- Tests for form validation and successful creation.

## Expected Feature

The user can create an agent from the UI, optionally start from an Agent Profile, and immediately see it as a pixel worker with logs streaming into the app.

## Validation Goal

A newly created agent has a database record, assigned skills, optional profile snapshot, runtime session, visible office character, chat history, and activity timeline events.

## Verification Steps

- Submit a valid create-agent form.
- Create an agent from a selected Agent Profile.
- Confirm the created agent stores `profile_id` and immutable `profile_snapshot_json`.
- Confirm profile default skills are assigned to the new agent.
- Confirm an agent record is created.
- Confirm a runtime session starts.
- Confirm selected skills are assigned.
- Confirm the agent appears in the office.
- Confirm initial task is saved as a message or session prompt.
- Confirm invalid form inputs show useful errors.
- Confirm the renderer never provides a trusted `profile_snapshot_json`; main-process service generates it.
- Confirm agent creation emits stable domain events for timeline consumers.

## Continuation

After this task passes validation, continue with `13_task_board_and_activity_timeline.md`. Created agents and their sessions should now be usable by task assignment workflows.
