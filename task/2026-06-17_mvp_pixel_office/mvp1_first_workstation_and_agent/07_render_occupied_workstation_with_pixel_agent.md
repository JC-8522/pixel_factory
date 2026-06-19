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

## UI Assets Used

- `workstation_occupied_base`
- `workstation_label_plaque`
- `agent_pixel_idle`
- `agent_pixel_working`
- `agent_pixel_thinking`
- `agent_pixel_blocked`
- `workstation_status_badge_green`
- `workstation_status_badge_blue`
- `workstation_status_badge_red`

## Frontend Usage

- FE switches workstation render state from `workstation_empty` to `workstation_occupied` once `assignedAgentId` exists.
- FE renders the occupied desk base first, then the agent sprite, then the label plaque, then the status badge.
- Agent status decides which sprite and badge pair to use:
  - `agent_idle` -> `agent_pixel_idle`
  - `agent_working` -> `agent_pixel_working` plus green badge
  - `agent_thinking` -> `agent_pixel_thinking` plus blue badge
  - `agent_blocked` -> `agent_pixel_blocked` plus red badge
- FE should treat the agent and occupied workstation as one composition unit instead of separately draggable objects.

## Deliverable

The desk and worker render as one coherent unit.

## MVP 1 Delivery Rule

This task proves the occupied workstation composition.

MVP 1 is not done until that composition is reached through the real create-workstation plus create-agent flow and stays correct during chat, delete, cleanup, and restart in `09_mvp1_acceptance.md`.

## Acceptance

- The agent no longer appears as a free-floating office object.
- The worker reads clearly as occupying the selected desk.
- Reload keeps the same workstation-agent pairing.

## Validation

1. Create an agent on a workstation.
2. Confirm worker sprite appears attached to the desk.
3. Restart the app and confirm the same occupied desk renders correctly.
