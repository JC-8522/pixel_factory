# Task 1.8: Desk Label And First-Pass Polish

## Goal

Make the workstation readable at a glance.

## Files Likely Involved

- `src/renderer/office/workstationSprites.ts`
- `src/renderer/office/agentSprites.ts`
- `src/renderer/styles/app.css`

## Implementation

- render a short label plaque above the desk,
- support short text like `QA`, `DEV`, or workstation name,
- tune highlight, spacing, and readability for the first playable flow.

## UI Assets Used

- `workstation_label_plaque`
- `workstation_hover_overlay`
- `workstation_selected_overlay`
- `workstation_status_badge_green`
- `workstation_status_badge_blue`
- `workstation_status_badge_red`

## Frontend Usage

- FE uses `workstation_label_plaque` as a reusable frame and injects text from workstation name or agent display label.
- FE keeps label rendering separate from desk art so text can change without replacing the plaque image.
- FE tunes overlay and badge placement so the desk remains readable at a glance:
  - hover overlay should not cover the label text
  - selected overlay should stay visible behind the desk edges
  - status badges should sit near the monitor area or upper corner of the desk composition

## Deliverable

The first occupied desk feels close to the target reference direction.

## MVP 1 Delivery Rule

This task improves readability and finish.

MVP 1 is not done until the polished desk appears inside the full playable loop in `09_mvp1_acceptance.md` and remains readable while selected, chatted with, and reset back to empty state.

## Acceptance

- Label text is readable.
- Desk, label, and worker feel visually connected.
- The office remains clean and uncluttered with one desk.

## Validation

1. Create a workstation and agent.
2. Confirm a readable desk label is shown.
3. Confirm the desk composition still looks balanced at normal app size.
