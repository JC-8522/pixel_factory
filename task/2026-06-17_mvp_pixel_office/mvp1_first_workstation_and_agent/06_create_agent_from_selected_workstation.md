# Task 1.6: Create Agent From Selected Workstation

## Goal

Make workstation selection the entry point to agent creation.

## Files Likely Involved

- `src/renderer/components/CreateAgentDialog.tsx`
- `src/renderer/App.tsx`
- agent store or IPC flow
- workstation repository or service layer

## Implementation

- open `Create Agent` from selected empty workstation,
- pass workstation context into creation flow,
- on success assign the created agent to the workstation.

## Deliverable

An empty desk can become an occupied desk by creating an agent from it.

## Acceptance

- The user cannot create the workstation-bound agent flow without selecting a workstation.
- Agent creation assigns the seat automatically.
- The workstation no longer appears empty after creation.

## Validation

1. Create one workstation.
2. Select that workstation.
3. Create an agent from it.
4. Confirm the workstation becomes occupied.
