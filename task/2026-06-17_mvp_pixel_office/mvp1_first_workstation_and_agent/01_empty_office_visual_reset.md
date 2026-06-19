# Task 1.1: Empty Office Visual Reset

## Goal

Make the office feel like a Stardew-inspired pixel room before desks exist.

## Files Likely Involved

- `src/renderer/styles/app.css`
- `src/renderer/App.tsx`
- `src/renderer/office/officeScene.ts`
- `src/renderer/office/OfficeCanvas.tsx`

## Implementation

- replace the current debug-like office background,
- add room frame, wall area, floor tiles, and basic static decor,
- change empty state CTA to workstation-first copy,
- preserve existing app shell and right drawer behavior.

## UI Assets Used

- `floor_room_shell_day`
- `floor_wall_backdrop`
- `floor_tile_bluegray_a`
- `floor_tile_bluegray_b`
- `floor_prop_pantry_left`
- `floor_prop_door_top`
- `floor_prop_sofa_top`
- `floor_prop_bookshelf_top`
- `floor_prop_printer_right`
- `floor_prop_plant_strip_bottom`

## Frontend Usage

- FE renders these as the base office scene layers before any workstation exists.
- `officeScene.ts` should compose them in this order: room shell, wall, floor tiles, decorative props.
- When workstation count is `0`, FE uses the semantic state key `floor_empty`.
- The empty-state CTA sits on top of the scene as a UI overlay, not as a replacement for the room art.

## Deliverable

A visually complete empty office scene.

## MVP 1 Delivery Rule

This task only completes the empty-office slice.

MVP 1 is not done until this visual reset also works inside the full loop defined in `09_mvp1_acceptance.md`.

## Acceptance

- The office no longer looks like a dark debug canvas.
- The empty office looks intentional even with zero desks.
- The CTA language is about building a workstation, not directly creating an agent.

## Validation

1. Launch the app with no workstation data.
2. Confirm the office shows a room, floor, and decorative baseline.
3. Confirm the primary CTA says `Build First Workstation` or equivalent.
