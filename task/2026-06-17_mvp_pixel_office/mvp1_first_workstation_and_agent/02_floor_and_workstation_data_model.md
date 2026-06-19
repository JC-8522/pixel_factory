# Task 1.2: Floor And Workstation Data Model

## Goal

Introduce workstation-first office data.

In this MVP, a `workstation` means one concrete office desk spot from the design reference image.

Each visible desk position in the pixel office should be modeled as a real workstation entity.

The intended product order is:

1. create the workstation first
2. let the workstation exist while empty
3. create an agent on that existing workstation
4. mark the workstation as occupied by that agent

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
- make workstation the primary office entity, not agent free-positioning.
- allow a workstation to exist before any agent is assigned.
- treat agent creation as an action that starts from an existing workstation.
- model the current UI flow as `create workstation -> create agent on workstation`, not `create free-floating agent`.

## Domain Definition

### What A Workstation Is

A workstation is one concrete office work spot in the pixel office.

For the current design direction, each desk spot shown in the reference office layout should correspond to one workstation record.

It is not:

- just an `(x, y)` coordinate,
- just an agent visual position,
- just a temporary renderer slot.

It is:

- a persisted office entity,
- attached to a floor,
- either empty or occupied,
- the place where an agent works once assigned.

### Relationship To Agent

The workstation exists first.

The agent is the worker assigned to that workstation.

This means:

- a workstation can be created without creating an agent,
- an empty workstation is a valid state,
- an occupied workstation is a valid state,
- agent creation should happen from an existing workstation,
- occupancy should be represented by assignment, not by loose agent coordinates alone.

## Deliverable

Workstation and floor become real persisted entities.

## MVP 1 Delivery Rule

This task provides the durable model for the MVP.

MVP 1 is not done until this model is exercised by the full loop in `09_mvp1_acceptance.md`, including workstation creation, workstation-bound agent creation, and occupied workstation restore after restart.

## Acceptance

- Workstations can be stored without creating an agent.
- A workstation belongs to a floor.
- A workstation can be empty or assigned.
- The data model clearly supports `workstation first, agent second`.
- Creating an agent is conceptually and structurally tied to an existing workstation.

## Validation

1. Create a workstation record through the app flow or repository path.
2. Restart the app.
3. Confirm the workstation still exists and remains tied to the default floor.
4. Confirm the workstation can remain valid while no agent is assigned.
5. Confirm agent creation is defined as happening on an existing workstation, not as a free-floating office spawn.
