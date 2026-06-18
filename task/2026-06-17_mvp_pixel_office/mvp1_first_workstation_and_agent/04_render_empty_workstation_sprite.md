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

## Deliverable

One empty workstation can be rendered clearly in the office.

## Acceptance

- The user can visually identify an empty desk.
- The selected workstation is clearly highlighted.
- The desk label area is reserved and readable.

## Validation

1. Render a workstation without an assigned agent.
2. Hover or select it.
3. Confirm visual state changes are clear.
