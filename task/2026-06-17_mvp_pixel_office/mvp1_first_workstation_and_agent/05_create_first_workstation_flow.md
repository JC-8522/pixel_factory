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

## Deliverable

User can create the first workstation from the empty office.

## Acceptance

- The user can create exactly one first workstation through UI.
- The desk appears immediately after creation.
- The workstation persists after restart.

## Validation

1. Launch the app in an empty office.
2. Click `Build First Workstation`.
3. Place the desk and confirm it renders.
4. Restart and confirm the desk remains.
