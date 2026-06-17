# Task 17: Local Safety Permission Layer

You are the Security Agent for Local Codex Office.

## Product Context

Local agents can run commands and access local files. The app must protect users from risky actions and create an audit trail.

This task intentionally happens late because the first user is the project owner working locally. Earlier tasks may use conservative runtime defaults, but the full permission approval UX is not required before the product is useful for self-use.

## Feature

Command risk detection, approval prompts, permission policies, and denied-action logging.

## Objective

Implement a safety layer for app-controlled commands. Detect risky command patterns before execution, show a permission dialog, support allow-once, always-allow-in-project, and deny decisions, and log denied commands.

The product model may already contain permission presets from Agent Profiles. This task turns those presets into enforceable runtime behavior and approval UI.

Earlier runtime tasks should already have a safety hook boundary, even if it defaults to allow for local-owner MVP use. This task hardens that hook into real policy enforcement without changing runtime adapter contracts.

This task owns the Permission Policy Engine hardening. Every allow/deny decision should produce Audit Engine records and Event Logs entries.

## Expected Output

- `src/main/security/riskRules.ts`
- `src/main/security/permissionPolicy.ts`
- `src/main/security/secretsRedaction.ts`
- `src/main/runtime/safeCommandGate.ts`
- Application/domain service integration for permission decisions and audit/domain events.
- Permission Policy Engine enforcement for runtime command gates.
- Audit Engine records for requests, decisions, denials, scoped allow rules, and redaction behavior.
- IPC APIs for permission requests and decisions.
- Renderer permission dialog.
- Settings UI for project allow rules.
- Tests for risky command detection and policy behavior.

## Expected Feature

When an app-controlled agent wants to run a risky command, the user can approve or deny it before the command proceeds.

## Validation Goal

Risky actions are detected, blocked until approval, redacted where necessary, and recorded in the activity timeline.

## Verification Steps

- Test delete-file commands are flagged.
- Test package installation commands are flagged.
- Test network commands are flagged.
- Test credential-like strings are redacted in logs.
- Test allow-once applies to only one command.
- Test always-allow-in-project is scoped to one project.
- Test deny prevents command execution and records an event.
- Confirm runtime adapters call the safety hook instead of implementing permission logic themselves.
- Confirm permission decisions create stable domain events for timeline/audit UI.

## Human App Acceptance

- Use `skills/electron-desktop-debug/SKILL.md` for the runbook.
- Launch the Electron app from a clean dev run.
- Trigger a safe command path and confirm it proceeds without an approval dialog.
- Trigger risky delete, install, or network-like command paths through a controlled mock/runtime-safe flow.
- Approve once, always allow in project, and deny through the visible permission dialog.
- Confirm denied actions do not execute and appear in the activity/audit UI.
- Open settings and inspect scoped allow rules.
- Capture focused screenshots of the permission dialog, denied event, and settings rule state.
- Inspect dev logs after safety workflows and confirm no renderer, preload, IPC, or runtime errors occurred.

## Continuation

After this task passes validation, continue with `18_qa_polish_packaging.md`. Final QA must include safety events and permission-denial flows.
