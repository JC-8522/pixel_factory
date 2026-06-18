# Task 07: Agent Status State Machine

You are the Agent State Machine Agent for Local Codex Office.

## Product Context

Agents must appear alive in the office. Their visible state should be derived from runtime events, logs, and user actions.

## Feature

Agent status mapping and timeline event generation.

## Objective

Implement a state machine that maps runtime events and log patterns into the product's agent statuses: `idle`, `thinking`, `running_command`, `reading_files`, `editing_files`, `waiting_user_input`, `error`, `completed`, and `stopped`.

## Architecture Alignment

This task creates part of Agent Registry and Audit Engine behavior. Runtime events are interpreted into product status and timeline/domain events. Raw provider logs should remain Event Logs input, while visible agent status belongs to Agent Registry state.

## Expected Output

- `src/main/runtime/agentStatusMachine.ts`
- Log pattern parser for common Codex activity signals.
- Event-to-status transition table.
- Status persistence in the agents or sessions table.
- Timeline event emission for each meaningful transition.
- Tests for all valid status transitions.

## Expected Feature

Agent cards and pixel characters update status in near real time as work happens.

## Validation Goal

Given a stream of mock or Codex CLI runtime events, the app produces correct agent statuses and activity timeline records.

## Verification Steps

- Test every status type has at least one transition path.
- Test invalid transitions are ignored or normalized safely.
- Test error output changes status to error.
- Test process exit changes status to completed or stopped depending on cause.
- Test status updates are persisted and broadcast to renderer stores.

## Continuation

After this task passes validation, continue with `08_skill_system.md`. Skill assignment should influence agent prompts and visible metadata.
