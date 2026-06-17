# Task 15: Agent Pack Manifest And Install

You are the Agent Pack Agent for Local Codex Office.

## Product Context

Local Codex Office should become an open-source ecosystem where users can share reusable Community Agent Packs. An Agent Pack is a source-readable package that can contain Agent Profiles, skill dependencies, optional bundled skills, visual identity assets, startup workflows, permission manifests, validation tests, author metadata, and version metadata.

## Feature

Local Agent Pack manifest, inspection, and reviewed installation.

## Objective

Implement the first Agent Pack boundary as a local and GitHub-ready package format. The app must inspect an Agent Pack before install without executing scripts, show a review screen, then install reviewed profiles/skills/assets into local storage.

Agent Packs should be able to package Agent Profiles and, later, reusable conversation workflow templates. Installed profiles must become normal local Agent Profiles and should still generate immutable snapshots when used to create agents.

Installed Agent Pack content should register through Agent Registry and Context / Memory boundaries. Permission manifests should be inspected through Permission Policy Engine, and install decisions should be recorded by Audit Engine.

## Expected Output

- `docs/agent_pack_manifest.md`
- `src/main/agentPacks/agentPackManifest.ts`
- `src/main/agentPacks/agentPackInspector.ts`
- `src/main/agentPacks/agentPackInstaller.ts`
- `src/renderer/components/AgentPackReview.tsx`
- `src/renderer/stores/agentPackStore.ts`
- IPC APIs for inspect, install, uninstall, list installed, and validate.
- Agent Registry integration for installed profiles and capabilities.
- Audit Engine records for inspection, install, uninstall, validation, and permission manifest review.
- Tests for manifest parsing, inspection without script execution, install, uninstall, and validation status.

## Expected Feature

The user can inspect a local Agent Pack, review what it contains, and install it only after seeing:

- included Agent Profiles,
- skill dependencies,
- bundled skills,
- scripts,
- visual assets,
- permission manifest,
- optional conversation workflow templates,
- validation tests,
- author metadata,
- version metadata,
- checksum/signature status,
- validation status.

## Validation Goal

Agent Packs are transparent and source-readable. The app never executes package scripts during inspection, and installed profiles become normal local Agent Profiles.

## Verification Steps

- Inspect a valid local Agent Pack folder.
- Inspect a malformed Agent Pack and show validation errors.
- Confirm inspection does not execute scripts.
- Install reviewed Agent Pack profiles as normal Agent Profiles.
- Store Agent Pack metadata in `agent_packs`.
- Show permission manifest and validation status before install.
- Show included Agent Profiles and optional workflow templates before install.
- Uninstall an Agent Pack without corrupting user-created profiles.

## Human App Acceptance

- Use `skills/electron-desktop-debug/SKILL.md` for the runbook.
- Launch the Electron app from a clean dev run.
- Navigate to the Agent Pack review surface.
- Pick or enter a local Agent Pack folder path and inspect it without executing scripts.
- Review included profiles, skills, assets, permissions, validation status, and author/version metadata in the UI.
- Install a valid reviewed pack, then verify installed profiles appear in the Agent Profile Library.
- Inspect a malformed pack and confirm validation errors are clear.
- Capture focused screenshots of inspection, validation errors, reviewed install, and installed profile visibility.
- Inspect dev logs after pack workflows and confirm no renderer, preload, IPC, or runtime errors occurred.

## Continuation

After this task passes validation, continue with `16_attach_mode_mcp_and_v2_integrations.md`. External integration work can build on the Agent Pack boundary.
