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

## Human App Acceptance

- Use `skills/electron-desktop-debug/SKILL.md` for the runbook.
- Launch the Electron app from a clean dev run.
- Open the create-agent workflow from the Office view.
- Fill the form as a human manager: name, role, working directory, initial task, runtime, auto-run mode, permission mode, and optional Agent Profile.
- Create one mock/runtime-safe agent without a profile and one agent from an Agent Profile when profile data exists.
- Capture a focused screenshot of the create-agent dialog before submit and the Office view after the agent appears.
- Click the created pixel worker and confirm the detail drawer/chat history reflects the initial task.
- Inspect dev logs after the flow and confirm no renderer, preload, IPC, or runtime errors occurred.

## Continuation

After this task passes validation, continue with `13_task_board_and_activity_timeline.md`. Created agents and their sessions should now be usable by task assignment workflows.

## Follow-Up UX Polish

- The Create Agent dialog skill checklist can become long when many local skills are scanned. Add search, category filtering, selected-only filtering, and collapsible sections in a later polish pass so managers can quickly find and review assigned skills.

## Completion Notes

Completed in `task-12-create-agent-flow`.

- The UI now exposes a Create Agent dialog from the Office view.
- Agent Profile selection preloads role, default permission mode, auto-run mode, model profile, and default skills.
- The renderer sends intent only; the main process generates immutable `profile_snapshot_json`.
- The main-process orchestration service creates the agent, applies selected/default skills, starts the runtime session, and routes the initial task through Message Router.
- The created agent appears in the office canvas and opens in the detail drawer with chat history.
- Existing local databases are backfilled for `token_usage`, session usage columns, and message usage columns.
- Mock runtime event IDs now include the session scope so app restarts do not collide with persisted event IDs.

Human app acceptance evidence:

- Dialog screenshot: `out/task12-accept-create-agent-dialog.png`
- Created agent screenshot: `out/task12-accept-created-agent-office.png`
- Verified profile snapshot, session, user/agent messages, token usage summary, domain events, and rendered office canvas through Electron CDP.
