# Task 1.7: Render Occupied Workstation With Pixel Agent

## Goal

Visually bind the agent to the workstation.

## Files Likely Involved

- `src/renderer/office/agentSprites.ts`
- `src/renderer/office/workstationSprites.ts`
- `src/renderer/office/officeScene.ts`

## Implementation

- upgrade the placeholder agent shape into a clearer pixel worker,
- anchor the worker visually to the desk,
- support occupied workstation composition instead of loose draggable placement.

## Deliverable

The desk and worker render as one coherent unit.

## Acceptance

- The agent no longer appears as a free-floating office object.
- The worker reads clearly as occupying the selected desk.
- Reload keeps the same workstation-agent pairing.

## Validation

1. Create an agent on a workstation.
2. Confirm worker sprite appears attached to the desk.
3. Restart the app and confirm the same occupied desk renders correctly.
