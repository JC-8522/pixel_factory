# Task 1.5: Create First Workstation Flow

## Goal

Let the user place the first desk in the office.

## Files Likely Involved

- office builder store
- `src/renderer/App.tsx`
- `src/renderer/office/officeScene.ts`
- workstation creation IPC or service files

## Implementation

- add `Build First Workstation` action,
- allow one valid placement slot,
- create workstation record on confirm,
- render the new empty desk immediately.

## UI Assets Used

- `floor_room_shell_day`
- `workstation_empty_base`
- `workstation_empty_shadow`
- `workstation_label_plaque`
- `workstation_hover_overlay`
- `workstation_selected_overlay`

## Frontend Usage

- FE keeps the room in `floor_empty` state until the first workstation record exists.
- Once create succeeds, FE moves the room to `floor_active` and renders one `workstation_empty` stack in the chosen slot.
- Hovering the new desk uses `workstation_hover_overlay`.
- Clicking the desk uses `workstation_selected_overlay`.
- This task does not require agent assets yet; it only proves that workstation creation turns empty-room state into workstation-present state.

## Deliverable

User can create the first workstation from the empty office.

## MVP 1 Delivery Rule

This task proves the user can create the first desk.

MVP 1 is not done until that created desk also becomes the entry point for agent creation and later renders as an occupied workstation in `09_mvp1_acceptance.md`.

## Acceptance

- The user can create exactly one first workstation through UI.
- The desk appears immediately after creation.
- The workstation persists after restart.

## Validation

1. Launch the app in an empty office.
2. Click `Build First Workstation`.
3. Place the desk and confirm it renders.
4. Restart and confirm the desk remains.
