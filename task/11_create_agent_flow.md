# Task 11: Create Agent Flow

You are the Product Workflow Agent for Local Codex Office.

## Product Context

Users need to create new local Codex agents from the office and give each agent a role, task, working directory, model/profile, skills, auto-run mode, and permission mode.

The human user is the default manager of the office. The form must also allow creating a separate `Manager Agent` role, but this agent must not inherit human approval authority.

V1 must also support Agent Profiles. An Agent Profile is a reusable personalized configuration for creating agents. It can include role, persona, instructions, default skills, model/profile, permission mode, workspace scope, tool access, memory/preferences, startup workflow, validation policy, collaboration behavior, communication style, risk tolerance, output preferences, and visual identity.

## Feature

Create new agent workflow and Agent Profile personalization.

## Objective

Build the create-agent form and connect it to the runtime, database, skill assignment, office view, and chat detail drawer. Add Agent Profile selection and local profile management so users can create personalized reusable agent configurations.

## Expected Output

- `src/renderer/components/CreateAgentDialog.tsx`
- `src/renderer/components/AgentProfileEditor.tsx`
- `src/renderer/components/AgentProfilePicker.tsx`
- `src/main/profiles/profileService.ts`
- `src/main/profiles/profileImportExport.ts`
- Form fields for agent name, role, working directory, initial task, model/profile, skills, auto-run mode, and permission mode.
- Role options must include `Manager Agent`.
- Profile fields for persona, instructions, default skills, workspace scope, tool access, memory/preferences, startup workflow, validation policy, collaboration behavior, communication style, risk tolerance, output preferences, and visual identity.
- User can create, edit, duplicate, delete, import, and export local Agent Profiles.
- Creating an agent from a profile stores `profile_id` and `profile_snapshot_json`.
- Profile default skills are applied to new agents and can be overridden before creation.
- Working directory picker through main-process IPC.
- Runtime spawn call.
- Agent creation event.
- Agent appears in the office after creation.
- Initial task appears in chat/session history.
- Tests for form validation and successful creation.

## Expected Feature

The user can create an agent from the UI, optionally start from a personalized Agent Profile, and immediately see it as a pixel worker with logs streaming into the app.

## Validation Goal

A newly created agent has a database record, assigned skills, optional profile snapshot, runtime session, visible office character, chat history, and activity timeline events.

## Verification Steps

- Submit a valid create-agent form.
- Create a reusable Agent Profile.
- Duplicate and edit an Agent Profile.
- Import and export a local Agent Profile.
- Create an agent from a selected Agent Profile.
- Confirm the created agent stores `profile_id` and immutable `profile_snapshot_json`.
- Confirm profile default skills are assigned to the new agent.
- Confirm an agent record is created.
- Confirm a runtime session starts.
- Confirm selected skills are assigned.
- Confirm the agent appears in the office.
- Confirm initial task is saved as a message or session prompt.
- Confirm invalid form inputs show useful errors.

## Continuation

After this task passes validation, continue with `12_local_safety_permission_layer.md`. Runtime actions from created agents must pass through safety checks.
