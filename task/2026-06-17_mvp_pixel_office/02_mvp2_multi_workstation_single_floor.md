# MVP 2: Multi-Workstation Single Floor

## Goal

Expand the office from one workstation to a real first floor that supports multiple desks while staying visually clean and capacity-limited.

## User Outcome

The user can gradually fill one office floor with multiple workstations and understand at a glance which desks are empty, which are occupied, and how many seats remain.

## Scope

- multiple workstation creation on one floor,
- hard limit of 8 workstations per floor,
- consistent 2x4 or equivalent layout preset,
- occupancy count UI,
- empty vs occupied desk differentiation,
- removal or de-emphasis of free dragging for seat placement.

## Breakdown Tasks

### Task 1: Add Floor Layout Preset

Files likely involved:

- `src/renderer/office/officeLayout.ts`
- `src/renderer/office/officeScene.ts`

Implementation:

- define one floor layout with 8 workstation slots,
- make each slot deterministic and grid-aligned,
- keep spacing large enough for label readability and future sprite growth.

Expected output:

- one floor has a stable workstation map.

### Task 2: Support Multiple Workstation CRUD

Files likely involved:

- workstation repository and IPC files
- office builder store
- relevant React controls

Implementation:

- create more than one workstation on the same floor,
- maintain per-slot occupancy state,
- support selecting any workstation for edit or agent assignment.

Expected output:

- multiple desks are manageable in one office view.

### Task 3: Enforce 8-Seat Capacity

Files likely involved:

- build mode logic
- workstation creation service
- renderer UI feedback

Implementation:

- block creation when 8 workstations already exist on the floor,
- show clear feedback such as `Floor full: 8/8 workstations placed`.

Expected output:

- the floor never exceeds designed capacity.

### Task 4: Improve Readability For Many Desks

Files likely involved:

- `src/renderer/office/workstationSprites.ts`
- `src/renderer/office/agentSprites.ts`
- `src/renderer/styles/app.css`

Implementation:

- make empty desks visually quieter than occupied desks,
- add slight desk prop variation,
- preserve clear labels and selection highlight.

Expected output:

- 6 to 8 desks still feel organized, not cluttered.

### Task 5: Add Floor Summary UI

Files likely involved:

- `src/renderer/App.tsx`
- office-related components or toolbar controls

Implementation:

- show summary like `Floor 1: 5/8 occupied`,
- surface remaining capacity,
- keep controls compact and game-like.

Expected output:

- the user always knows current capacity status.

## Acceptance Criteria

### Functional Acceptance

- The user can create multiple workstations on one floor.
- The user cannot exceed 8 workstations on that floor.
- Occupied and empty workstation state persists after reload.
- Agent assignment works correctly across multiple desks.

### UI Acceptance

- The floor remains readable with up to 8 desks.
- The user can visually scan which desks are free and which are taken.
- Labels remain readable at full floor capacity.

### Rule Acceptance

- One floor has at most 8 workstations.
- One workstation has at most one assigned agent.
- One agent appears on at most one workstation.

## Validation Steps

1. Create 8 workstations on one floor.
2. Confirm each workstation occupies a valid predefined slot.
3. Attempt to create a 9th workstation and confirm the UI blocks it.
4. Assign agents to several desks and confirm mixed empty/occupied states render correctly.
5. Restart the app and confirm layout and occupancy persist.

## Done Definition

MVP 2 is done when one floor behaves like a small playable office board with clear capacity, stable structure, and readable occupancy.
