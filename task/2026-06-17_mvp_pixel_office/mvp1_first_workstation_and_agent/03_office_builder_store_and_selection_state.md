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

## Acceptance

- Selecting a workstation updates store state.
- Toggling build mode updates store state.
- The UI can distinguish between no selection, empty workstation selection, and occupied workstation selection.

## Validation

1. Enter build mode.
2. Select a workstation slot or workstation.
3. Confirm selection-driven UI reacts consistently.
