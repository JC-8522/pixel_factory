# Task 1.3: Office Builder Store And Selection State

## Goal

Add the UI state needed for build mode and workstation selection.

## Files Likely Involved

- `src/renderer/stores/officeBuilderStore.ts`
- `src/renderer/App.tsx`
- office scene files

## Implementation

- track active floor,
- track selected workstation,
- track whether build mode is active,
- prepare UI state for future multi-floor support.

## Deliverable

Stable UI state model for workstation-first interactions.

## MVP 1 Delivery Rule

This task prepares UI state for the full loop.

MVP 1 is not done until the same store state supports end-to-end workstation creation, workstation selection, workstation-bound agent creation, and occupied workstation detail access in `09_mvp1_acceptance.md`.

## Acceptance

- Selecting a workstation updates store state.
- Toggling build mode updates store state.
- The UI can distinguish between no selection, empty workstation selection, and occupied workstation selection.

## Validation

1. Enter build mode.
2. Select a workstation slot or workstation.
3. Confirm selection-driven UI reacts consistently.
