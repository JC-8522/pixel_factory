# Task 14: Meeting Room Group Chat

You are the Multi-Agent Meeting Agent for Local Codex Office.

## Product Context

The office includes a meeting room where multiple agents can discuss one problem and produce a final decision note.

## Feature

Group chat, meeting orchestration, moderator summary, and saved meeting notes.

## Objective

Implement meeting creation with title, goal, participants, moderator agent, and output format. Move selected agents into the meeting room, orchestrate a structured discussion, display shared messages, save the final moderator summary, and allow converting meeting outputs into tasks.

## Expected Output

- `src/renderer/components/MeetingRoom.tsx`
- `src/renderer/components/CreateMeetingDialog.tsx`
- `src/main/meetings/meetingOrchestrator.ts`
- Meeting message persistence.
- Moderator summary generation flow.
- Meeting note storage.
- Conversion from meeting note item to task.
- Tests for meeting flow using mock agents.

## Expected Feature

The user can select two or more agents, start a meeting, watch a shared discussion, and save a final summary as a meeting note.

## Validation Goal

The meeting room can coordinate multiple agents in a predictable flow and produce a useful persisted outcome.

## Verification Steps

- Create a meeting with at least two mock agents.
- Confirm agents visually move or appear in the meeting room.
- Confirm each participant contributes a message.
- Confirm moderator produces a final summary.
- Confirm the meeting note is saved.
- Confirm a meeting output can become a task board item.

## Continuation

After this task passes validation, continue with `15_attach_mode_mcp_and_v2_integrations.md`. Group work should remain compatible with future attached sessions and MCP orchestration.
