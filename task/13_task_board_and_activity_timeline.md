# Task 13: Task Board And Activity Timeline

You are the Task Board Agent for Local Codex Office.

## Product Context

The app needs a project management layer so users can assign work to agents and inspect what happened over time.

## Feature

Task board and filterable activity timeline.

## Objective

Build the task board with columns Backlog, Assigned, In Progress, Waiting Review, Done, and Failed. Add task assignment to agents, link tasks to logs/files/events, convert chat or meeting output into tasks, and build a timeline view filterable by agent and task. Add Agent Health, Run History / Session Archive, and Manager Cost Dashboard views using sessions, token usage, and events.

This task should introduce or use application services and domain events for task transitions, timeline records, run history, health, and usage summaries. Task board UI should not parse runtime-provider logs directly.

Task state behavior belongs in Task Engine / DAG. Timeline and run history explanations belong in Audit Engine and Event Logs.

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
- Usage price configuration for estimated cost when provider-reported cost is unavailable.
- Domain event normalization for task/timeline/dashboard records.
- Task Engine task state transition boundary.
- Audit Engine records for task movement, assignment, run history, and cost visibility.
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
- Configure or load a model price config and confirm estimated cost uses that config.
- Confirm task board and timeline consume domain events instead of provider-specific runtime log formats.

## Human App Acceptance

- Use `skills/electron-desktop-debug/SKILL.md` for the runbook.
- Launch the Electron app from a clean dev run.
- Navigate to Tasks, Timeline, Run History, Agent Health, and Manager Cost Dashboard from the Human Console.
- Create, assign, move, complete, and fail tasks using visible UI controls.
- Select an agent and inspect its health, run history, and cost summary like a manager reviewing spend.
- Capture focused screenshots for the task board state, filtered timeline, and cost dashboard.
- Inspect dev logs after the workflow and confirm no renderer, preload, IPC, or runtime errors occurred.

## Continuation

After this task passes validation, continue with `14_meeting_room_group_chat.md`. Meeting outputs should be convertible into tasks.

## Completion Notes

Completed on the current implementation branch.

- Added Task Board navigation to the Human Console.
- Added task creation, assignment, status movement, result summaries, and event-backed timeline filtering.
- Added Agent Health, Run History / Session Archive, and Manager Cost Dashboard panels.
- Task creation, assignment, and status changes now write stable domain events for timeline and audit consumers.
- Manager cost visibility uses persisted token usage summaries and usage-source detail.
- Added `scripts/verify-task13-14-ui.mjs` to drive Electron CDP acceptance for Tasks and Meeting Room.

Human app acceptance evidence:

- Task board screenshot: `out/task13-accept-task-board.png`
- Verified visible columns Backlog, Assigned, In Progress, Waiting Review, Done, and Failed.
- Verified task creation, assignment, status transition to In Progress / Waiting Review / Done, event filtering, agent health, run history, and manager cost UI.
