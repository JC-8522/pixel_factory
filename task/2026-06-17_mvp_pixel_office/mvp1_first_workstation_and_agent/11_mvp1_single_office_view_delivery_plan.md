# MVP1 Single Office View Delivery Plan

## Purpose

This document replans the current MVP1 delivery around the new single-office-view interaction model shown in `UI_06_18.png`.

Latest follow-up specs dated `2026-06-19`:

- `12_2026-06-19_ai_employee_product_doc.md`
- `13_2026-06-19_ai_employee_ui_design_doc.md`
- `14_2026-06-19_ai_employee_architecture_doc.md`

It is based on:

- current code on `master`
- the current MVP1 task docs
- the current in-repo asset pack under `assets/pixel_office/mvp1`

## Current Baseline On `master`

Current `master` already has:

- persisted floor and workstation entities
- workstation-to-agent assignment in backend
- pixel office floor art, workstation art, agent art, modal art, and chat art
- office canvas rendering for empty and occupied desks
- create-agent form dialog
- agent chat component

Current `master` UI is still structured as:

- left sidebar with `Office` and `Permissions`
- center office view
- right detail panel for workstation or agent
- top toolbar with `Human manager workspace` and `Pixel Office`
- explicit CTA buttons outside the office canvas

This does not match the new target UI.

## Product Change Summary

The new target is not a three-panel management app.

The new target is a single office scene where almost all interactions happen inside the office view:

- app opens directly into one office scene
- no left navigation sidebar
- no right workstation or agent drawer by default
- no top title block with `Human manager workspace` or `Pixel Office`
- workstation interactions happen by clicking desks in the office
- agent chat happens by clicking seated agents in the office
- secondary controls are collected into a small top-left office button

## Main Gaps To Fix

### 1. Layout model is wrong

Current file:

- `src/renderer/App.tsx`
- `src/renderer/styles/app.css`

Current issue:

- app is built around sidebar + toolbar + detail-panel composition

Target:

- app shell should render a single office view as the default and primary experience

### 2. The current task flow is panel-driven, not scene-driven

Current files:

- `src/renderer/App.tsx`
- `src/renderer/components/WorkstationDetailPanel.tsx`
- `src/renderer/components/AgentDetailDrawer.tsx`
- `src/renderer/office/OfficeCanvas.tsx`

Current issue:

- user clicks a slot, then completes the action in a separate right panel
- agent selection depends partly on the roster and drawer flow

Target:

- empty slot click opens create flow in-place
- occupied slot or seated agent click opens chat panel in-place

### 3. Current MVP1 acceptance language no longer matches target UI

Current files:

- `task/2026-06-17_mvp_pixel_office/mvp1_first_workstation_and_agent/00_index.md`
- `task/2026-06-17_mvp_pixel_office/mvp1_first_workstation_and_agent/09_mvp1_acceptance.md`

Current issue:

- acceptance still describes `Build First Workstation` as a visible user step
- latest target visual starts from an office that already visually contains all desk positions

Target:

- acceptance should describe a single office scene with clickable workstation positions
- workstation persistence can stay in backend, but workstation creation should become implicit inside the desk-click flow

### 4. Automation is still tied to old selectors and old copy

Current files:

- `scripts/verify-current-app-ui.mjs`
- `scripts/verify-two-agents-ui.mjs`

Current issue:

- scripts rely on `Build First Workstation`
- scripts rely on `.office-roster`
- scripts rely on `.detail-panel`

Target:

- scripts should verify slot-click, create-agent modal, occupied seat, and chat overlay inside the office scene

## Recommended Implementation Strategy

## FE: keep backend model, move the interaction layer

Recommended minimum-change approach:

1. Keep the existing backend floor/workstation persistence model.
2. Keep `officeSlots` as the visual source of all 12 seat positions.
3. Treat an unbuilt slot as a visible empty desk in the UI.
4. When the user clicks an unbuilt or empty slot:
   - show a small confirm modal
   - if the slot has no workstation record yet, create the workstation in the background
   - then open the create-agent form
5. When the user clicks an occupied slot:
   - resolve the assigned agent
   - open an in-office chat panel instead of the right drawer

Why this is the best first pass:

- no migration is needed to pre-seed 12 workstation rows
- existing backend workstation APIs remain reusable
- current asset pack already matches empty desk, occupied desk, modal, and chat states
- we can remove most of the current UI chrome without rewriting the data model

## BE: minimal required backend support

Backend is already close to the target.

Existing backend support already covers:

- `office.getSnapshot()`
- `office.createWorkstation()`
- `agents.create(workstationId)`
- workstation assignment persistence
- agent delete releasing `assigned_agent_id`

Required backend work only if needed after FE integration:

- confirm that deleting an agent leaves the workstation row in place and returns the seat to empty
- confirm workstation state survives restart
- optionally add one composite IPC later if FE wants one atomic action such as `createAgentAtSlot`

Recommended BE goal:

- do not refactor the persistence model
- preserve `slot -> workstation -> agent` relationships
- support the new scene-driven flow with minimal API change

## UI design: target interaction model

The target office should behave like this:

1. App opens to one office room.
2. Top-left contains one compact office button.
3. Hovering an empty desk shows highlight and helper text.
4. Clicking an empty desk shows `Create New Agent?`
5. Confirming opens the create-agent form modal.
6. Creating an agent makes the seated worker appear on that desk.
7. Clicking that agent opens a chat/info panel anchored inside the office view.

The top-left office button should absorb the removed left-sidebar functions:

- office-level actions
- permissions entry point
- future global controls

The right-side panel should not be the default home for actions anymore.

## Files Most Likely To Change

### Frontend core

- `src/renderer/App.tsx`
- `src/renderer/styles/app.css`
- `src/renderer/office/OfficeCanvas.tsx`
- `src/renderer/office/officeLayout.ts`

### Frontend UI components

- `src/renderer/components/CreateAgentDialog.tsx`
- `src/renderer/components/AgentDetailDrawer.tsx`
- `src/renderer/components/WorkstationDetailPanel.tsx`
- `src/renderer/components/PermissionSettings.tsx`

### Optional backend and IPC changes

- `src/shared/ipc.ts`
- `src/preload/index.ts`
- `src/main/ipc/createIpcHandlers.ts`
- `src/main/office/officeService.ts`

### QA automation updates

- `scripts/verify-current-app-ui.mjs`
- `scripts/verify-two-agents-ui.mjs`

### Task and acceptance docs to align after implementation

- `task/2026-06-17_mvp_pixel_office/mvp1_first_workstation_and_agent/00_index.md`
- `task/2026-06-17_mvp_pixel_office/mvp1_first_workstation_and_agent/09_mvp1_acceptance.md`

## Role Deliverables And Goals

### FE Agent

To do:

- remove sidebar navigation from the initial app shell
- remove right detail panel as the primary workflow surface
- remove `Human manager workspace` and `Pixel Office` title block
- move create-agent flow to desk click
- move agent chat flow to occupied-desk or agent click
- keep all main controls visually inside the office view
- preserve current persistence and runtime wiring

Goal:

- user can complete create-agent and chat flows without leaving the office scene

### BE Agent

To do:

- verify the current workstation and agent persistence supports implicit workstation creation
- confirm agent delete returns the seat to empty without deleting the workstation
- confirm restart restores the office state correctly
- only add new IPC if FE proves a composite action is required

Goal:

- FE can treat the office scene as the only interaction surface without backend inconsistency

### UI Agent

To do:

- use `UI_06_18.png` as the primary target interaction storyboard
- use `assets/pixel_office/mvp1/preview/mvp1_concept_board.png` as style reference
- keep modal and chat visuals consistent with existing asset pack
- define the top-left office button behavior and placement
- define hover, selected, occupied, and chat-open visual states clearly

Goal:

- FE has one unambiguous single-office-view target instead of mixing old panel UI and new scene UI

### QA Agent

To do:

- rewrite acceptance around the new single-office-view flow
- update automation selectors away from `.office-roster` and `.detail-panel`
- verify empty desk click, confirm modal, create form, occupied desk, chat overlay, delete, and restart
- capture screenshots and JSON evidence for the new flow

Goal:

- the new UI can be proven end to end with evidence that matches the actual target interaction model

## Concrete Validation Goals

The new delivery should be accepted only if all of the checks below pass.

### A. App shell and visual structure

1. Launch the app.
2. Confirm there is only one office view on screen.
3. Confirm the left `Office / Permissions` sidebar is gone.
4. Confirm the right workstation or agent detail panel is not permanently visible.
5. Confirm `Human manager workspace` and `Pixel Office` text are gone from the default UI.
6. Confirm a top-left office button exists inside the office view.

### B. Empty office interaction

1. Confirm the office opens with the full room art and visible workstation positions.
2. Hover one empty workstation.
3. Confirm hover highlight is visible.
4. Confirm helper copy indicates the desk can create an agent.
5. Click the empty workstation.
6. Confirm the create-agent confirmation modal appears.

### C. Create-agent flow

1. In the confirmation modal, choose `Create Agent`.
2. Confirm the full create-agent form opens.
3. Fill name, role, working directory, permission mode, and initial task.
4. Submit successfully.
5. Confirm the agent appears seated on the selected desk.
6. Confirm the desk now reads as occupied.

### D. Agent chat flow

1. Click the seated agent.
2. Confirm a chat/info panel opens inside the office view.
3. Send at least four total messages in the conversation.
4. Confirm replies render without UI failure.
5. Confirm chat belongs to the clicked agent and does not leak into other agents.

### E. Delete and recovery flow

1. Delete the created agent.
2. Confirm the desk returns to empty state.
3. Restart the app.
4. Confirm the office still opens as a single office view.
5. Confirm workstation occupancy state is restored correctly.

### F. Multi-agent flow

1. Create two agents on two different desks.
2. Confirm both occupied desks render correctly.
3. Click each agent separately and confirm each chat panel loads the correct conversation.
4. Delete both agents and confirm both desks return to empty state.

## Required Evidence

Expected verification artifacts should be updated to match the new flow:

- `verification/current-app-single-office-view.png`
- `verification/current-app-empty-workstation-hover.png`
- `verification/current-app-create-agent-confirm.png`
- `verification/current-app-create-agent-form.png`
- `verification/current-app-agent-seated.png`
- `verification/current-app-chat-open.png`
- `verification/current-app-agent-deleted.png`
- `verification/current-app-restart-state.png`
- `verification/current-app-verification.json`
- `verification/dual-agents-single-office-view.png`
- `verification/dual-agents-chat-a.png`
- `verification/dual-agents-chat-b.png`
- `verification/dual-agents-deleted.png`
- `verification/dual-agents-verification.json`

## Art Assets And Locations

Canonical asset root:

- `assets/pixel_office/mvp1`

Required current files:

- `assets/pixel_office/mvp1/floor/floor_room_shell_day.png`
- `assets/pixel_office/mvp1/workstation/workstation_state_sheet.png`
- `assets/pixel_office/mvp1/agent/agent_state_sheet.png`
- `assets/pixel_office/mvp1/ui/modal/create_agent_modal_sheet.png`
- `assets/pixel_office/mvp1/ui/chat/chat_panel_frame.png`
- `assets/pixel_office/mvp1/preview/mvp1_concept_board.png`
- `assets/pixel_office/mvp1/manifest/assets_manifest.json`

Supporting mapping docs:

- `docs/pixel_office_art_assets/mappings/asset_state_mapping.md`
- `docs/pixel_office_art_assets/mappings/asset_state_mapping.json`

Primary task visual target:

- `task/2026-06-17_mvp_pixel_office/mvp1_first_workstation_and_agent/UI_06_18.png`

## FE / BE / UI / QA Interaction Model

Recommended handoff order:

1. UI locks the target interaction states and top-left button behavior.
2. FE removes old shell chrome and implements the in-office state machine.
3. BE validates that workstation persistence and delete semantics still support the new FE flow.
4. QA updates automation and acceptance to the new scene-driven selectors and screenshots.

Shared contract:

- UI defines visual states by seat state and overlay state
- FE maps those states to components and assets
- BE exposes only semantic office and agent state, not art decisions
- QA validates the user journey from visible office state, not from internal implementation assumptions

## Final Visual Target

Primary visual target:

- `task/2026-06-17_mvp_pixel_office/mvp1_first_workstation_and_agent/UI_06_18.png`

Supporting style board:

- `assets/pixel_office/mvp1/preview/mvp1_concept_board.png`

Interpretation rule:

- `UI_06_18.png` is the interaction storyboard
- `mvp1_concept_board.png` is the art and mood reference
- the shipped UI should follow the storyboard first and the style board second
