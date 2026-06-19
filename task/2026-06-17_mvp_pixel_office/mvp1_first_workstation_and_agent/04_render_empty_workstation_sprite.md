# Task 1.4: Render Empty Workstation Sprite

## Goal

Make workstations visible as real desks rather than invisible data slots.

## Files Likely Involved

- `src/renderer/office/workstationSprites.ts`
- `src/renderer/office/officeScene.ts`
- `src/renderer/office/officeLayout.ts`

## Implementation

- create a pixel desk sprite,
- include chair, monitor, and label plaque,
- support `empty`, `hovered`, and `selected` states.

## UI Assets Used

- `workstation_empty_base`
- `workstation_empty_shadow`
- `workstation_hover_overlay`
- `workstation_selected_overlay`
- `workstation_label_plaque`

## Frontend Usage

- FE renders `workstation_empty_base` and `workstation_empty_shadow` for each unoccupied workstation.
- On hover, FE adds `workstation_hover_overlay` on top of the desk instead of replacing the base art.
- On selection, FE swaps hover treatment for `workstation_selected_overlay`.
- FE renders `workstation_label_plaque` as a separate layer so text such as `Empty` or a short workstation name remains dynamic.

## Deliverable

One empty workstation can be rendered clearly in the office.

## MVP 1 Delivery Rule

This task proves the desk can render.

MVP 1 is not done until the same workstation can be created through UI, selected, converted into an occupied desk, and remain readable in the end-to-end flow in `09_mvp1_acceptance.md`.

## Acceptance

- The user can visually identify an empty desk.
- The selected workstation is clearly highlighted.
- The desk label area is reserved and readable.

## Validation

1. Render a workstation without an assigned agent.
2. Hover or select it.
3. Confirm visual state changes are clear.
