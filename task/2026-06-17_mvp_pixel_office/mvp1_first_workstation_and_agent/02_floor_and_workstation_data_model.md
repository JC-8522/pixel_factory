# Task 1.2: Floor And Workstation Data Model

## Goal

Introduce workstation-first office data.

## Files Likely Involved

- `src/shared/types/records.ts`
- `src/main/db/schema.ts`
- `src/main/db/migrations/*`
- `src/main/db/repositories/*`
- `src/shared/ipc/*`

## Implementation

- add `FloorRecord`,
- add `WorkstationRecord`,
- support one default floor,
- define occupancy through `assigned_agent_id`,
- keep existing agent coordinates only as temporary compatibility fields.

## Deliverable

Workstation and floor become real persisted entities.

## Acceptance

- Workstations can be stored without creating an agent.
- A workstation belongs to a floor.
- A workstation can be empty or assigned.

## Validation

1. Create a workstation record through the app flow or repository path.
2. Restart the app.
3. Confirm the workstation still exists and remains tied to the default floor.
