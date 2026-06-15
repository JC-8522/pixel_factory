# Task 11: Agent Profiles And Personalization

You are the Agent Personalization Agent for Local Codex Office.

## Product Context

Users should be able to personalize agents beyond skills. An Agent Profile is a reusable configuration for creating agents. An Agent Instance is the actual running or saved agent in the office.

The human user is the default manager of the office. A `Manager Agent` is allowed as an agent role, but it must not inherit human approval authority.

## Feature

Agent Profile library and personalization model.

## Objective

Build local Agent Profile management before the create-agent workflow. Profiles should capture reusable role, persona, instruction, skill, model, permission, workspace, validation, collaboration, communication, risk, output, and visual identity preferences.

## Expected Output

- `src/main/profiles/profileService.ts`
- `src/main/profiles/profileImportExport.ts`
- IPC APIs for Agent Profile CRUD and import/export.
- `src/renderer/components/AgentProfileLibrary.tsx`
- `src/renderer/components/AgentProfileEditor.tsx`
- `src/renderer/components/AgentCapabilityMatrix.tsx`
- `src/renderer/stores/profileStore.ts`
- Profile default skill assignment support.
- Profile snapshot generation service.
- Permission presets in the profile model: `readonly`, `ask_before_edit`, `workspace_write`, and `auto_run_safe_commands`.
- Tests for profile CRUD, default skills, import/export, and snapshot immutability.

## Expected Feature

The user can create, edit, duplicate, delete, import, export, and inspect reusable Agent Profiles. Each profile can define:

- role,
- persona / working style,
- long-term operating instructions,
- default skills,
- default model/profile,
- permission mode,
- default workspace/project scope,
- tool access/capabilities,
- memory/preferences,
- startup workflow,
- validation policy,
- collaboration behavior,
- communication style,
- risk tolerance,
- output format preferences,
- visual identity.
- permission preset.

## Validation Goal

Profiles are durable, reusable, and safe to apply to future agents without mutating existing agent instances.

## Verification Steps

- Create a profile with role, persona, instructions, default skills, and visual identity.
- Edit and duplicate a profile.
- Delete a profile that is not required by an existing safety rule.
- Import and export a source-readable profile file.
- Link default skills to a profile.
- Generate a `profile_snapshot_json` object.
- Confirm updating the profile later does not mutate a previously generated snapshot.
- Confirm the Agent Capability Matrix shows skills, tools, permissions, workspace scope, and validation policy.
- Confirm permission presets can be stored on profiles without enabling the full Safety Permission Layer yet.

## Continuation

After this task passes validation, continue with `12_create_agent_flow.md`. The create-agent flow should consume profiles rather than implementing profile management itself.
