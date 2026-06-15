# Task 13: Task Board And Activity Timeline

You are the Task Board Agent for Local Codex Office.

## Product Context

The app needs a project management layer so users can assign work to agents and inspect what happened over time.

## Feature

Task board and filterable activity timeline.

## Objective

Build the task board with columns Backlog, Assigned, In Progress, Waiting Review, Done, and Failed. Add task assignment to agents, link tasks to logs/files/events, convert chat or meeting output into tasks, and build a timeline view filterable by agent and task. Add Agent Health, Run History / Session Archive, and Manager Cost Dashboard views using sessions, token usage, and events.

## Expected Output

- `src/renderer/components/TaskBoard.tsx`
- `src/renderer/components/TaskCard.tsx`
- `src/renderer/components/ActivityTimeline.tsx`
- `src/renderer/components/AgentHealthPanel.tsx`
- `src/renderer/components/RunHistory.tsx`
- `src/renderer/components/ManagerCostDashboard.tsx`
- Task create/edit dialogs.
- Drag assignment between task and agent where practical.
- Task-state updates from agent runtime status.
- Event filters by agent, task, event type, and time.
- Agent health display for process alive/dead, last heartbeat, last status transition, last error, active session, and runtime duration.
- Session archive display for prompts, logs, status transitions, files touched, errors, token usage, estimated cost, and result summaries.
- Manager cost dashboard display for token usage and estimated cost by agent, session, task, model/profile, workspace, and time range.
- Tests for task lifecycle and event filtering.

## Expected Feature

The user can create tasks, assign them to agents, track progress, review results, inspect related timeline events, review agent health, revisit previous agent runs, and understand per-agent token cost.

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
- Inspect agent health for an active or stopped session.
- Open a prior run in the session archive and see its messages/events/result summary.
- View token usage and estimated cost by agent.
- View whether usage is `reported` or `estimated`.

## Continuation

After this task passes validation, continue with `14_meeting_room_group_chat.md`. Meeting outputs should be convertible into tasks.
