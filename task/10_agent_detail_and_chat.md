# Task 10: Agent Detail And Chat

You are the Frontend UI Agent for Local Codex Office.

## Product Context

The user must be able to inspect one agent deeply and chat with it directly.

## Feature

Agent detail drawer and individual chat.

## Objective

Build a detail panel that opens when the user clicks an agent. It must show agent metadata, current status, task, working directory, branch, last command, recent logs, active skills, conversation history, touched files, and errors. It must include a chat input that sends messages to the selected agent and streams responses into the UI.

## Expected Output

- `src/renderer/components/AgentDetailDrawer.tsx`
- `src/renderer/components/AgentLogStream.tsx`
- `src/renderer/components/AgentChat.tsx`
- `src/renderer/components/AgentSkillBadges.tsx`
- IPC/store integration for chat messages and runtime send-message calls.
- Message persistence.
- Tests for drawer state and chat behavior.

## Expected Feature

The user can click a pixel agent, inspect recent activity, send a message, and see the agent response stream into the conversation.

## Validation Goal

The detail drawer and chat UI work with the mock runtime and are ready to work with the Codex CLI runtime.

## Verification Steps

- Click an agent and confirm the drawer opens.
- Close and reopen the drawer without losing state.
- Send a message and confirm it is persisted.
- Confirm streamed response chunks appear in order.
- Confirm logs and errors render in the detail panel.
- Confirm active skills appear as badges.

## Continuation

After this task passes validation, continue with `11_agent_profiles_and_personalization.md`. Profiles should be ready before the create-agent flow consumes them.
