# MVP 1 Acceptance

## Functional Acceptance

- The app can start with an office that has no workstations.
- The user can create exactly one workstation in the empty office.
- The user can create an agent from that workstation.
- The workstation becomes occupied after agent creation.
- The agent remains visually attached to the workstation after reload.

## UI Acceptance

- The office looks like a cozy pixel room instead of a debugging canvas.
- The desk is clearly visible even when empty.
- The occupied workstation clearly shows both desk and worker.
- The label above the desk is readable and visually matches the pixel style.

## Data Acceptance

- Workstation occupancy is stored explicitly.
- Agent placement is derived from workstation assignment, not only free coordinates.

## End-To-End Validation

1. Launch the app with no workstations and confirm the empty office is visually complete.
2. Create the first workstation and confirm it appears in a valid slot.
3. Select the workstation and create an agent from it.
4. Confirm the pixel worker appears on the desk with a readable label.
5. Restart the app and confirm the workstation and occupant persist.

## Done Definition

MVP 1 is done when a new user can understand the product loop in under 10 seconds:

- this is an office,
- this is a workstation,
- this is the pixel worker assigned to that workstation.
