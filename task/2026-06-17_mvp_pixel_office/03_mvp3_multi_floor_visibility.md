# MVP 3: Multi-Floor Visibility

## Goal

Grow the office from a single-floor space into a multi-floor management view without losing clarity or the Stardew-inspired game feeling.

## User Outcome

The user can create more than one floor, switch focus between floors, and choose which floors are visible in the office UI.

## Scope

- create multiple floors,
- floor selector UI,
- visible-floor control,
- per-floor workstation grouping,
- persisted floor visibility state.

## Breakdown Tasks

### Task 1: Add Floor Records And Floor CRUD

Files likely involved:

- `src/shared/types/records.ts`
- database schema and repositories
- IPC contracts
- office store

Implementation:

- persist floor entities,
- allow floor creation with default name and order,
- maintain deterministic floor ordering.

Expected output:

- the app can own more than one floor as data.

### Task 2: Add Floor Selector UI

Files likely involved:

- `src/renderer/App.tsx`
- floor control component files
- `src/renderer/styles/app.css`

Implementation:

- add a top-level floor selector,
- make active floor obvious,
- show occupancy summary for each floor.

Expected output:

- user can navigate between floors naturally.

### Task 3: Add Visible Floors Control

Files likely involved:

- office builder store
- floor selector UI
- `src/renderer/office/officeScene.ts`

Implementation:

- allow selecting which floors should be rendered,
- support one-floor focus mode first,
- optionally support multi-floor visible mode in a stacked or paged layout.

Expected output:

- visible floors are user-controlled, not implicit.

### Task 4: Render Multi-Floor Office Predictably

Files likely involved:

- `src/renderer/office/officeScene.ts`
- new `src/renderer/office/floorScene.ts`
- `src/renderer/office/officeLayout.ts`

Implementation:

- keep each floor visually distinct,
- avoid overlapping floors in a confusing way,
- preserve workstation readability in all supported floor views.

Expected output:

- floor rendering scales beyond one room.

### Task 5: Persist Floor Visibility And Selection

Files likely involved:

- floor repository
- office builder store
- hydration flows

Implementation:

- remember selected floor,
- remember visible floors,
- restore office state after app restart.

Expected output:

- the office opens in the same floor context the user left.

## Acceptance Criteria

### Functional Acceptance

- The user can create multiple floors.
- The user can switch active floor.
- The user can control which floors are visible.
- Workstations remain correctly grouped under their floors.

### UI Acceptance

- The current floor is obvious.
- Floor switching is fast and understandable.
- The UI still feels like one coherent office world rather than separate admin pages.

### Persistence Acceptance

- Floor list, selected floor, and visibility settings survive restart.

## Validation Steps

1. Create at least 3 floors.
2. Add workstations to more than one floor.
3. Switch active floor and confirm the visible office changes correctly.
4. Change visible floor settings and confirm the rendered scene updates predictably.
5. Restart the app and confirm floor setup is restored.

## Done Definition

MVP 3 is done when the office supports multi-floor growth without confusing the user and without breaking the workstation-first mental model.
