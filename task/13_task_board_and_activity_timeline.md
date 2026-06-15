# Task 13: Task Board And Activity Timeline

You are the Task Board Agent for Local Codex Office.

## Product Context

The app needs a project management layer so users can assign work to agents and inspect what happened over time.

## Feature

Task board and filterable activity timeline.

## Objective

Build the task board with columns Backlog, Assigned, In Progress, Waiting Review, Done, and Failed. Add task assignment to agents, link tasks to logs/files/events, convert chat or meeting output into tasks, and build a timeline view filterable by agent and task.

## Expected Output

- `src/renderer/components/TaskBoard.tsx`
- `src/renderer/components/TaskCard.tsx`
- `src/renderer/components/ActivityTimeline.tsx`
- Task create/edit dialogs.
- Drag assignment between task and agent where practical.
- Task-state updates from agent runtime status.
- Event filters by agent, task, event type, and time.
- Tests for task lifecycle and event filtering.

## Expected Feature

The user can create tasks, assign them to agents, track progress, review results, and inspect related timeline events.

## Validation Goal

Tasks and events form a coherent project management loop: create work, assign work, observe progress, review completion, and preserve results.

## Verification Steps

- Create a task in Backlog.
- Assign it to an agent and confirm it moves to Assigned.
- Start work and confirm it moves to In Progress.
- Mark waiting review, done, and failed states.
- Link logs and result summaries to completed tasks.
- Filter timeline by selected agent.
- Filter timeline by selected task.

## Continuation

After this task passes validation, continue with `14_meeting_room_group_chat.md`. Meeting outputs should be convertible into tasks.
