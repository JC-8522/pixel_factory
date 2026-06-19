# MVP 1 Acceptance

## Scope

This file is the single delivery gate for the whole MVP 1 loop.

This acceptance no longer evaluates only one slice such as `Task 1.1`.

It evaluates whether the full workstation-first product flow works end to end:

1. open the office,
2. render a believable empty office,
3. create the first workstation,
4. select that empty workstation,
5. create an agent from that workstation,
6. render the occupied desk clearly,
7. open chat and complete a short conversation,
8. delete the agent cleanly,
9. keep the office usable after cleanup and restart.

## Functional Acceptance

- The app can start with an office that has no workstations.
- The empty office CTA uses workstation-first language.
- The user can create the first workstation successfully.
- The user can select an empty workstation successfully.
- The user can create one agent from the selected workstation successfully.
- The selected workstation becomes occupied automatically after creation.
- The user can delete one agent successfully and the workstation returns to an empty state.
- The user can create multiple workstation-bound agents successfully.
- The user can delete multiple workstation-bound agents successfully.
- The user can complete a conversation with at least four total messages for one agent without UI failure.
- The user can complete conversations with at least four total messages per agent for multiple agents independently without UI failure.

## UI Acceptance

- The office looks like a cozy pixel room instead of a debugging canvas.
- The empty office shows a wall area, floor area, and static decor baseline.
- The empty office CTA reads `Build First Workstation` or equivalent.
- The first workstation appears as a real desk with a readable plaque area.
- Hovered and selected workstation states are visually distinct.
- The occupied office shows readable desk labels, visible seated agents, and selectable occupied desks.

## Asset Integration Acceptance

- Floor assets are rendered as layered scene art instead of a flat color fill.
- Empty workstation state uses desk base plus label plaque.
- Hover and selected workstation states use overlays rather than duplicated desk screenshots.
- Occupied workstation state uses occupied desk base plus agent sprite plus status badge.
- Create-agent flow uses modal frame and pixel button assets.
- Chat and detail surfaces remain visually consistent with the pixel office UI.

## Data Acceptance

- Floors and workstations are real persisted entities.
- The first workstation persists after restart.
- Agent creation is structurally tied to a workstation.
- Occupancy is represented by workstation assignment rather than loose visual position alone.
- Agent delete behavior removes the created agent records cleanly and releases the workstation back to empty state.
- Multi-agent conversations remain separated by agent.

## End-To-End Validation

1. Launch the app and confirm the office opens without visible in-app errors.
2. Confirm the empty office is visually complete and the CTA uses workstation-first copy.
3. Click `Build First Workstation`.
4. Create the first workstation and confirm a real empty desk appears immediately.
5. Hover and select that workstation and confirm the state change is visually clear.
6. Open the create-agent flow from the selected workstation.
7. Create one agent and confirm the desk becomes occupied by that worker without UI errors.
8. Confirm the occupied workstation shows desk base, agent sprite, readable label, and status badge.
9. Open the created agent detail or chat surface from the occupied desk.
10. Send at least four total messages in that conversation and confirm agent replies render.
11. Delete that agent and confirm the workstation returns to an empty desk state instead of disappearing.
12. Restart the app and confirm the office restores the expected workstation state.
13. Create at least two workstation-bound agents.
14. Confirm both occupied desks render clearly and can each be selected independently.
15. Send at least four total messages for each agent and confirm the transcripts stay independent.
16. Delete both agents and confirm the office remains visually complete, usable, and free of in-app error state.

## Automation Evidence

Expected evidence artifacts:

- `verification/current-app-initial.png`
- `verification/current-app-empty-office.png`
- `verification/current-app-first-workstation-created.png`
- `verification/current-app-workstation-selected.png`
- `verification/current-app-create-agent-confirm.png`
- `verification/current-app-create-agent-form.png`
- `verification/current-app-agent-created.png`
- `verification/current-app-occupied-workstation.png`
- `verification/current-app-chat-complete.png`
- `verification/current-app-agent-deleted.png`
- `verification/current-app-restart-state.png`
- `verification/current-app-verification.json`
- `verification/dual-workstations-created.png`
- `verification/dual-agents-created.png`
- `verification/dual-agent-a-chat.png`
- `verification/dual-agent-b-chat.png`
- `verification/dual-agents-deleted.png`
- `verification/dual-agents-verification.json`

The JSON reports should prove:

- local Codex readiness was `ready`
- no captured UI errors were present
- single-workstation flow completed create workstation, create agent, chat, and delete
- dual-workstation flow completed create agents, chat, and delete
- deleting an agent released the workstation back to empty state
- restart preserved the expected workstation state
- each verified conversation reached at least four total messages

## Done Definition

MVP 1 is done when a new user can understand and complete the full product loop in under 10 seconds of orientation:

- this is an office,
- this is where I build the first workstation,
- this is how I create an agent from that workstation,
- this is where pixel workers appear and can be managed today.
