# Task 14: Meeting Room Multi-Agent Conversation

You are the Multi-Agent Meeting Agent for Local Codex Office.

## Product Context

The office includes a meeting room where the human manager can talk with multiple agents in one place. The meeting room must also become the foundation for future agent-to-agent communication and review workflows.

Do not implement this as only a passive group chat. Design it as a configurable multi-agent conversation surface that can later support flows such as:

- developer agent completes work,
- TL, auditor, QA, or reviewer agent reviews the work,
- reviewer feedback is routed back to the developer agent,
- developer agent revises,
- the loop continues until acceptance, max rounds, stop condition, or manager escalation.

## Feature

User-to-multiple-agent conversation, configurable agent-to-agent handoff logic, meeting orchestration, moderator summary, and saved meeting notes.

## Objective

Implement meeting creation with title, goal, participants, moderator agent, output format, conversation mode, and editable flow rules. Move selected agents into the meeting room, orchestrate a structured discussion, display shared messages, preserve agent-to-agent routing metadata, save the final moderator summary, and allow converting meeting outputs into tasks.

Build the orchestration as a reusable conversation workflow engine below the meeting room UI. The meeting room is one surface for this engine; future task automation should be able to run developer -> reviewer -> developer loops without requiring the meeting UI to be open.

Meeting message delivery belongs in Message Router. Meeting/review policy belongs in Orchestration Center and Task Engine / DAG. Meeting transition explanations belong in Audit Engine.

Meeting outcomes should also be usable as future Workflow Assets or Business Memory Assets, not only transient discussion text.

## Expected Output

- `src/renderer/components/MeetingRoom.tsx`
- `src/renderer/components/CreateMeetingDialog.tsx`
- `src/renderer/components/MeetingFlowEditor.tsx`
- `src/main/meetings/meetingOrchestrator.ts`
- `src/main/meetings/meetingFlowRules.ts`
- `src/main/workflows/conversationOrchestrator.ts` or equivalent reusable workflow domain service.
- Message Router support for broadcast, addressed, and agent-to-agent meeting messages.
- Audit Engine records for handoff, review, feedback, stop, and escalation decisions.
- Meeting message persistence.
- Meeting message routing metadata for source agent, target agent, parent message, and flow rule.
- Editable flow rule persistence for speaker order, review routing, stop conditions, and manager escalation conditions.
- Meeting transition/audit persistence that records why one agent was asked to speak after another.
- Moderator summary generation flow.
- Meeting note storage.
- Conversion from meeting note item to task.
- Business-memory-ready meeting note storage that can later be promoted into reusable company knowledge.
- Tests for meeting flow using mock agents.
- Tests for workflow rules independent from React UI.

## Expected Feature

The user can select two or more agents, start a meeting, talk with all of them, watch a shared discussion, configure review/handoff logic between agents, and save a final summary as a meeting note.

## Validation Goal

The meeting room can coordinate multiple agents in a predictable and inspectable flow. It should prove that user-to-agent and agent-to-agent conversations can share the same durable conversation model.

## Verification Steps

- Create a meeting with at least two mock agents.
- Confirm agents visually move or appear in the meeting room.
- Confirm each participant contributes a message.
- Confirm the human manager can send a message addressed to all agents or a selected agent.
- Configure a developer -> reviewer -> developer feedback loop.
- Confirm the developer agent response can trigger a reviewer/TL/auditor agent review.
- Confirm reviewer feedback is routed back to the developer agent.
- Confirm the loop stops when acceptance or max rounds is reached.
- Confirm a manager escalation is created when a configured escalation condition is met.
- Confirm every routed message records source agent, target agent, parent message, and triggering flow rule.
- Confirm moderator produces a final summary.
- Confirm the meeting note is saved.
- Confirm a meeting output can become a task board item.
- Confirm meeting outputs are preserved clearly enough to later become workflow templates or business-memory entries.
- Confirm the workflow engine can evaluate a developer -> reviewer -> developer loop without depending on the meeting room component.

## Human App Acceptance

- Use `skills/electron-desktop-debug/SKILL.md` for the runbook.
- Launch the Electron app from a clean dev run.
- Navigate to the Meeting Room and create a meeting with at least two visible agents.
- Send a manager message to all agents, then send or route a message to a selected agent.
- Configure a developer -> reviewer -> developer flow through the visible flow editor.
- Watch the shared conversation update and inspect routing metadata or audit notes in the UI.
- Save a moderator summary or meeting note and convert one note item into a task.
- Capture focused screenshots of the meeting setup, active conversation, flow editor, and saved summary.
- Inspect dev logs after the meeting workflow and confirm no renderer, preload, IPC, or runtime errors occurred.

## Continuation

After this task passes validation, continue with `15_agent_pack_manifest_and_install.md`. Meeting outputs, agent profiles, and reusable meeting flow templates should be packageable in future Agent Packs.

## Completion Notes

Completed on the current implementation branch.

- Added Meeting Room navigation to the Human Console.
- Added meeting creation with title, goal, moderator, participants, conversation mode, and editable flow rules.
- Added participant persistence through meeting IPC and repository APIs.
- Added reusable conversation workflow types and a main-process workflow evaluator for developer -> reviewer -> developer loops.
- Added Meeting Orchestrator service for creating meetings, persisting flow rules, routing messages with source/target/parent/rule metadata, saving moderator summaries, and writing audit events.
- Added Meeting Room UI for manager broadcast/addressed messages, simulated review loops, saved summaries, and conversion of meeting outputs into Task Board items.
- Added workflow tests independent from React UI.

Human app acceptance evidence:

- Meeting room screenshot: `out/task14-accept-meeting-room.png`
- Verified a live Electron workflow with two visible participants, manager broadcast, agent-to-agent routed messages, review feedback routed back to developer, acceptance stop, saved summary, and conversion to task.
- Verified message metadata displays source agent, target agent, parent/routing context where available, and triggering flow rule.
